import json
import os

_DATA_DIR = os.path.join(os.path.dirname(__file__), "data")

def get_portal_link_guide() -> dict:
    path = os.path.join(_DATA_DIR, "guides_v1.json")
    if os.path.exists(path):
        with open(path, "r", encoding="utf-8") as f:
            data = json.load(f)
            return data.get("guides", {}).get("generate_portal_link", {})
    return {}

def get_adjust_weights_guide() -> dict:
    path = os.path.join(_DATA_DIR, "guides_v1.json")
    if os.path.exists(path):
        with open(path, "r", encoding="utf-8") as f:
            data = json.load(f)
            return data.get("guides", {}).get("adjust_ai_weights", {})
    return {}
