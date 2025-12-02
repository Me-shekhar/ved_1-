# backend/app.py
import os
from flask import Flask, request, jsonify, send_from_directory
from gemini_client import send_to_gemini
from decision_tree import classify_label
from PIL import Image
from io import BytesIO

app = Flask(__name__, static_folder="../frontend", static_url_path="/")

@app.route("/")
def index():
    return send_from_directory(app.static_folder, "index.html")

@app.route("/analyze", methods=["POST"])
def analyze():
    # Expecting multipart form-data with file field 'image'
    if 'image' not in request.files:
        return jsonify({"error": "No image uploaded"}), 400
    file = request.files['image']
    filename = file.filename or "uploaded.jpg"
    img_bytes = file.read()

    # Optionally: basic preprocessing (resize to max 1024)
    try:
        img = Image.open(BytesIO(img_bytes))
        img.thumbnail((1024, 1024))
        buffer = BytesIO()
        img.save(buffer, format="JPEG")
        img_bytes = buffer.getvalue()
    except Exception as e:
        # if PIL fails, continue with raw bytes
        pass

    # Send to Gemini (or mocked function)
    gemini_result = send_to_gemini(img_bytes, filename)

    # Run decision tree
    classification = classify_label(gemini_result)

    # Compose response
    response = {
        "gemini": gemini_result,
        "classification": classification
    }
    return jsonify(response), 200

if __name__ == "__main__":
    port = int(os.getenv("PORT", "5000"))
    app.run(host="0.0.0.0", port=port, debug=True)
