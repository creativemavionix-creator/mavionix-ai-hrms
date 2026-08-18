"""
Resume parsing and AI scoring service.

Uses DeepSeek API (OpenAI-compatible) as primary LLM.
Falls back to mock scoring if the API is unavailable.

Scoring weights:
  Skills          35 %
  Experience      25 %
  Education       15 %
  Certifications  10 %
  Projects        10 %
  Soft Skills      5 %
"""
from __future__ import annotations

import hashlib
import json
import logging
import os
import re
from io import BytesIO
from typing import Any
from datetime import datetime, timezone

try:
    from openai import OpenAI
except ImportError:
    OpenAI = None

from PyPDF2 import PdfReader

from app.config import settings

logger = logging.getLogger(__name__)

# ── DeepSeek client ───────────────────────────────────────────────────────────

def _get_client() -> Any:
    if OpenAI is None:
        raise RuntimeError("openai package is not installed.")
    return OpenAI(
        api_key=settings.deepseek_api_key,
        base_url="https://api.deepseek.com",
    )

MODEL = "deepseek-chat"

# ── Scoring weights ───────────────────────────────────────────────────────────

WEIGHTS: dict[str, float] = {
    "skills":          0.35,
    "experience":      0.25,
    "education":       0.15,
    "certifications":  0.10,
    "projects":        0.10,
    "soft_skills":     0.05,
}


def reload_weights_from_db() -> None:
    """Load weights from settings table (no-op in demo mode)."""
    from app.config import settings as app_settings
    if app_settings.demo_mode:
        return
    global WEIGHTS
    try:
        from app.database import supabase
        result = supabase.table("settings").select("value").eq("key", "ai_weights").maybe_single().execute()
        if result.data and result.data.get("value"):
            val = result.data["value"]
            total = val.get("skills", 0) + val.get("experience", 0) + val.get("education", 0) + val.get("projects", 0)
            if total > 0:
                WEIGHTS.update({
                    "skills":     val.get("skills", 35) / 100,
                    "experience": val.get("experience", 25) / 100,
                    "education":  val.get("education", 15) / 100,
                    "projects":   val.get("projects", 10) / 100,
                })
    except Exception as exc:
        logger.warning("Could not load weights from DB: %s", exc)


# ── PDF text extraction ───────────────────────────────────────────────────────

def extract_text_from_pdf(file_bytes: bytes) -> str:
    try:
        reader = PdfReader(BytesIO(file_bytes))
        pages = [page.extract_text() or "" for page in reader.pages]
        text = "\n".join(pages).strip()
        if not text:
            raise ValueError("No text extracted.")
        return text
    except Exception as exc:
        raise ValueError(f"Could not read PDF: {exc}") from exc


# ── JSON extraction helper ────────────────────────────────────────────────────

def _extract_json(text: str) -> Any:
    cleaned = re.sub(r"```(?:json)?", "", text).replace("```", "").strip()
    try:
        return json.loads(cleaned)
    except json.JSONDecodeError:
        pass
    match = re.search(r"(\{.*\}|\[.*\])", cleaned, re.DOTALL)
    if match:
        try:
            return json.loads(match.group(1))
        except json.JSONDecodeError:
            pass
    raise ValueError(f"Could not parse JSON from LLM response:\n{text[:300]}")


GEMINI_KEY = settings.gemini_api_key or os.getenv("GEMINI_API_KEY", "")

def _chat(system: str, user: str, max_tokens: int = 2048) -> str:
    """Call Gemini or DeepSeek chat completion and return the text response."""
    # Try Gemini first
    try:
        import httpx
        url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key={GEMINI_KEY}"
        resp = httpx.post(
            url,
            json={"contents": [{"parts": [{"text": f"{system}\n\nTask:\n{user}"}]}]},
            timeout=15.0,
        )
        if resp.status_code == 200:
            data = resp.json()
            return data["candidates"][0]["content"]["parts"][0]["text"]
    except Exception as exc:
        logger.warning("Gemini API call failed, trying DeepSeek: %s", exc)

    # Fallback to DeepSeek
    client = _get_client()
    response = client.chat.completions.create(
        model=MODEL,
        messages=[
            {"role": "system", "content": system},
            {"role": "user", "content": user},
        ],
        temperature=0.1,
        max_tokens=max_tokens,
    )
    return response.choices[0].message.content or ""


# ── Resume parsing ────────────────────────────────────────────────────────────

_PARSE_SYSTEM = "You are an expert HR AI assistant. Extract structured data from resumes. Return ONLY valid JSON, no markdown or commentary."

_PARSE_USER = """Parse the following resume text and return a JSON object with exactly these fields (use null for missing):

{{
  "name": string|null,
  "email": string|null,
  "phone": string|null,
  "summary": string|null,
  "skills": string[],
  "experience_years": number|null,
  "experience": [{{"title":string,"company":string,"duration":string,"summary":string|null}}],
  "education": [{{"degree":string,"institution":string,"year":string|null}}],
  "certifications": string[],
  "projects": [{{"name":string,"description":string|null,"technologies":string[]}}],
  "soft_skills": string[],
  "languages": string[],
  "tags": string[]
}}

Rules:
- "tags": flat list of top 8 technical keywords
- "experience_years": total professional years as a number

Resume text:
{resume_text}"""


async def parse_resume(resume_text: str) -> dict[str, Any]:
    try:
        raw = _chat(_PARSE_SYSTEM, _PARSE_USER.format(resume_text=resume_text[:10000]))
        parsed = _extract_json(raw)
        if not isinstance(parsed, dict):
            raise ValueError("Expected JSON object")
        return parsed
    except Exception as exc:
        logger.error("parse_resume failed: %s", exc)
        raise ValueError(str(exc)) from exc


# ── Resume scoring ────────────────────────────────────────────────────────────

_SCORE_SYSTEM = "You are an expert HR AI scoring engine. Score candidates against job requirements. Return ONLY valid JSON."

_SCORE_USER = """Score this candidate against the job title "{job_title}".

Return JSON with exactly these fields:
{{
  "skills_score": integer 0-100,
  "experience_score": integer 0-100,
  "education_score": integer 0-100,
  "certifications_score": integer 0-100,
  "projects_score": integer 0-100,
  "soft_skills_score": integer 0-100,
  "confidence": integer 0-100,
  "sentiment_score": integer 0-100,
  "insights": string (2-3 sentence HR summary),
  "flags": string[] (concerns, empty if none)
}}

Scoring weights: Skills 35%, Experience 25%, Education 15%, Certifications 10%, Projects 10%, Soft Skills 5%.

Parsed resume:
{parsed_resume}"""


async def score_resume(parsed_resume: dict[str, Any], job_title: str) -> dict[str, Any]:
    try:
        raw = _chat(
            _SCORE_SYSTEM,
            _SCORE_USER.format(
                job_title=job_title,
                parsed_resume=json.dumps(parsed_resume, indent=2)[:6000],
            ),
            max_tokens=1024,
        )
        scored = _extract_json(raw)
        if not isinstance(scored, dict):
            raise ValueError("Expected JSON object")
        scored["overall_score"] = _compute_weighted_score(scored)
        scored["match_quality"] = _quality_label(scored["overall_score"])
        return scored
    except Exception as exc:
        logger.error("score_resume failed: %s", exc)
        raise ValueError(str(exc)) from exc


def _compute_weighted_score(scores: dict[str, Any]) -> int:
    raw = (
        scores.get("skills_score", 0) * WEIGHTS["skills"] +
        scores.get("experience_score", 0) * WEIGHTS["experience"] +
        scores.get("education_score", 0) * WEIGHTS["education"] +
        scores.get("certifications_score", 0) * WEIGHTS["certifications"] +
        scores.get("projects_score", 0) * WEIGHTS["projects"] +
        scores.get("soft_skills_score", 0) * WEIGHTS["soft_skills"]
    )
    return min(100, max(0, round(raw)))


def _quality_label(score: int) -> str:
    if score >= 85: return "excellent"
    if score >= 75: return "strong"
    if score >= 60: return "good"
    if score >= 45: return "fair"
    return "low"


# ── Insights generation ───────────────────────────────────────────────────────

async def generate_screening_insights(
    parsed_resume: dict[str, Any],
    scoring: dict[str, Any],
    job_title: str,
) -> str:
    fallback = scoring.get("insights", "AI screening insights unavailable.")
    try:
        raw = _chat(
            "You are a senior HR analyst. Write exactly 1-2 sentences (max 40 words) summarizing this candidate's fit. Be specific and direct.",
            f"Job: {job_title}\nScoring: {json.dumps({k:v for k,v in scoring.items() if k != 'insights'})}\nSkills: {parsed_resume.get('tags', [])}",
            max_tokens=100,
        )
        return raw.strip() if raw.strip() else fallback
    except Exception as exc:
        logger.warning("Insights generation failed: %s", exc)
        return fallback


# ── Combined entry point ──────────────────────────────────────────────────────

async def parse_and_score(
    file_bytes: bytes,
    job_title: str,
) -> tuple[dict[str, Any], dict[str, Any]]:
    """
    Full pipeline: extract PDF → parse → score → insights.
    Falls back to mock if DeepSeek is unavailable or PDF can't be read.
    """
    try:
        text = extract_text_from_pdf(file_bytes)
    except ValueError as exc:
        logger.warning("PDF extraction failed, using raw bytes as text: %s", exc)
        # Try to decode as plain text (might be a text-based resume)
        text = file_bytes.decode("utf-8", errors="ignore")[:5000]
        if len(text.strip()) < 20:
            # Not enough content — use mock directly
            logger.warning("Not enough content for LLM, using mock scoring")
            parsed = _mock_parse("No resume text available")
            scored = _mock_score(parsed, job_title)
            return parsed, scored

    try:
        parsed = await parse_resume(text)
    except Exception as exc:
        logger.warning("parse_resume failed, using mock: %s", exc)
        parsed = _mock_parse(text)

    try:
        scored = await score_resume(parsed, job_title)
    except Exception as exc:
        logger.warning("score_resume failed, using mock: %s", exc)
        scored = _mock_score(parsed, job_title)

    scored["insights"] = await generate_screening_insights(parsed, scored, job_title)
    return parsed, scored


# ── Mock fallbacks ────────────────────────────────────────────────────────────

import os

SKILLS_DICTIONARY = {
    "React": [r"react(?:\.js|js|[\s_-]js)?\b"],
    "Node.js": [r"node(?:\.js|js|[\s_-]js)?\b"],
    "TypeScript": [r"typescript\b", r"\bts\b"],
    "JavaScript": [r"javascript\b", r"\bjs\b", r"java[\s_-]script\b"],
    "Python": [r"python\b", r"\bpy\b"],
    "PyTorch": [r"pytorch\b", r"torch\b"],
    "PostgreSQL": [r"postgres\b", r"postgresql\b"],
    "MongoDB": [r"mongo\b", r"mongodb\b"],
    "Redis": [r"redis\b"],
    "Docker": [r"docker\b"],
    "Kubernetes": [r"kubernetes\b", r"k8s\b"],
    "AWS": [r"aws\b", r"amazon[\s_-]web[\s_-]services\b"],
    "FastAPI": [r"fastapi\b"],
    "Django": [r"django\b"],
    "Flask": [r"flask\b"],
    "Java": [r"java\b"],
    "Go": [r"\bGo\b(?![\s]+to\b)", r"\bgolang\b"],  # case-sensitive Go, ignoring "Go to"
    "C": [r"\bC\b"],  # case-sensitive C
    "C++": [r"c\+\+"],
    "R": [r"\bR\b(?![\s&]*[Dd]\b)(?![\s]+and[\s]+[Dd]\b)"],  # case-sensitive R, ignoring "R&D" or "R and D"
    "Rust": [r"rust\b"],
    "Ruby": [r"ruby\b"],
    "PHP": [r"php\b"],
    "Swift": [r"swift\b"],
    "Kotlin": [r"kotlin\b"],
    "Angular": [r"angular\b", r"angularjs\b"],
    "Vue": [r"vue(?:\.js|js)?\b"],
    "Next.js": [r"next(?:\.js|js)?\b"],
    "Tailwind": [r"tailwind(?:\s*css)?\b"],
    "HTML": [r"html5?\b"],
    "CSS": [r"css3?\b"],
    "Sass": [r"sass\b", r"scss\b"],
    "GraphQL": [r"graphql\b"],
    "Rest API": [r"rest\s*api\b", r"restful\b"],
    "SQL": [r"sql\b"],
    "Figma": [r"figma\b"],
    "Sketch": [r"sketch\b"],
    "Adobe XD": [r"adobe[\s_-]xd\b", r"xd\b"],
    "Wireframing": [r"wireframing\b", r"wireframes?\b"],
    "Prototyping": [r"prototyping\b", r"prototypes?\b"],
    "User Research": [r"user\s*research\b"],
    "Design Systems": [r"design\s*systems?\b"],
    "Usability Testing": [r"usability\s*testing\b"],
    "Excel": [r"excel\b"],
    "Tableau": [r"tableau\b"],
    "Power BI": [r"power\s*bi\b"],
    "ETL": [r"etl\b"],
    "Data Warehousing": [r"data\s*warehous(?:e|ing)\b"],
    "Statistics": [r"statistics\b", r"statistical\b"],
    "Pandas": [r"pandas\b"],
    "NumPy": [r"numpy\b"],
    "Scikit-Learn": [r"scikit[\s_-]learn\b", r"sklearn\b"],
    "TensorFlow": [r"tensorflow\b", r"tf\b"],
    "NLP": [r"nlp\b", r"natural\s*language\s*processing\b"],
    "Deep Learning": [r"deep\s*learning\b"],
    "Data Modeling": [r"data\s*modeling\b"],
    "Vector Search": [r"vector\s*search\b", r"vector\s*db\b"],
    "Git": [r"git\b", r"github\b", r"gitlab\b"],
    "Jenkins": [r"jenkins\b"],
    "Terraform": [r"terraform\b"],
    "Ansible": [r"ansible\b"],
    "Spark": [r"spark\b", r"pyspark\b"],
    "Hadoop": [r"hadoop\b"]
}

def _load_job_profiles() -> dict:
    try:
        path = os.path.join(os.path.dirname(__file__), "..", "job_profiles.json")
        if os.path.exists(path):
            with open(path, "r", encoding="utf-8") as f:
                return json.load(f)
    except Exception as e:
        logger.warning(f"Failed to load job_profiles.json: {e}")
    return {}

def _match_job_profile(job_title: str, profiles: dict) -> dict:
    title_lower = (job_title or "").lower()
    if any(kw in title_lower for kw in ["ml", "machine learning", "nlp", "ai"]):
        return profiles.get("ml engineer") or profiles.get("default", {})
    if any(kw in title_lower for kw in ["backend", "django", "node", "python"]):
        return profiles.get("senior backend engineer") or profiles.get("default", {})
    if any(kw in title_lower for kw in ["frontend", "react", "angular", "vue", "web"]):
        return profiles.get("frontend developer") or profiles.get("default", {})
    if any(kw in title_lower for kw in ["ux", "ui", "design"]):
        return profiles.get("ux designer") or profiles.get("default", {})
    if any(kw in title_lower for kw in ["data analyst", "analytics", "analyst"]):
        return profiles.get("data analyst") or profiles.get("default", {})
    if any(kw in title_lower for kw in ["product manager", "pm", "product owner"]):
        return profiles.get("product manager") or profiles.get("default", {})
    for key in profiles:
        if key in title_lower:
            return profiles[key]
    return profiles.get("default", {})


def extract_name(text: str) -> str | None:
    lines = [line.strip() for line in text.splitlines() if line.strip()]
    for line in lines[:5]:
        if any(w in line.lower() for w in ["resume", "curriculum", "page", "email", "phone", "profile", "summary", "experience", "education", "contact"]):
            continue
        words = line.split()
        if 2 <= len(words) <= 4 and all(w[0].isupper() for w in words if w.isalpha()):
            return line
    return None

def extract_experience_years(text: str) -> int:
    # 1. Look for X+ years format
    matches = re.findall(r"(\d+)\+?\s*(?:years?|yrs?)\b(?:\s*of\s*experience)?", text, re.IGNORECASE)
    if matches:
        return max(int(m) for m in matches)
    
    # 2. Look for date ranges (e.g. 2018 - 2022 or Jan 2021 - Present)
    month_pat = r"(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*"
    current_year = datetime.now(timezone.utc).year
    total_years = 0
    
    for m in re.finditer(rf"\b((?:19|20)\d{{2}})\b\s*[-–—\s]+\s*(Present|Current|Now|\b((?:19|20)\d{{2}})\b)", text, re.IGNORECASE):
        start_yr = int(m.group(1))
        end_group = m.group(2).lower()
        if "present" in end_group or "current" in end_group or "now" in end_group:
            end_yr = current_year
        else:
            end_yr = int(m.group(3))
        
        duration = end_yr - start_yr
        if 0 < duration < 40:
            total_years += duration
            
    if total_years > 0:
        return min(30, total_years)
    
    return 3 # fallback default

def _mock_parse(text: str) -> dict[str, Any]:
    name = extract_name(text)
    email_match = re.search(r"[\w\.-]+@[\w\.-]+\.\w+", text)
    email = email_match.group(0) if email_match else None
    
    # Support international phone formats (+44, +91, etc.)
    phone_match = re.search(r"\+?\d[\d\s\(\)-]{8,14}\d", text)
    phone = phone_match.group(0) if phone_match else None
    
    detected_skills = []
    for skill, patterns in SKILLS_DICTIONARY.items():
        matched = False
        for pattern in patterns:
            # Case-sensitive check for short names to prevent false positives
            if skill in ["Go", "C", "R"]:
                if re.search(pattern, text): # Case-sensitive matching
                    matched = True
                    break
            else:
                if re.search(pattern, text, re.IGNORECASE):
                    matched = True
                    break
        if matched:
            detected_skills.append(skill)
            
    exp_years = extract_experience_years(text)
    
    soft_skills_list = ["Communication", "Teamwork", "Problem Solving", "Adaptability", "Collaboration", "Leadership"]
    detected_soft = [s for s in soft_skills_list if re.search(rf"\b{s}\b", text, re.IGNORECASE)]
    if not detected_soft:
        detected_soft = ["Communication", "Teamwork"]
        
    return {
        "name": name,
        "email": email,
        "phone": phone,
        "summary": text[:300].strip(),
        "skills": detected_skills,
        "experience_years": exp_years,
        "experience": [],
        "education": [],
        "certifications": [],
        "projects": [],
        "soft_skills": detected_soft,
        "languages": ["English"],
        "tags": detected_skills[:8],
    }

def _mock_score(parsed: dict[str, Any], job_title: str) -> dict[str, Any]:
    profiles = _load_job_profiles()
    matched_profile = _match_job_profile(job_title, profiles)
        
    req_skills = matched_profile.get("required_skills", [])
    cand_skills = [s.lower() for s in parsed.get("skills", [])]
    
    matched_skills = []
    missing_skills = []
    for req_s in req_skills:
        if req_s.lower() in cand_skills:
            matched_skills.append(req_s)
        else:
            missing_skills.append(req_s)
            
    if req_skills:
        skills_score = round((len(matched_skills) / len(req_skills)) * 100)
    else:
        skills_score = 75
        
    target_exp = matched_profile.get("target_experience_years", 2)
    cand_exp = parsed.get("experience_years", 3)
    if cand_exp >= target_exp:
        experience_score = 100
    else:
        experience_score = round((cand_exp / target_exp) * 100)
    experience_score = min(100, max(40, experience_score))
    
    # Check text for education indicators
    education_score = 75
    text_lower = parsed.get("summary", "").lower()
    if any(w in text_lower for w in ["master", "m.tech", "ms", "phd"]):
        education_score = 90
    elif any(w in text_lower for w in ["bachelor", "b.tech", "bs", "degree"]):
        education_score = 80
        
    projects_score = 75
    if len(parsed.get("skills", [])) > 8:
        projects_score = 90
        
    certifications_score = 70
    soft_skills_score = 80
    if len(parsed.get("soft_skills", [])) > 3:
        soft_skills_score = 90
        
    scores = {
        "skills_score": skills_score,
        "experience_score": experience_score,
        "education_score": education_score,
        "certifications_score": certifications_score,
        "projects_score": projects_score,
        "soft_skills_score": soft_skills_score,
    }
    
    overall = _compute_weighted_score(scores)
    match_quality = _quality_label(overall)
    
    insights = f"Candidate matches {len(matched_skills)} out of {len(req_skills)} required skills for {job_title}. They have {cand_exp} years of experience (target: {target_exp} years)."
    if missing_skills:
        insights += f" Missing skills include: {', '.join(missing_skills[:3])}."
        
    return {
        **scores,
        "overall_score": overall,
        "match_quality": match_quality,
        "confidence": 90 if len(parsed.get("skills", [])) > 3 else 70,
        "sentiment_score": 85,
        "insights": insights,
        "flags": ["experience_shortfall"] if cand_exp < target_exp else [],
        "matched_skills": matched_skills,
        "missing_skills": missing_skills,
        "engine": "rule_based",
        "eval_mode": "rule_engine"
    }
