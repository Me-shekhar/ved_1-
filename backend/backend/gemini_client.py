# backend/gemini_client.py
import os
import base64

# This module provides a function send_to_gemini(image_bytes, image_name)
# It should call the Gemini Vision API and return the parsed JSON matching the schema
# We provide a mocked response structure for local testing.
# Replace the mock with a real API integration when ready.

GEMINI_API_KEY = os.getenv("AIzaSyADImW1xYOyBFDuhBHhlPswAd-KW52T47g")

def send_to_gemini(image_bytes: bytes, image_name: str):
    """
    Send image to Gemini Vision API and return parsed JSON (matching schema previously defined).
    Currently returns a mocked response for testing. Replace with actual API calls.
    """
    # ------------- MOCK RESPONSE (for development) -------------
    mock = {
        "image_id": image_name,
        "quality": {
            "adequate_lighting": True,
            "focused": True,
            "view_complete": True,
            "notes": ""
        },
        "localization": {
            "bbox": [50, 50, 450, 450],
            "segmentation_mask_available": False
        },
        "features": {
            "redness": {"present": True, "extent_percent": 30.0, "confidence": 0.9},
            "swelling": {"present": True, "extent_percent": 15.0, "confidence": 0.85},
            "dressing_lift": {"present": False, "confidence": 0.9},
            "discharge": {"present": False, "type": None, "amount": "none", "confidence": 0.95},
            "exposed_catheter": {"present": False, "length_mm_estimate": None, "confidence": 0.98},
            "open_wound": {"present": False, "size_mm": None, "confidence": 0.98},
            "bruising": {"present": False, "confidence": 0.8},
            "crusting": {"present": False, "confidence": 0.8},
            "erythema_border_sharp": {"yes": False, "confidence": 0.9},
            "fluctuance": {"present": False, "confidence": 0.6}
        },
        "overall_confidence": 0.88,
        "recommended_label": "Yellow",
        "explanation": "Redness and mild swelling detected; caution advised."
    }
    return mock

# When you're ready, implement the real API call here, for instance:
# 1. Upload the image to the API as base64 or multipart
# 2. Send the prompt (from earlier) and request JSON output
# 3. Parse the API response and return a Python dict exactly matching the schema
