# backend/decision_tree.py
from datetime import datetime
from typing import Any, Dict, Optional

PATIENT_FACTOR_WEIGHTS = {
    "agitation": 12,
    "age_extremes": 9,
    "comorbidities": 10,
    "immune_nutrition": 9,
}


def compute_risk_score(features: Dict) -> int:
    # Features is the 'features' dict from Gemini result
    score = 0
    # Purulent discharge - high weight
    disp = features.get("discharge", {})
    if disp.get("present") and disp.get("type") == "purulent":
        score += 60
    # redness extent
    rdr = features.get("redness", {})
    if rdr.get("present") and isinstance(rdr.get("extent_percent"), (int, float)):
        score += int(25 * (rdr.get("extent_percent") / 100.0))
    # swelling presence
    if features.get("swelling", {}).get("present"):
        score += 10
    # dressing lift
    if features.get("dressing_lift", {}).get("present"):
        score += 5
    # open wound
    if features.get("open_wound", {}).get("present"):
        score += 20
    # clamp
    if score > 100:
        score = 100
    if score < 0:
        score = 0
    return score


def _clisa_action(score: float, label: str) -> str:
    if score >= 60 or label.lower() == "red":
        return "Urgent clinician review and catheter assessment now"
    if score >= 30 or label.lower() == "yellow":
        return "Reinforce dressing, reassess within 2 hours"
    return "Continue routine surveillance and document in 12 h"


def _truthy(value: Any) -> bool:
    if isinstance(value, str):
        return value.strip().lower() in {"true", "1", "yes", "y"}
    return bool(value)


def _utc_timestamp() -> str:
    return datetime.utcnow().isoformat() + "Z"

def classify_label(gemini_json: Dict) -> Dict:
    features = gemini_json.get("features", {})
    overall_conf = gemini_json.get("overall_confidence", 0.0)

    # Compute risk score
    risk = compute_risk_score(features)

    # Rule-based mapping (same logic as prompt suggestions)
    label = "Green"
    explanation = "No concerning signs detected."

    # Highest-priority rules
    disp = features.get("discharge", {})
    if disp.get("present") and disp.get("type") == "purulent":
        label = "Red"
        explanation = "Purulent discharge detected — urgent clinician review recommended."
    elif features.get("redness", {}).get("present") and features.get("redness", {}).get("extent_percent", 0) > 30 and features.get("swelling", {}).get("present"):
        label = "Yellow"
        explanation = "Widespread redness with swelling — escalate for clinician review."
    elif features.get("dressing_lift", {}).get("present") and (disp.get("present") or features.get("redness", {}).get("present")):
        label = "Yellow"
        explanation = "Dressing lift with local signs — check dressing and review clinically."
    elif features.get("open_wound", {}).get("present") and (features.get("open_wound", {}).get("size_mm") or 0) > 10:
        label = "Yellow"
        explanation = "Open wound >10mm — needs clinical attention."
    elif overall_conf < 0.5:
        label = "Uncertain"
        explanation = "Low confidence — request a clearer photo."

    # Map risk score to color if not already Red/Yellow by rules
    if label == "Green":
        if risk >= 60:
            label = "Red"
            explanation = "Risk score high based on features — urgent review."
        elif risk >= 25:
            label = "Yellow"
            explanation = "Moderate risk score — clinician review advised."

    return {
        "label": label,
        "risk_score": risk,
        "explanation": explanation,
        "overall_confidence": overall_conf
    }


def build_risk_profile(
    features: Dict[str, Dict[str, Any]],
    classification: Dict[str, Any],
    context: Dict[str, Any],
    previous_entry: Optional[Dict[str, Any]] = None,
) -> Dict[str, Any]:
    """Construct Cathshield-specific risk bundle from features and context."""

    clisa_score = float(compute_risk_score(features))
    dwell_days = context.get("dwell_time_days") or 0.0
    try:
        dwell_days = float(dwell_days)
    except (TypeError, ValueError):
        dwell_days = 0.0

    traction_alerts = context.get("traction_alerts") or 0
    try:
        traction_alerts = int(traction_alerts)
    except (TypeError, ValueError):
        traction_alerts = 0

    patient_factors = context.get("patient_factors") or {}
    factor_score = 0
    normalized_flags = {}
    for key, weight in PATIENT_FACTOR_WEIGHTS.items():
        flag_value = _truthy(patient_factors.get(key))
        normalized_flags[key] = flag_value
        if flag_value:
            factor_score += weight

    dressing_penalty = 12 if features.get("dressing_lift", {}).get("present") else 0
    discharge_penalty = 10 if features.get("discharge", {}).get("present") else 0
    open_wound_penalty = 8 if features.get("open_wound", {}).get("present") else 0

    early_base = min(100.0, clisa_score * 0.6 + factor_score + dressing_penalty + discharge_penalty + open_wound_penalty)

    traction_yellows = context.get("traction_yellow_events") or traction_alerts
    try:
        traction_yellows = int(traction_yellows)
    except (TypeError, ValueError):
        traction_yellows = traction_alerts
    venous_trauma_risk = min(30.0, traction_yellows * 5.0)

    dwell_risk = max(0.0, (dwell_days - 3.0) * 4.0) if dwell_days > 3 else 0.0
    extended_penalty = max(0.0, (dwell_days - 7.0) * 6.0) if dwell_days > 7 else 0.0

    trend_delta = 0.0
    if previous_entry:
        prev_profile = previous_entry.get("risk_profile") or {}
        prev_score = prev_profile.get("clisa_score")
        try:
            prev_score = float(prev_score)
        except (TypeError, ValueError):
            prev_score = None
        if prev_score is not None:
            trend_delta = max(0.0, clisa_score - prev_score)

    alerts = []
    timestamp = _utc_timestamp()

    traction_status = str(context.get("traction_status") or "").lower()
    if traction_status == "red":
        alerts.append({
            "type": "traction",
            "severity": "high",
            "reason": "Traction device flagged possible dislodgement",
            "action": "Inspect the line and securement immediately",
            "timestamp": timestamp,
        })

    if features.get("dressing_lift", {}).get("present"):
        alerts.append({
            "type": "dressing",
            "severity": "medium",
            "reason": "Dressing failure detected",
            "action": "Replace dressing and reassess",
            "timestamp": timestamp,
        })

    if clisa_score >= 70:
        alerts.append({
            "type": "clisa",
            "severity": "high",
            "reason": "CLISA score exceeded critical range",
            "action": "Escalate to clinician and document",
            "timestamp": timestamp,
        })

    # Determine integrated risk window
    if dwell_days <= 3:
        risk_window = "early"
        integrated = early_base
    elif dwell_days <= 7:
        risk_window = "late"
        integrated = min(100.0, early_base * 0.5 + venous_trauma_risk + dwell_risk + trend_delta * 0.5)
    else:
        risk_window = "extended"
        integrated = min(100.0, early_base * 0.4 + venous_trauma_risk + dwell_risk + extended_penalty + trend_delta * 0.5)

    risk_tier = "low"
    risk_label = "Green"
    if integrated >= 65:
        risk_tier = "high"
        risk_label = "Red"
    elif integrated >= 35:
        risk_tier = "moderate"
        risk_label = "Yellow"

    if risk_tier == "high":
        alerts.append({
            "type": "integrated",
            "severity": "high",
            "reason": "High CLABSI risk predicted",
            "action": "Initiate escalation protocol",
            "timestamp": timestamp,
        })

    clisa_action = _clisa_action(clisa_score, classification.get("label", ""))

    return {
        "clisa_score": round(clisa_score, 1),
        "clisa_action": clisa_action,
        "clisa_reference": "#clisa-table",
        "risk_window": risk_window,
        "risk_meter": round(integrated, 1),
        "risk_tier": risk_tier,
        "risk_label": risk_label,
        "traction_alerts": traction_alerts,
        "venous_trauma_risk": round(venous_trauma_risk, 1),
        "dwell_time_days": round(dwell_days, 2),
        "trend_delta": round(trend_delta, 1),
        "patient_factor_score": factor_score,
        "patient_factors": normalized_flags,
        "alerts": alerts,
    }
