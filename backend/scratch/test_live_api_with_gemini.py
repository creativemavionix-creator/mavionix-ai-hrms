import os
import sys
import asyncio

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.config import settings
from app.services.ai_interviews import generate_first_question, process_response

async def test_flow():
    print("--- Testing Live Gemini AI Question Generation ---")
    print(f"Gemini Key: {settings.gemini_api_key[:10]}...")

    try:
        # 1. Test generate_first_question
        print("\n[Step 1] Requesting first question from Gemini...")
        first_q = await generate_first_question(
            round_type="tech",
            job_title="Senior Machine Learning Engineer",
            department="AI Engineering",
            job_description="Design, train, and deploy LLMs.",
            candidate_name="Priya Sharma",
            candidate_skills=["Python", "PyTorch", "NLP", "FastAPI"]
        )
        print("Success! Gemini response:")
        print(f"AI: \"{first_q}\"")

        # 2. Test process_response
        print("\n[Step 2] Processing a candidate answer with Gemini...")
        transcript = [
            {"role": "ai", "message": first_q, "timestamp": "2026-07-28T12:00:00Z"},
            {"role": "candidate", "message": "I would implement an HNSW index using PyTorch or FAISS to handle similarity searches under 15ms. To save memory, I would apply Product Quantization to reduce embedding sizes from 32-bit floats to 8-bit integers.", "timestamp": "2026-07-28T12:01:00Z"}
        ]
        
        result = await process_response(
            round_type="tech",
            transcript=transcript,
            job_title="Senior Machine Learning Engineer",
            exchange_count=1,
            candidate_skills=["Python", "PyTorch", "NLP", "FastAPI"]
        )
        
        print("Success! Gemini response:")
        print(f"AI Next Question: \"{result.get('message')}\"")
        print(f"AI Score: {result.get('answer_score')}/10")

        print("\n🎉 Live Gemini AI integration verified successfully!")

    except Exception as e:
        print(f"\n❌ Test failed: {e}")

if __name__ == "__main__":
    asyncio.run(test_flow())
