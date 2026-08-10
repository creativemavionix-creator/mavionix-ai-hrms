import os
import sys
import json
from pprint import pprint

# Ensure backend path is in sys.path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "backend")))

from app.services.ai_interviews import _evaluate_speaking, _build_rule_summary

def test_speaking_eval():
    print("--- Test: _evaluate_speaking ---")
    
    # Simulate a response with many fillers
    text1 = "Uh, so, like, I built this backend using, um, you know, FastAPI. And it was, like, pretty scalable."
    metrics1 = {"microphone_fallback": False, "audio_duration": 15, "words_per_minute": 60}
    res1 = _evaluate_speaking(text1, 1, metrics1)
    print("Response 1:", res1)
    
    # Simulate a fast-paced, confident response
    text2 = "Firstly, I engineered the backend with FastAPI. Therefore, we achieved high throughput and low latency, because it supports async operations out of the box."
    metrics2 = {"microphone_fallback": False, "audio_duration": 10, "words_per_minute": 130}
    res2 = _evaluate_speaking(text2, 2, metrics2)
    print("Response 2:", res2)
    
    # Simulate a fallback (keyboard typing) response
    text3 = "I designed the architecture to scale horizontally."
    metrics3 = {"microphone_fallback": True, "audio_duration": 0, "words_per_minute": 0}
    res3 = _evaluate_speaking(text3, 3, metrics3)
    print("Response 3:", res3)
    
    print("\n--- Test: _build_rule_summary ---")
    transcript = [
        {"role": "ai", "message": "Can you tell me about a bug?"},
        {"role": "candidate", "message": text1, "speaking_metrics": metrics1},
        {"role": "ai", "message": "Good. Next question."},
        {"role": "candidate", "message": text2, "speaking_metrics": metrics2},
        {"role": "ai", "message": "One more question."},
        {"role": "candidate", "message": text3, "speaking_metrics": metrics3}
    ]
    
    summary = _build_rule_summary(transcript, "speaking", "Backend Engineer", ["FastAPI", "Python"])
    
    print("\nFinal Rule Summary for Speaking Round:")
    pprint(summary)
    
    assert summary.get("speaking_eval") is not None, "speaking_eval should be present in summary"
    print("\nAll tests passed successfully!")

if __name__ == "__main__":
    test_speaking_eval()
