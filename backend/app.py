# backend/app.py
import json
import logging
import math
import os
import uuid
from datetime import datetime
from io import BytesIO
from pathlib import Path

from flask import Flask, request, jsonify, send_from_directory
from PIL import Image

from decision_tree import classify_label, build_risk_profile
from gemini_client import send_to_gemini


logging.basicConfig(level=os.getenv("LOG_LEVEL", "INFO"))
LOGGER = logging.getLogger(__name__)
ALLOWED_CONTENT_TYPES = {"image/jpeg", "image/png", "image/webp"}

BASE_DIR = Path(__file__).resolve().parent
STORAGE_ROOT = Path(os.getenv("STORAGE_DIR", BASE_DIR / "storage"))
IMAGE_DIR = STORAGE_ROOT / "images"
HISTORY_FILE = STORAGE_ROOT / "history.json"

IMAGE_DIR.mkdir(parents=True, exist_ok=True)
STORAGE_ROOT.mkdir(parents=True, exist_ok=True)


def _load_history():
    if HISTORY_FILE.exists():
        try:
            with HISTORY_FILE.open("r", encoding="utf-8") as fh:
                return json.load(fh)
        except json.JSONDecodeError:
            LOGGER.warning("History file corrupt, resetting.")
    return []


def _write_history(entries):
    with HISTORY_FILE.open("w", encoding="utf-8") as fh:
        json.dump(entries, fh, indent=2)


def _append_history(entry):
    history = _load_history()
    history.insert(0, entry)
    # keep latest 100 entries
    _write_history(history[:100])


def _safe_float(value, default=0.0):
    try:
        if value is None:
            return default
        return float(value)
    except (TypeError, ValueError):
        return default


def _safe_int(value, default=0):
    try:
        if value is None:
            return default
        return int(value)
    except (TypeError, ValueError):
        return default


def _parse_context(flask_request):
    raw_context = flask_request.form.get("context")
    payload = {}
    if raw_context:
        try:
            payload = json.loads(raw_context)
        except json.JSONDecodeError:
            LOGGER.warning("Invalid context payload; ignoring.")

    dwell_hours = _safe_float(payload.get("dwell_time_hours"), 0.0)
    dwell_days = payload.get("dwell_time_days")
    if not isinstance(dwell_days, (int, float)):
        dwell_days = dwell_hours / 24.0 if dwell_hours else 0.0

    patient_factors = payload.get("patient_factors")
    if not isinstance(patient_factors, dict):
        patient_factors = {}

    line_day_index = payload.get("line_day_index")
    if not isinstance(line_day_index, int):
        line_day_index = math.ceil(dwell_hours / 24.0) if dwell_hours else None

    context = {
        "capture_type": str(payload.get("capture_type") or "catheter_site"),
        "capture_slot_label": str(payload.get("capture_slot_label") or ""),
        "event_marker": payload.get("event_marker"),
        "dwell_time_hours": dwell_hours,
        "dwell_time_days": dwell_days,
        "line_day_index": line_day_index,
        "traction_alerts": _safe_int(payload.get("traction_alerts"), 0),
        "traction_yellow_events": _safe_int(payload.get("traction_yellow_events"), 0),
        "traction_status": str(payload.get("traction_status") or "").lower(),
        "patient_factors": patient_factors,
        "night_mode": bool(payload.get("night_mode")),
        "picture_failed": bool(payload.get("picture_failed")),
    }
    return context


def _calculate_analytics(entries):
    if not entries:
        return {
            "clabsi_rate": 0.0,
            "line_days": 0,
            "clabsi_cases": 0,
            "dressing_events": 0,
            "catheter_events": 0,
            "traction_alerts_total": 0,
        }

    unique_days = set()
    clabsi_cases = 0
    dressing_events = 0
    catheter_events = 0
    traction_alerts_total = 0

    for entry in entries:
        context = entry.get("context") or {}
        risk_profile = entry.get("risk_profile") or {}

        day_index = context.get("line_day_index")
        if isinstance(day_index, int) and day_index > 0:
            unique_days.add(day_index)

        if (entry.get("event_marker") or context.get("event_marker")) == "dressing_change":
            dressing_events += 1
        if (entry.get("event_marker") or context.get("event_marker")) == "catheter_change":
            catheter_events += 1

        traction_alerts_total += _safe_int(risk_profile.get("traction_alerts"), 0)

        if (risk_profile.get("risk_tier") or "").lower() == "high":
            clabsi_cases += 1

    # Fallback to number of entries if day tracking missing
    line_days = len(unique_days) or len(entries)
    clabsi_rate = clabsi_cases / line_days if line_days else 0.0

    return {
        "clabsi_rate": round(clabsi_rate, 3),
        "line_days": line_days,
        "clabsi_cases": clabsi_cases,
        "dressing_events": dressing_events,
        "catheter_events": catheter_events,
        "traction_alerts_total": traction_alerts_total,
    }

app = Flask(__name__, static_folder="../frontend", static_url_path="/")

@app.route("/")
def index():
    return send_from_directory(app.static_folder, "index.html")

@app.route("/analyze", methods=["POST"])
def analyze():
    request_id = str(uuid.uuid4())
    LOGGER.info("[%s] Analyze request received", request_id)
    history_snapshot = _load_history()
    previous_entry = history_snapshot[0] if history_snapshot else None

    if 'image' not in request.files:
        LOGGER.warning("[%s] No image in request", request_id)
        return jsonify({"error": "No image uploaded"}), 400

    file = request.files['image']
    if not file.filename:
        LOGGER.warning("[%s] Empty filename", request_id)
        return jsonify({"error": "Filename missing"}), 400

    if file.mimetype not in ALLOWED_CONTENT_TYPES:
        LOGGER.warning("[%s] Unsupported mime type: %s", request_id, file.mimetype)
        return jsonify({"error": "Unsupported image format"}), 400

    filename = file.filename

    raw_bytes = b""
    try:
        raw_bytes = file.read()
        if not raw_bytes:
            raise ValueError("Empty file payload")

        img = Image.open(BytesIO(raw_bytes))
        img.thumbnail((1024, 1024))
        buffer = BytesIO()
        img.save(buffer, format="JPEG")
        img_bytes = buffer.getvalue()
    except Exception as exc:
        LOGGER.warning("[%s] Failed to preprocess image: %s", request_id, exc)
        img_bytes = raw_bytes

    context = _parse_context(request)

    try:
        gemini_result = send_to_gemini(img_bytes, filename)
        classification = classify_label(gemini_result)
    except Exception as exc:
        LOGGER.exception("[%s] Analysis failed", request_id)
        return jsonify({"error": "Analysis failed", "details": str(exc)}), 500

    risk_profile = build_risk_profile(
        gemini_result.get("features", {}),
        classification,
        context,
        previous_entry,
    )

    stored_filename = f"{request_id}.jpg"
    try:
        target_bytes = raw_bytes or img_bytes
        with (IMAGE_DIR / stored_filename).open("wb") as fh:
            fh.write(target_bytes)
    except Exception as exc:
        LOGGER.warning("[%s] Failed to persist image: %s", request_id, exc)

    history_entry = {
        "id": request_id,
        "timestamp": datetime.utcnow().isoformat() + "Z",
        "image_url": f"/history/image/{stored_filename}",
        "image_filename": stored_filename,
        "original_filename": filename,
        "classification": classification,
        "gemini": gemini_result,
        "context": context,
        "event_marker": context.get("event_marker"),
        "risk_profile": risk_profile,
    }
    try:
        _append_history(history_entry)
    except Exception as exc:
        LOGGER.warning("[%s] Failed to persist history entry: %s", request_id, exc)

    response = {
        "request_id": request_id,
        "gemini": gemini_result,
        "classification": classification,
        "history_entry": history_entry,
        "risk_profile": risk_profile,
        "context": context,
    }
    LOGGER.info("[%s] Analysis complete with label %s", request_id, classification["label"])
    return jsonify(response), 200


@app.route("/history", methods=["GET"])
def history():
    entries = _load_history()
    return jsonify({
        "entries": entries,
        "analytics": _calculate_analytics(entries),
    })


@app.route("/history/image/<path:filename>")
def history_image(filename):
    return send_from_directory(str(IMAGE_DIR), filename)

if __name__ == "__main__":
    port = int(os.getenv("PORT", "5001"))
    app.run(host="0.0.0.0", port=port, debug=True)
