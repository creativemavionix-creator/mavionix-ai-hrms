import json
import os

_DATA_DIR = os.path.join(os.path.dirname(__file__), "data")

def get_scoring_weights_guide() -> dict:
    path = os.path.join(_DATA_DIR, "scoring_v1.json")
    if os.path.exists(path):
        with open(path, "r", encoding="utf-8") as f:
            return json.load(f)
    return {
        "version": "1.0",
        "scoring_weights": {
            "technical_skills": {"weight_pct": 40},
            "relevant_experience": {"weight_pct": 30},
            "education_and_certifications": {"weight_pct": 15},
            "projects_and_achievements": {"weight_pct": 15}
        }
    }
