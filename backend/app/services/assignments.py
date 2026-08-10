"""
Assignment generation and evaluation service using DeepSeek.

- generate_assignment(): creates a role-appropriate task
- evaluate_submission(): scores a candidate's submission
"""
from __future__ import annotations

import json
import logging
import re
from datetime import datetime, timedelta, timezone
from typing import Any

from openai import OpenAI

from app.config import settings
from app.database import supabase

logger = logging.getLogger(__name__)

ASSIGNMENT_ADVANCE_THRESHOLD = 70  # score >= this → auto-advance to tech_round


def _client() -> OpenAI:
    return OpenAI(api_key=settings.deepseek_api_key, base_url="https://api.deepseek.com")


def _extract_json(raw: str) -> dict:
    cleaned = re.sub(r"```(?:json)?", "", raw).replace("```", "").strip()
    try:
        return json.loads(cleaned)
    except json.JSONDecodeError:
        match = re.search(r"\{.*\}", cleaned, re.DOTALL)
        if match:
            return json.loads(match.group(0))
    raise ValueError(f"Could not parse JSON: {raw[:200]}")


def _get_role_category(title: str, department: str) -> str:
    t = f"{title} {department}".lower()
    if any(k in t for k in ["engineer", "developer", "backend", "frontend", "devops", "data", "ml", "qa"]):
        return "software"
    if any(k in t for k in ["design", "ux", "ui", "creative"]):
        return "design"
    if any(k in t for k in ["market", "growth", "content", "seo"]):
        return "marketing"
    if any(k in t for k in ["sales", "business development", "account"]):
        return "sales"
    if any(k in t for k in ["product", "pm"]):
        return "product"
    return "general"


_GENERATE_PROMPT = """You are a senior hiring manager creating a take-home assignment for a {role_category} role.

Job Title: {job_title}
Department: {department}
Job Description: {job_description}

Generate a role-appropriate assignment based on the category:
- Software roles: a coding challenge or system design problem (include clear requirements, expected deliverables, optional bonus points)
- Design roles: a design exercise with a specific user problem to solve (include target audience, constraints, expected outputs)
- Marketing roles: a campaign planning exercise (include brand context, target metrics, deliverables)
- Sales roles: a sales simulation scenario (include product context, prospect profile, expected outputs)
- Product roles: a product spec or prioritization exercise
- General: a relevant case study or analytical exercise

Return ONLY valid JSON:
{{
  "title": "Assignment title (concise, max 10 words)",
  "description": "Detailed assignment brief (200-400 words with clear context, problem statement, and what you're looking for)",
  "requirements": "Bullet-pointed list of specific deliverables and evaluation criteria",
  "estimated_hours": number (2-8),
  "difficulty": "junior" | "mid" | "senior"
}}"""


async def generate_assignment(
    job_title: str,
    department: str,
    job_description: str | None,
) -> dict[str, Any]:
    """Generate a role-appropriate assignment using DeepSeek."""
    role_category = _get_role_category(job_title, department)

    try:
        client = _client()
        response = client.chat.completions.create(
            model="deepseek-chat",
            messages=[
                {"role": "system", "content": "You are an expert technical hiring manager. Return only valid JSON."},
                {"role": "user", "content": _GENERATE_PROMPT.format(
                    role_category=role_category,
                    job_title=job_title,
                    department=department,
                    job_description=job_description or "Not provided",
                )},
            ],
            temperature=0.7,
            max_tokens=1000,
        )
        raw = response.choices[0].message.content or ""
        result = _extract_json(raw)
        return result
    except Exception as exc:
        logger.error("Assignment generation failed: %s", exc)
        # Fallback
        return {
            "title": f"Take-Home Assignment: {job_title}",
            "description": f"Please complete a relevant task demonstrating your skills for the {job_title} role in {department}. Show your problem-solving approach, technical depth, and attention to detail.",
            "requirements": "1. Clear documentation of your approach\n2. Working solution or detailed proposal\n3. Brief explanation of trade-offs considered",
            "estimated_hours": 4,
            "difficulty": "mid",
        }


_EVALUATE_PROMPT = """You are a senior technical reviewer evaluating a candidate's assignment submission.

Assignment Title: {title}
Assignment Description: {description}
Requirements: {requirements}

Candidate Submission:
{submission}

Evaluate the submission thoroughly and return ONLY valid JSON:
{{
  "score": integer 0-100,
  "criteria": {{
    "architecture": integer 0-100,
    "correctness": integer 0-100,
    "code_quality": integer 0-100,
    "documentation": integer 0-100
  }},
  "strengths": ["strength 1", "strength 2"],
  "weaknesses": ["weakness 1", "weakness 2"],
  "missing_requirements": ["missing requirement 1"],
  "confidence": float 0.0-1.0,
  "recommendation": "A 2-3 sentence executive summary for the recruiter"
}}

Scoring guide:
- 90-100: Exceptional, exceeds expectations significantly
- 75-89: Strong submission, meets all requirements well
- 60-74: Adequate, meets basic requirements but has gaps
- 40-59: Below expectations, significant issues
- 0-39: Did not meet minimum requirements"""


async def evaluate_submission(
    title: str,
    description: str,
    requirements: str | None,
    submission_text: str | None,
    submission_url: str | None,
    role_blueprint: dict | None = None,
) -> dict[str, Any]:
    """Evaluate a candidate's assignment submission using DeepSeek with structured sub-criteria."""
    submission = submission_text or ""
    if submission_url:
        submission += f"\n\n[Submission URL: {submission_url}]"
    if not submission.strip():
        submission = "[No submission content provided - candidate submitted blank/short response]"

    try:
        client = _client()
        prompt_content = _EVALUATE_PROMPT.format(
            title=title,
            description=description,
            requirements=requirements or "Not specified",
            submission=submission[:6000],
        )
        if role_blueprint:
            prompt_content += f"\n\nRole Evaluation Focus Criteria:\n{json.dumps(role_blueprint)}"

        response = client.chat.completions.create(
            model="deepseek-chat",
            messages=[
                {"role": "system", "content": "You are a rigorous but fair technical reviewer. Return only valid JSON."},
                {"role": "user", "content": prompt_content},
            ],
            temperature=0.3,
            max_tokens=800,
        )
        raw = response.choices[0].message.content or ""
        result = _extract_json(raw)

        # Normalize structure
        score = result.get("score", 50)
        criteria = result.get("criteria", {})
        if not isinstance(criteria, dict):
            criteria = {}

        return {
            "score": score,
            "overall_score": score,
            "criteria": {
                "architecture": criteria.get("architecture", result.get("technical_depth", score)),
                "correctness": criteria.get("correctness", result.get("completeness", score)),
                "code_quality": criteria.get("code_quality", result.get("creativity", score)),
                "documentation": criteria.get("documentation", result.get("communication", score)),
            },
            "strengths": result.get("strengths", ["Submission received"]),
            "weaknesses": result.get("weaknesses", []),
            "concerns": result.get("weaknesses", []),
            "missing_requirements": result.get("missing_requirements", []),
            "confidence": result.get("confidence", 0.92),
            "recommendation": result.get("recommendation", "Evaluation completed."),
        }
    except Exception as exc:
        logger.error("Assignment evaluation failed: %s", exc)
        return {
            "score": 50,
            "overall_score": 50,
            "criteria": {
                "architecture": 50,
                "correctness": 50,
                "code_quality": 50,
                "documentation": 50,
            },
            "strengths": ["Submission received"],
            "weaknesses": ["AI evaluation unavailable — manual review recommended"],
            "concerns": ["AI evaluation unavailable — manual review recommended"],
            "missing_requirements": [],
            "confidence": 0.5,
            "recommendation": "Automated evaluation failed. Please review manually.",
        }
