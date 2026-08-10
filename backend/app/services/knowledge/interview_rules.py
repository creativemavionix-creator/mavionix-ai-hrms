import json
import os

_DATA_DIR = os.path.join(os.path.dirname(__file__), "data")

def _load_policies() -> dict:
    path = os.path.join(_DATA_DIR, "policies_v1.json")
    if os.path.exists(path):
        with open(path, "r", encoding="utf-8") as f:
            return json.load(f)
    return {}

def get_3_strike_policy() -> dict:
    data = _load_policies()
    return data.get("policies", {}).get("anti_cheating_3_strike_rule", {})

def get_plagiarism_policy() -> dict:
    data = _load_policies()
    return data.get("policies", {}).get("plagiarism_detection_thresholds", {})

def get_termination_policy() -> dict:
    data = _load_policies()
    return data.get("policies", {}).get("candidate_termination_policy", {})
