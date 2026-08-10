import json
import os

_DATA_DIR = os.path.join(os.path.dirname(__file__), "data")

def get_add_candidate_guide() -> dict:
    guide_path = os.path.join(_DATA_DIR, "guides_v1.json")
    if os.path.exists(guide_path):
        with open(guide_path, "r", encoding="utf-8") as f:
            data = json.load(f)
            return data.get("guides", {}).get("add_candidate", {})
    return {
        "title": "How to Add a Candidate",
        "steps": [
            "1. Open Candidate Management view.",
            "2. Click '+ Add Candidate'.",
            "3. Enter candidate name, email, and upload resume."
        ],
        "quick_action": {"label": "Go to Candidates", "action": "open_tab", "target_tab": "candidates"}
    }
