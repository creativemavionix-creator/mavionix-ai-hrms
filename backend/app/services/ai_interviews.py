"""
AI-conducted interview service using DeepSeek.

Manages tech, interview (behavioral), and HR rounds as chat-based Q&A.
Each round has ~5-8 exchanges. After completion, generates a summary evaluation.
"""
from __future__ import annotations

import json
import os
import logging
import re
from datetime import datetime, timezone
from typing import Any

try:
    from openai import OpenAI
except ImportError:
    OpenAI = None

import httpx

from app.config import settings
from app.database import supabase

logger = logging.getLogger(__name__)

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

def _record_fallback_metric(job_title: str, round_type: str, exchange_count: int) -> None:
    try:
        metrics_file = r"C:\Users\Pramod\.gemini\antigravity\scratch\fallback_metrics.json"
        metrics = {"executions": 0, "matched_roles": {}, "avg_exchanges": 0}
        if os.path.exists(metrics_file):
            try:
                with open(metrics_file, "r") as f:
                    metrics = json.load(f)
            except Exception:
                pass
        metrics["executions"] += 1
        metrics["matched_roles"][job_title] = metrics["matched_roles"].get(job_title, 0) + 1
        os.makedirs(os.path.dirname(metrics_file), exist_ok=True)
        with open(metrics_file, "w") as f:
            json.dump(metrics, f, indent=2)
    except Exception as e:
        logger.warning(f"Failed to record fallback metric: {e}")

MAX_EXCHANGES = 6  # 6 exchanges per round

GEMINI_KEY = settings.gemini_api_key or os.getenv("GEMINI_API_KEY", "")


def _call_gemini(system_prompt: str, user_prompt: str) -> str:
    url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key={GEMINI_KEY}"
    resp = httpx.post(
        url,
        json={"contents": [{"parts": [{"text": f"{system_prompt}\n\nTask:\n{user_prompt}"}]}]},
        timeout=8.0,
    )
    if resp.status_code == 200:
        data = resp.json()
        return data["candidates"][0]["content"]["parts"][0]["text"]
    raise RuntimeError(f"Gemini HTTP {resp.status_code}: {resp.text[:100]}")


def _client() -> Any:
    if OpenAI is None:
        raise RuntimeError("openai package is not installed.")
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


def _get_job_context(job_id: str) -> dict:
    """Fetch job info for question generation context."""
    result = supabase.table("jobs").select("title, department, description").eq("id", job_id).maybe_single().execute()
    return result.data if result.data else {"title": "Software Engineer", "department": "Engineering", "description": ""}


def _get_candidate_context(candidate_id: str) -> dict:
    """Fetch candidate info for personalization."""
    result = supabase.table("candidates").select("name, parsed_data").eq("id", candidate_id).maybe_single().execute()
    return result.data if result.data else {"name": "Candidate", "parsed_data": None}


# ── System prompts per round type ─────────────────────────────────────────────

SYSTEM_PROMPTS = {
    "tech": """You are a senior technical interviewer at HireMind AI conducting a technical interview.
Your role: ask one clear, focused technical question at a time. Topics should cover:
- Data structures & algorithms (for coding roles)
- System design (for senior roles)
- Domain-specific technical knowledge relevant to the job
- Problem-solving approach and trade-off analysis

Rules:
- Ask ONE question at a time
- Questions should progressively increase in difficulty
- Be conversational but professional
- Acknowledge the candidate's answer briefly before asking the next question""",

    "interview": """You are a senior behavioral interviewer at HireMind AI conducting a behavioral/competency interview.
Your role: ask situational and behavioral questions using the STAR method. Topics should cover:
- Past project experiences and challenges overcome
- Teamwork and collaboration scenarios
- Leadership and initiative examples
- Problem-solving under pressure
- Communication and conflict resolution

Rules:
- Ask ONE question at a time
- Use "Tell me about a time when..." or "How would you handle..." formats
- Probe deeper with follow-ups if the answer is vague
- Be warm and encouraging""",

    "speaking": """You are a senior communication assessor at HireMind AI.
Your role: conduct a Speaking & Verbal Communication Round. Ask oral-focused questions to evaluate verbal presentation, confidence, conciseness, and clarity.
Topics should cover:
- Verbally summarizing complex technical projects
- Describing a complex technical challenge or bug diagnosis
- Explaining complex technical concepts to non-technical stakeholders (e.g. recursion, REST APIs)
- Presenting a trade-off argument (e.g. why choose one language over another)

Rules:
- Ask ONE question at a time
- Keep questions brief and structured for a 60-second limit
- Be warm and encouraging
- Acknowledge their verbal explanation briefly before proceeding""",

    "hr": """You are an HR representative at HireMind AI conducting the final HR round.
Your role: discuss practical matters and cultural fit. Topics should cover:
- Current notice period and availability to start
- Salary expectations and compensation discussion
- Reason for leaving current role
- Long-term career goals and growth expectations
- Work preferences (remote/hybrid/onsite, team size, etc.)
- Any questions the candidate has about the company

Rules:
- Ask ONE question at a time
- Be friendly, professional, and transparent
- Make the candidate feel comfortable discussing sensitive topics like salary
- This is the final round — be thorough but not intimidating""",
}


# ── Generate first question ───────────────────────────────────────────────────

async def generate_first_question(
    round_type: str,
    job_title: str,
    department: str,
    job_description: str | None,
    candidate_name: str,
    candidate_skills: list[str] | None = None,
    custom_questions: list[dict] | None = None,
) -> str:
    """Generate the opening question for an interview round."""
    if custom_questions and len(custom_questions) > 0:
        first_q = custom_questions[0].get("text", "")
        if first_q:
            return f"Welcome {candidate_name}! Let's begin your {round_type.upper()} round: {first_q}"

    skills_str = ", ".join(candidate_skills[:10]) if candidate_skills else "not specified"

    user_prompt = f"""Start the {round_type} interview for this candidate:
- Candidate: {candidate_name}
- Role: {job_title} ({department})
- Job description: {job_description or 'General role'}
- Candidate's skills: {skills_str}

Generate your opening greeting (1 sentence) and first question.
Return ONLY the text of your greeting + question, nothing else."""

    try:
        try:
            return _call_gemini(SYSTEM_PROMPTS.get(round_type, SYSTEM_PROMPTS["interview"]), user_prompt)
        except Exception:
            client = _client()
            response = client.chat.completions.create(
                model="deepseek-chat",
                messages=[
                    {"role": "system", "content": SYSTEM_PROMPTS.get(round_type, SYSTEM_PROMPTS["interview"])},
                    {"role": "user", "content": user_prompt},
                ],
                temperature=0.7,
                max_tokens=300,
            )
            return response.choices[0].message.content or "Let's begin. Tell me about your experience with this role."
    except Exception as exc:
        logger.error("First question generation failed: %s", exc)
        # Rule-based progressive fallback
        profiles = _load_job_profiles()
        matched_profile = _match_job_profile(job_title, profiles)
            
        if round_type == "tech":
            easy_qs = matched_profile.get("questions", {}).get("easy", [])
            q = easy_qs[0] if easy_qs else "Can you explain a challenging technical problem you've solved recently and walk me through your approach?"
            _record_fallback_metric(job_title, round_type, 1)
            return f"Welcome to the technical round for {job_title}. Let's start: {q}"
            
        fallback_questions = {
            "interview": f"Welcome! I'd like to learn more about your experience. Tell me about a project you're most proud of and what made it challenging.",
            "speaking": f"Welcome to the Speaking & Communication Round. Let's start with your first question: Explain your biggest technical project in one minute.",
            "hr": f"Hi {candidate_name}! Thanks for making it to the final round for {job_title}. Let's start with: what's your current situation — are you serving a notice period, and when would you be available to start?",
        }
        _record_fallback_metric(job_title, round_type, 1)
        return fallback_questions.get(round_type, fallback_questions["interview"])


def _compute_similarity(s1: str, s2: str) -> float:
    words1 = set(re.findall(r"\w+", s1.lower()))
    words2 = set(re.findall(r"\w+", s2.lower()))
    if not words1 or not words2:
        return 0.0
    return len(words1.intersection(words2)) / len(words1.union(words2))


def _is_greeting_or_non_answer(message: str) -> bool:
    text = (message or "").strip().lower()
    clean_alpha = re.sub(r"[^a-z\s]", "", text).strip()
    if not clean_alpha:
        return True

    # Normalize repeated characters: "hiiii" -> "hi", "heyyy" -> "hey", "okkk" -> "ok"
    normalized = " ".join(re.sub(r"(.)\1+", r"\1", w) for w in clean_alpha.split())

    greetings = {"hi", "hello", "helo", "hey", "greetings", "good morning", "good afternoon", "good evening", "hi there", "hello there", "hey there", "hola", "yo", "namaste", "howdy", "morning", "afternoon", "evening"}
    non_answers = {"ok", "okay", "yes", "yeah", "yep", "sure", "fine", "cool", "alright", "thanks", "thank you", "k", "np", "ready", "im ready", "i am ready", "let start", "lets start", "start", "go ahead"}

    if clean_alpha in greetings or normalized in greetings or clean_alpha in non_answers or normalized in non_answers:
        return True

    words = clean_alpha.split()
    norm_words = normalized.split()

    if len(words) <= 3 and (any(w in greetings for w in words) or any(w in greetings for w in norm_words)):
        return True
    if len(words) <= 2 and (all(w in non_answers or len(w) <= 2 for w in words) or all(w in non_answers or len(w) <= 2 for w in norm_words)):
        return True

    return False


def _is_gibberish(text: str) -> bool:
    clean = re.sub(r"[^a-zA-Z\s]", "", text).strip().lower()
    if not clean:
        return True
    words = clean.split()
    vowels = set("aeiou")
    for w in words:
        if len(w) > 4 and not any(c in vowels for c in w):
            return True
        if len(w) > 4 and len(set(w)) <= 2:
            return True
    consonants_count = sum(1 for c in clean if c not in vowels and c.isalpha())
    vowels_count = sum(1 for c in clean if c in vowels)
    total_chars = consonants_count + vowels_count
    if total_chars > 6 and vowels_count / total_chars < 0.15:
        return True
    return False


def _classify_intent(message: str, previous_answers: list[str]) -> tuple[str, float]:
    text = (message or "").strip().lower()
    if not text:
        return "empty", 1.0

    # 1. Abuse Detection
    profanities = {"fuck", "shit", "ass", "bitch", "bastard", "cunt", "dick", "asshole", "stupid", "idiot", "dumb", "fool", "nonsense", "bullshit", "crap", "fucking", "shitty", "idiotic"}
    words = text.split()
    prof_count = sum(1 for w in words if w in profanities)
    if prof_count > 0:
        return "abuse", min(1.0, 0.5 + prof_count * 0.25)

    # Keyboard smashing or repeated letters
    for w in words:
        if len(w) > 8 and len(set(w)) <= 3:
            return "abuse", 0.9
        vowels = set("aeiou")
        if len(w) > 6 and not any(c in vowels for c in w):
            return "abuse", 0.95

    # 2. Repeated Answer
    for prev in previous_answers:
        if _compute_similarity(message, prev) > 0.85:
            return "repeated", 0.9

    # 2.5 Interruption Recovery
    if len(words) <= 10 and re.search(r"\b(refresh\w*|disconnect\w*|crash\w*|reload\w*|restart\w*|connection\w*)\b", text):
        return "interruption_recovery", 0.95

    # 3. Greeting
    greetings = {"hi", "hello", "helo", "hey", "greetings", "good morning", "good afternoon", "good evening", "hi there", "hello there", "hey there", "hola", "yo", "namaste", "howdy", "morning", "afternoon", "evening"}
    clean_alpha = re.sub(r"[^a-z\s]", "", text).strip()
    normalized = " ".join(re.sub(r"(.)\1+", r"\1", w) for w in clean_alpha.split())
    if clean_alpha in greetings or normalized in greetings:
        return "greeting", 0.95
    if len(words) <= 2 and (any(w in greetings for w in words) or any(w in greetings for w in normalized.split())):
        return "greeting", 0.9

    # 4. Ready / Start
    ready_words = {"yes", "ready", "let start", "lets start", "start", "sure", "ok", "okay", "proceed", "continue", "go ahead"}
    if clean_alpha in ready_words or normalized in ready_words:
        return "ready", 0.95

    # 5. Asking for Repetition
    if re.search(r"\b(repeat|say that again|once more|say again)\b", text):
        return "repetition", 0.9

    # 6. Asking for Clarification
    if re.search(r"\b(what do you mean|explain the question|could you clarify|dont understand the question|explain what you mean)\b", text):
        return "clarification", 0.95
    elif re.search(r"\b(explain|clarify|understand)\b", text):
        return "clarification", 0.7

    # 7. Small Talk
    if re.search(r"\b(how are you|how is it going|whats up|nice to meet you)\b", text):
        return "small_talk", 0.9

    # 8. Thank You
    thanks_words = {"thanks", "thank you", "thank u"}
    if any(w in text for w in thanks_words):
        return "thank_you", 0.9

    # 9. Candidate Nervous
    if re.search(r"\b(nervous|anxious|scared|anxiety)\b", text):
        return "nervous", 0.95

    # 10. Candidate Doesn't Know
    if re.search(r"\b(dont know|no idea|not sure|cant remember|have no idea)\b", text):
        return "dont_know", 0.95

    # 11. Candidate Refuses (Skip)
    if len(words) <= 8 and re.search(r"\b(skip|next question|dont want to answer)\b", text):
        return "skip", 0.95

    # 12. Off-topic
    if re.search(r"\b(joke|your name|who made you|sing|tell a joke|tell me a joke)\b", text):
        return "off_topic", 0.9

    # 13. Short Answer
    if len(words) < 3:
        return "short", 0.8

    # 14. Copy-Paste / Long Answer
    if len(words) > 250:
        return "copy_paste", 0.85

    return "substantive", 1.0


async def process_response(
    round_type: str,
    transcript: list[dict],
    job_title: str,
    exchange_count: int,
    candidate_skills: list[str] | None = None,
    speaking_metrics: dict | None = None,
) -> dict[str, Any]:
    """
    Process a candidate's answer and generate either a follow-up or completion signal.
    """
    # Extract last candidate message
    last_cand_msg = ""
    for t in reversed(transcript):
        if t.get("role") == "candidate":
            last_cand_msg = t.get("message", "")
            break

    # Extract candidate's past substantive responses
    previous_answers = []
    for t in transcript:
        if t.get("role") == "candidate":
            msg = t.get("message", "")
            if not _is_greeting_or_non_answer(msg) and not _is_gibberish(msg):
                previous_answers.append(msg)

    # Classify intent with confidence scoring
    intent, confidence = _classify_intent(last_cand_msg, previous_answers[:-1] if previous_answers else [])
    if confidence < 0.60:
        intent = "substantive"

    # Retrieve current state and memory from the last AI message in transcript
    last_ai_msg = None
    for t in reversed(transcript):
        if t.get("role") == "ai":
            last_ai_msg = t
            break

    current_state = "Greeting"
    current_memory = {
        "abuse_count": 0,
        "skips_used": 0,
        "does_not_know_count": 0,
        "mentioned_tech": [],
        "last_question": "",
        "warnings_count": 0,
    }

    if last_ai_msg:
        current_state = last_ai_msg.get("state", "Greeting")
        loaded_memory = last_ai_msg.get("memory")
        if isinstance(loaded_memory, dict):
            current_memory.update(loaded_memory)

    # Lockout check for completed interviews
    if current_state == "Closing Interview":
        return {
            "type": "complete",
            "message": "This interview has already completed. Thank you for your time.",
            "answer_score": 8,
            "state": "Closing Interview",
            "memory": current_memory
        }

    # Count substantive turns (excluding warnings/greetings/gibberish)
    substantive_count = len(previous_answers)
    should_complete = substantive_count >= MAX_EXCHANGES

    # Run copy-paste and similarity detection service
    from app.services.plagiarism_detector import analyze_similarity
    sim_res = analyze_similarity(last_cand_msg, previous_answers)
    has_copy_paste = sim_res.get("suspected_copy_paste", False)
    if has_copy_paste:
        intent = "copy_paste"

    # Store structured transcript response metadata
    for t in reversed(transcript):
        if t.get("role") == "candidate":
            t["speaker"] = "candidate"
            t["question"] = current_memory.get("last_question") or ""
            t["candidate_answer"] = t.get("message", "")
            t["turn"] = substantive_count
            t["job_title"] = job_title
            
            # Store copy paste flags on transcript entry
            t["suspected_copy_paste"] = has_copy_paste
            t["copy_paste_risk_score"] = sim_res.get("risk_score", 0.0)
            t["copy_paste_reasons"] = sim_res.get("reasons", [])
            if speaking_metrics:
                t["speaking_metrics"] = speaking_metrics
            break

    # Initialize transition variables
    next_state = "Asking Question"
    response_msg = ""
    ans_score = 5
    is_substantive_turn = False
    
    metadata_flags = {
        "suspected_copy_paste": has_copy_paste,
        "copy_paste_risk_score": sim_res.get("risk_score", 0.0),
        "copy_paste_reasons": sim_res.get("reasons", [])
    }

    # Handle completion locking if it's a substantive final turn
    if should_complete and intent in ("substantive", "short", "copy_paste"):
        response_msg = f"Thank you for your thorough responses. This concludes the {round_type.upper()} round for the {job_title} position. We appreciate your time today."
        # Scoring metrics
        words_count = len(last_cand_msg.split())
        quality_metadata = {
            "answer_length": words_count,
            "technical_keywords": [],
            "estimated_completeness": 1.0,
            "relevance": 1.0,
            "response_time": 0.0,
            "clarification_requested": False,
            "skip_used": False,
            "warnings": False,
        }
        return {
            "type": "complete",
            "message": response_msg,
            "answer_score": 8,
            "state": "Closing Interview",
            "memory": current_memory,
            "quality_metadata": quality_metadata
        }

    # Intent State Machine
    if intent == "abuse":
        current_memory["abuse_count"] = current_memory.get("abuse_count", 0) + 1
        abuse_c = current_memory["abuse_count"]
        if abuse_c == 1:
            response_msg = "Let's keep this professional. Please focus on the interview questions."
            next_state = "Warning Candidate"
        elif abuse_c == 2:
            response_msg = "This is your final warning. Continued inappropriate behavior will end this interview."
            next_state = "Warning Candidate"
        else:
            response_msg = "Due to repeated unprofessional behavior, we are terminating this interview. Thank you."
            return {
                "type": "complete",
                "message": response_msg,
                "answer_score": 1,
                "state": "Closing Interview",
                "memory": current_memory
            }
    elif intent == "empty":
        response_msg = "It looks like your message was empty. Please provide an answer to continue."
        next_state = "Warning Candidate"
    elif intent == "interruption_recovery":
        last_q = current_memory.get("last_question") or "Could you walk me through your recent technical project?"
        response_msg = f"Welcome back. I have restored your session. Let's continue with the current question: {last_q}"
        next_state = "Asking Question"
    elif intent == "greeting":
        if current_state in ("Greeting", "Waiting for acknowledgement"):
            response_msg = f"Hello! Welcome to your technical interview for the {job_title} role. We will ask you a series of progressive technical questions. Are you ready to begin?"
            next_state = "Waiting for acknowledgement"
        else:
            last_q = current_memory.get("last_question") or "Could you walk me through your recent technical project?"
            response_msg = f"Welcome back. Please keep your answers focused and direct. Let's return to the current question: {last_q}"
            next_state = "Warning Candidate"
    elif intent == "ready":
        if current_state in ("Greeting", "Waiting for acknowledgement"):
            is_substantive_turn = True
            next_state = "Asking Question"
        else:
            last_q = current_memory.get("last_question") or "Could you walk me through your recent technical project?"
            response_msg = f"Great, let's keep going. Here is the question again: {last_q}"
            next_state = "Asking Question"
    elif intent == "repetition":
        last_q = current_memory.get("last_question") or "Could you walk me through your recent technical project?"
        response_msg = f"No problem. Let me repeat the question for you: {last_q}"
        next_state = "Re-asking Question"
    elif intent == "clarification":
        last_q = current_memory.get("last_question") or "Could you walk me through your recent technical project?"
        response_msg = f"To clarify, we are looking for a brief overview of your design decisions, the technologies you used, and any trade-offs you made. Note that I cannot reveal the expected solution. Here is the question again: {last_q}"
        next_state = "Clarifying Answer"
    elif intent == "small_talk":
        last_q = current_memory.get("last_question") or "Could you walk me through your recent technical project?"
        response_msg = f"I'm doing well, thank you. Let's keep the focus on your interview. Here is the current question: {last_q}"
        next_state = "Asking Question"
    elif intent == "thank_you":
        last_q = current_memory.get("last_question") or "Could you walk me through your recent technical project?"
        response_msg = f"You're very welcome. Let's continue with the question: {last_q}"
        next_state = "Asking Question"
    elif intent == "nervous":
        last_q = current_memory.get("last_question") or "Could you walk me through your recent technical project?"
        response_msg = f"It is completely normal to feel a bit nervous! Take your time, there is no rush. Let's tackle this question: {last_q}"
        next_state = "Asking Question"
    elif intent == "dont_know":
        current_memory["does_not_know_count"] = current_memory.get("does_not_know_count", 0) + 1
        if current_memory["does_not_know_count"] == 1:
            response_msg = "No worries at all. Can you tell me about any basic concepts or high-level ideas you might know related to this topic?"
            next_state = "Clarifying Answer"
        else:
            is_substantive_turn = True
            next_state = "Asking Question"
    elif intent == "skip":
        current_memory["skips_used"] = current_memory.get("skips_used", 0) + 1
        if current_memory["skips_used"] == 1:
            is_substantive_turn = True
            next_state = "Asking Question"
            response_msg = "Understood. We will skip this question. "
        else:
            last_q = current_memory.get("last_question") or "Could you walk me through your recent technical project?"
            response_msg = f"We can only allow one skipped question per round. Please try your best to answer this question: {last_q}"
            next_state = "Warning Candidate"
    elif intent == "off_topic":
        last_q = current_memory.get("last_question") or "Could you walk me through your recent technical project?"
        response_msg = f"I am here to conduct your technical interview. Let's stay on track. Here is the question: {last_q}"
        next_state = "Asking Question"
    elif intent == "repeated":
        last_q = current_memory.get("last_question") or "Could you walk me through your previous answers. Please expand or provide a new example for this question: {last_q}"
        response_msg = f"It looks like your response is identical to your previous answer. Please expand or provide a new example for this question: {last_q}"
        next_state = "Warning Candidate"
    elif intent == "short":
        last_q = current_memory.get("last_question") or "Could you walk me through your recent technical project?"
        response_msg = f"That response is a bit too brief. Could you elaborate further and provide some context or details on your approach?"
        next_state = "Clarifying Answer"
    elif intent == "copy_paste":
        metadata_flags["suspected_plagiarism"] = True
        is_substantive_turn = True
        next_state = "Asking Question"
    else:
        is_substantive_turn = True
        next_state = "Asking Question"

    # Calculate answer quality metrics for substantive turns
    words_count = len(last_cand_msg.split())
    matched_kws = []
    req_skills = []
    try:
        profiles = _load_job_profiles()
        matched_profile = _match_job_profile(job_title, profiles)
        req_skills = [s.lower() for s in matched_profile.get("required_skills", [])]
    except Exception:
        pass
    
    for kw in req_skills + ["python", "javascript", "react", "postgres", "docker", "kubernetes", "aws", "celery", "redis"]:
        if re.search(r"\b" + re.escape(kw) + r"\b", last_cand_msg.lower()):
            matched_kws.append(kw)
            
    est_comp = min(1.0, len(matched_kws) * 0.25 + (words_count / 100.0) * 0.5)
    relevance = 1.0 if matched_kws else (0.5 if words_count > 10 else 0.2)
    
    quality_metadata = {
        "answer_length": words_count,
        "technical_keywords": list(set(matched_kws)),
        "estimated_completeness": round(est_comp, 2),
        "relevance": round(relevance, 2),
        "response_time": 0.0,
        "clarification_requested": (intent == "clarification"),
        "skip_used": (intent == "skip"),
        "warnings": (intent in ("abuse", "repeated", "empty")),
    }

    # If it is not a substantive turn, return early warning/reassurance response
    if not is_substantive_turn:
        return {
            "type": "question",
            "message": response_msg,
            "answer_score": ans_score,
            "state": next_state,
            "memory": current_memory,
            "intent": intent,
            "intent_confidence": confidence,
            "quality_metadata": quality_metadata,
            **metadata_flags
        }

    # Otherwise, generate next substantive question
    transcript_text = "\n".join(
        f"{'Interviewer' if t['role'] == 'ai' else 'Candidate'}: {t['message']}"
        for t in transcript
    )

    eval_prompt = f"""You are conducting a {round_type} interview for {job_title}.

Here is the full transcript so far:
{transcript_text}

The candidate just gave their latest answer (the last "Candidate:" entry above).

{"This is exchange #{} out of a maximum of {}. You should wrap up the interview now with a brief closing statement.".format(substantive_count, MAX_EXCHANGES) if should_complete else "Generate your next question based on their answer."}

Return ONLY valid JSON:
{{
  "answer_score": integer 0-10 (how well the candidate answered the last question),
  "type": "{'complete' if should_complete else 'question'}",
  "message": "{'Brief thank you and closing statement' if should_complete else 'Your brief acknowledgment + next question'}"
}}"""

    try:
        try:
            raw = _call_gemini(SYSTEM_PROMPTS.get(round_type, SYSTEM_PROMPTS["interview"]), eval_prompt)
        except Exception:
            client = _client()
            response = client.chat.completions.create(
                model="deepseek-chat",
                messages=[
                    {"role": "system", "content": SYSTEM_PROMPTS.get(round_type, SYSTEM_PROMPTS["interview"])},
                    {"role": "user", "content": eval_prompt},
                ],
                temperature=0.5,
                max_tokens=400,
            )
            raw = response.choices[0].message.content or ""
        result = _extract_json(raw)
        result.setdefault("type", "complete" if should_complete else "question")
        result.setdefault("answer_score", 5)
        result.setdefault("message", "Thank you for your responses. This concludes the round." if should_complete else "Can you tell me more?")
        
        # Save state metadata
        current_memory["last_question"] = result["message"]
        result["state"] = next_state
        result["memory"] = current_memory
        result["quality_metadata"] = quality_metadata
        result["intent"] = intent
        result["intent_confidence"] = confidence
        for k, v in metadata_flags.items():
            result[k] = v
        return result
    except Exception as exc:
        logger.error("Response processing failed, using rule fallback: %s", exc)
        if should_complete:
            return {
                "type": "complete",
                "message": f"Thank you for your thoughtful answers. This concludes our {round_type.upper()} round.",
                "answer_score": 8,
                "state": "Closing Interview",
                "memory": current_memory,
                "quality_metadata": quality_metadata,
                "intent": intent,
                "intent_confidence": confidence,
                **metadata_flags
            }

        # Fallback question selector by round_type
        if round_type == "interview":
            interview_questions = [
                ("Thanks for sharing. Could you walk me through a specific situation where you encountered a conflict or disagreement with a team member, and how you resolved it?", ["situation", "conflict", "disagreement", "team", "resolved", "consensus"]),
                ("Great context. Tell me about a time when a project scope or requirement changed drastically at the last minute. How did you prioritize tasks?", ["scope", "requirement", "changed", "prioritize", "deadline", "sprint"]),
                ("That demonstrates strong adaptability. Have you ever experienced a project failure or production mistake? What happened, and what key lessons did you take away?", ["failure", "mistake", "learned", "retrospective", "improved", "prevention"]),
                ("Appreciate the transparency. How do you approach mentoring junior engineers and fostering an inclusive team culture?", ["mentoring", "code review", "feedback", "culture", "junior", "growth"]),
                ("Looking back at your career so far, what is the single accomplishment you are most proud of, and why does it stand out to you?", ["proud", "accomplishment", "impact", "delivered", "result"])
            ]
            # Use substantive_count to progressive index (starts at 0)
            q_text, exp_kw = interview_questions[min(substantive_count, len(interview_questions) - 1)]
            if response_msg:
                q_text = response_msg + q_text
            current_memory["last_question"] = q_text
            _record_fallback_metric(job_title, round_type, substantive_count)
            return {
                "type": "question",
                "message": q_text,
                "answer_score": 8,
                "expected_keywords": exp_kw,
                "engine": "rule_based",
                "state": next_state,
                "memory": current_memory,
                "quality_metadata": quality_metadata,
                "intent": intent,
                "intent_confidence": confidence,
                **metadata_flags
            }
        elif round_type == "speaking":
            speaking_questions = [
                ("Thank you. Now, describe a difficult technical bug you solved and how you diagnosed it.", ["bug", "diagnosed", "solved", "fixed", "root cause", "debug"]),
                ("Understood. For the next question: explain the concept of recursion to a non-programmer.", ["recursion", "non-programmer", "analogy", "loop", "repeat", "base case"]),
                ("Great explanation. Now, explain REST APIs to a first-year computer science student.", ["rest api", "api", "first-year", "client", "server", "http", "request", "response"]),
                ("Got it. For our final question: convince me why we should use your favorite programming language on our next project.", ["language", "project", "benefit", "use", "convince", "features"])
            ]
            q_idx = max(0, min(substantive_count - 1, len(speaking_questions) - 1))
            q_text, exp_kw = speaking_questions[q_idx]
            if response_msg:
                q_text = response_msg + q_text
            current_memory["last_question"] = q_text
            _record_fallback_metric(job_title, round_type, substantive_count)
            return {
                "type": "question",
                "message": q_text,
                "answer_score": 8,
                "expected_keywords": exp_kw,
                "engine": "rule_based",
                "state": next_state,
                "memory": current_memory,
                "quality_metadata": quality_metadata,
                "intent": intent,
                "intent_confidence": confidence,
                **metadata_flags
            }
        elif round_type == "hr":
            hr_questions = [
                ("Thank you for sharing that. Regarding compensation, what are your expected salary expectations (base + components) for this position?", ["salary", "expected", "base", "compensation", "package", "flexible"]),
                ("Understood. What key motivations are prompting you to explore new opportunities, and what specifically attracts you to HireMind?", ["motivation", "hiremind", "opportunity", "growth", "challenge", "values"]),
                ("That aligns well with our team values. What is your preferred work setup (remote, hybrid, or onsite), and what management style suits you best?", ["remote", "hybrid", "onsite", "management", "autonomy", "environment"]),
                ("Where do you see yourself professionally in the next 3 to 5 years, and what skills or responsibilities do you hope to grow into?", ["years", "growth", "lead", "architect", "skills", "future"]),
                ("Do you have any specific questions for us regarding company culture, team structure, or the hiring process before we wrap up?", ["culture", "team", "process", "questions", "hiremind"])
            ]
            q_text, exp_kw = hr_questions[min(substantive_count, len(hr_questions) - 1)]
            if response_msg:
                q_text = response_msg + q_text
            current_memory["last_question"] = q_text
            _record_fallback_metric(job_title, round_type, substantive_count)
            return {
                "type": "question",
                "message": q_text,
                "answer_score": 8,
                "expected_keywords": exp_kw,
                "engine": "rule_based",
                "state": next_state,
                "memory": current_memory,
                "quality_metadata": quality_metadata,
                "intent": intent,
                "intent_confidence": confidence,
                **metadata_flags
            }
        else:
            # Job-Specific Tech round fallback (progressive questions from JSON)
            profiles = _load_job_profiles()
            matched_profile = _match_job_profile(job_title, profiles)
            questions_dict = matched_profile.get("questions", {})
            
            # Progressive difficulty mapping (Turn index counts start at 0)
            if substantive_count == 0:
                category = "easy"
                q_idx = 0
            elif substantive_count == 1:
                category = "easy"
                q_idx = 1
            elif substantive_count == 2:
                category = "intermediate"
                q_idx = 0
            elif substantive_count == 3:
                category = "intermediate"
                q_idx = 1
            elif substantive_count == 4:
                category = "advanced"
                q_idx = 0
            else:
                category = "advanced"
                q_idx = 1
                
            q_list = questions_dict.get(category, [])
            if not q_list:
                q_list = questions_dict.get("easy", ["Can you explain a challenging technical problem you've solved recently and walk me through your approach?"])
                q_idx = 0
                
            raw_q = q_list[min(q_idx, len(q_list) - 1)]
            
            # Acknowledge candidate's answer and customize question
            ack = ""
            last_msg_lower = (last_cand_msg or "").lower()
            detected_keywords = []
            possible_keywords = matched_profile.get("required_skills", []) + ["image classification", "ml", "api", "database", "scaling", "frontend", "backend", "design"]
            for kw in possible_keywords:
                if re.search(rf"\b{re.escape(kw.lower())}\b", last_msg_lower):
                    detected_keywords.append(kw)
                    
            if len(last_msg_lower.split()) < 10:
                ack = "Thanks for the brief response. "
            elif detected_keywords:
                ack = f"That's a great point regarding your experience with {', '.join(detected_keywords[:2])}. "
            else:
                ack = "Thanks for sharing those details. "
                
            # Customize question based on candidate skills (from resume)
            cand_skills_clean = [s.strip().lower() for s in (candidate_skills or []) if s.strip()]
            req_skills = [s.lower() for s in matched_profile.get("required_skills", [])]
            matched = [s for s in req_skills if s in cand_skills_clean]
            
            custom_q = raw_q
            for s in matched:
                orig_s = next((x for x in matched_profile.get("required_skills", []) if x.lower() == s), s)
                if orig_s in raw_q:
                    custom_q = raw_q.replace(orig_s, f"{orig_s} (which I see is listed in your resume)")
                    break
                    
            q_text = ack + custom_q
            if response_msg:
                q_text = response_msg + q_text
            exp_kw = [s.lower() for s in matched_profile.get("required_skills", [])]
            
            current_memory["last_question"] = q_text
            _record_fallback_metric(job_title, round_type, substantive_count)
            return {
                "type": "question",
                "message": q_text,
                "answer_score": 8,
                "expected_keywords": exp_kw,
                "engine": "rule_based",
                "state": next_state,
                "memory": current_memory,
                "quality_metadata": quality_metadata,
                "intent": intent,
                "intent_confidence": confidence,
                **metadata_flags
            }


# ── Generate round summary ────────────────────────────────────────────────────

# ── Stage-Specific Evaluators & Confidence Scoring ───────────────────────────

def _evaluate_tech(text: str, turn_idx: int, expected_keywords: list[str] | None = None) -> dict:
    clean = (text or "").strip()
    words = clean.split()
    wc = len(words)

    search_kw = expected_keywords if expected_keywords else ["python", "fastapi", "django", "react", "next", "postgres", "sql", "redis", "docker", "kubernetes", "aws", "jwt", "testing"]
    kw_matches = re.findall(r"\b(" + "|".join(search_kw) + r")\b", clean, re.IGNORECASE)
    kw = list(set(k.lower() for k in kw_matches))

    metric_matches = re.findall(r"\b(\d+(?:\.\d+)?(?:%|ms|s|k|m|gb|tb|fps|rps|qps)?)\b", clean, re.IGNORECASE)
    metrics = list(set(metric_matches))[:5]

    score = 5.0
    if wc >= 35:
        score += 2.5
    elif wc >= 15:
        score += 1.5

    score += min(2.5, len(kw) * 0.8)
    if metrics:
        score += 1.0

    score = min(10.0, max(4.0, round(score, 1)))
    confidence = "high" if wc >= 30 and len(kw) >= 2 else ("medium" if wc >= 15 and len(kw) >= 1 else "low")

    return {"turn": turn_idx, "wc": wc, "kw": kw, "metrics": metrics, "score": score, "confidence": confidence}


def _evaluate_behavioral(text: str, turn_idx: int) -> dict:
    clean = (text or "").strip()
    words = clean.split()
    wc = len(words)

    star = []
    if re.search(r"\b(when|project|role|company|client|system|situation)\b", clean, re.IGNORECASE):
        star.append("situation")
    if re.search(r"\b(challenge|goal|objective|issue|deadline|requirement|task)\b", clean, re.IGNORECASE):
        star.append("task")
    if re.search(r"\b(built|designed|implemented|resolved|led|decided|refactored|action)\b", clean, re.IGNORECASE):
        star.append("action")
    if re.search(r"\b(reduced|improved|increased|achieved|delivered|saved|%|result)\b", clean, re.IGNORECASE):
        star.append("result")

    kw_matches = re.findall(r"\b(lead|leadership|conflict|disagreement|resolve|consensus|prioritize|mentor|feedback|accomplishment)\b", clean, re.IGNORECASE)
    kw = list(set(k.lower() for k in kw_matches))

    metric_matches = re.findall(r"\b(\d+(?:\.\d+)?(?:%|ms|s|k|m|gb|tb|fps|rps|qps)?)\b", clean, re.IGNORECASE)
    metrics = list(set(metric_matches))[:5]

    score = 4.5
    if wc >= 35:
        score += 2.0
    elif wc >= 15:
        score += 1.0

    score += len(star) * 0.75
    if metrics:
        score += 0.5

    score = min(10.0, max(4.0, round(score, 1)))
    confidence = "high" if wc >= 30 and len(star) >= 3 else ("medium" if wc >= 15 and len(star) >= 2 else "low")

    return {"turn": turn_idx, "wc": wc, "kw": kw, "metrics": metrics, "star_components": star, "score": score, "confidence": confidence}


def _evaluate_hr(text: str, turn_idx: int) -> dict:
    clean = (text or "").strip()
    words = clean.split()
    wc = len(words)

    kw_matches = re.findall(r"\b(notice|joining|available|immediate|salary|compensation|expected|package|remote|hybrid|onsite|growth|career)\b", clean, re.IGNORECASE)
    kw = list(set(k.lower() for k in kw_matches))

    metric_matches = re.findall(r"\b(\d+(?:\.\d+)?(?:%|ms|s|k|m|gb|tb|fps|rps|qps|usd|inr|lpa)?)\b", clean, re.IGNORECASE)
    metrics = list(set(metric_matches))[:5]

    score = 5.5
    if wc >= 25:
        score += 2.0
    elif wc >= 12:
        score += 1.0

    score += min(2.0, len(kw) * 0.7)
    if metrics:
        score += 0.5

    score = min(10.0, max(4.0, round(score, 1)))
    confidence = "high" if wc >= 25 and len(metrics) >= 1 else ("medium" if wc >= 12 else "low")

    return {"turn": turn_idx, "wc": wc, "kw": kw, "metrics": metrics, "score": score, "confidence": confidence}


def _evaluate_speaking(text: str, turn_idx: int, speaking_metrics: dict | None = None) -> dict:
    clean = (text or "").strip()
    words = clean.split()
    wc = len(words)

    # 1. Fallback / Keyboard usage flag
    metrics_obj = speaking_metrics or {}
    mic_fallback = metrics_obj.get("microphone_fallback", False)

    # 2. Filler words count
    # uh, um, like, so, you know
    filler_patterns = [r"\buh\b", r"\bum\b", r"\blike\b", r"\bso\b", r"\byou\s+know\b"]
    fillers_count = 0
    for pat in filler_patterns:
        fillers_count += len(re.findall(pat, clean, re.IGNORECASE))

    # 3. Audio duration & Words per minute (Pace)
    audio_duration = metrics_obj.get("audio_duration", 0)
    if not audio_duration and not mic_fallback:
        # Estimate duration based on word count (avg speaking rate is 130 words per minute ~ 2.16 words/sec)
        audio_duration = max(5, int(wc / 2.16)) if wc > 0 else 0

    wpm = metrics_obj.get("words_per_minute", 0)
    if not wpm and audio_duration > 0 and not mic_fallback:
        wpm = int(wc / (audio_duration / 60.0))

    # 4. Pace score (out of 100)
    # Ideal speaking pace is 110-150 words per minute
    if mic_fallback:
        pace_score = 0
    else:
        if wpm == 0:
            pace_score = 80 # Default
        elif 110 <= wpm <= 150:
            pace_score = 100
        else:
            # Degrade score gracefully
            pace_score = max(50, 100 - int(abs(wpm - 130) * 0.8))

    # 5. Conciseness score (out of 100)
    # Deduct 3 points for each filler word. Higher penalty if too wordy (>140 words) or too brief (<15 words).
    base_conciseness = 95
    if wc < 15:
        base_conciseness -= 20
    elif wc > 140:
        base_conciseness -= min(30, int((wc - 140) * 0.5))
    
    conciseness_score = max(40, base_conciseness - (fillers_count * 3))

    # 6. Structure score (out of 100)
    # Look for transitional / structuring terms
    transitions = [r"\bfirstly\b", r"\bsecondly\b", r"\bfinally\b", r"\bhowever\b", 
                   r"\btherefore\b", r"\bbecause\b", r"\bconsequently\b", r"\bfor example\b",
                   r"\bsuch as\b", r"\bto summarize\b", r"\bfirst\b", r"\bthen\b", r"\bnext\b"]
    trans_count = 0
    for t in transitions:
        trans_count += len(re.findall(t, clean, re.IGNORECASE))
    
    base_structure = 75
    if trans_count >= 3:
        base_structure += 20
    elif trans_count >= 1:
        base_structure += 10
    
    # Cap sentence layout check
    sentences = [s for s in clean.split(".") if s.strip()]
    if len(sentences) >= 3:
        base_structure += 5
        
    structure_score = min(100, max(50, base_structure))

    # 7. Confidence score (out of 100)
    # Lower fillers, good pace, stable response length indicate higher confidence
    base_confidence = 88
    # Deduct for fillers
    base_confidence -= min(30, fillers_count * 4)
    # Deduct if pace is too fast or too slow
    if not mic_fallback and wpm > 0:
        if wpm < 100:
            base_confidence -= min(20, int((100 - wpm) * 0.5))
        elif wpm > 160:
            base_confidence -= min(20, int((wpm - 160) * 0.5))
    
    confidence_score = max(40, base_confidence)

    # 8. Vocabulary score (out of 100)
    # Measure unique words and longer words
    unique_words = len(set(words))
    long_words = sum(1 for w in words if len(w) > 6)
    
    base_vocab = 70
    if unique_words >= 30:
        base_vocab += 15
    elif unique_words >= 15:
        base_vocab += 8
        
    if long_words >= 10:
        base_vocab += 15
    elif long_words >= 5:
        base_vocab += 8
        
    vocabulary_score = min(100, max(50, base_vocab))

    # Overall Turn communication score (scaled out of 10)
    active_scores = [confidence_score, structure_score, conciseness_score, vocabulary_score]
    if not mic_fallback:
        active_scores.append(pace_score)
    turn_score = round(sum(active_scores) / len(active_scores) / 10.0, 1)

    return {
        "turn": turn_idx,
        "wc": wc,
        "fillers_count": fillers_count,
        "audio_duration": audio_duration,
        "words_per_minute": wpm,
        "microphone_fallback": mic_fallback,
        "confidence_score": confidence_score,
        "structure_score": structure_score,
        "conciseness_score": conciseness_score,
        "pace_score": pace_score,
        "vocabulary_score": vocabulary_score,
        "score": turn_score,
        "confidence": "high" if turn_score >= 8.0 else ("medium" if turn_score >= 6.0 else "low")
    }


SKILL_PROBE_TEMPLATES = {
    "react": "Could you walk me through the lifecycle of a React component or how the reconciliation algorithm handles rendering updates?",
    "redux": "How do you manage complex side effects in Redux, and what are the trade-offs of using Redux Toolkit vs Context API?",
    "typescript": "How does TypeScript's structural typing system differ from nominal typing, and how do you use conditional or mapped types?",
    "python": "Can you explain Python's Global Interpreter Lock (GIL) and how it impacts CPU-bound vs IO-bound multi-threading?",
    "fastapi": "How do you handle dependency injection and async database connections in FastAPI for high-throughput endpoints?",
    "django": "Explain Django's middleware architecture and how you optimize database queries using select_related vs prefetch_related.",
    "docker": "How do you optimize Docker build layers and cache sizes for production images, and what are multi-stage builds?",
    "kubernetes": "How do you structure ingress resources, network policies, and persistent volumes in a Kubernetes cluster?",
    "aws": "How do you structure an AWS VPC network with private subnets, NAT gateways, and load balancers for secure hosting?",
    "postgres": "How do you analyze slow database queries in PostgreSQL using EXPLAIN ANALYZE, and how do composite indexes work?",
    "mongodb": "What are the trade-offs of document design in MongoDB vs traditional SQL normalizations, especially regarding replication?",
    "redis": "How do you implement cache eviction policies (like LRU) and distributed locking patterns in Redis?",
}


def _get_probe_questions(unverified_skills: list[str]) -> list[str]:
    probes = []
    for skill in unverified_skills:
        skill_lower = skill.lower().strip()
        if skill_lower in SKILL_PROBE_TEMPLATES:
            probes.append(SKILL_PROBE_TEMPLATES[skill_lower])
        else:
            probes.append(f"You claimed experience with '{skill}' on your resume. Can you describe a specific production issue or architecture challenge you solved using this technology?")
    
    # Backfill if we have fewer than 5 questions
    fallbacks = [
        "Can you walk me through the scaling strategies you would apply to handle a 10x traffic spike in your past project?",
        "How do you typically structure automated testing (unit/integration) for complex distributed systems?",
        "Describe a time you had a technical disagreement with a peer or stakeholder. How did you resolve it?",
        "What strategies do you use to ensure zero-downtime database schema updates or migrations in production?",
        "How do you keep your technical skills up to date, and what is a new technology you've researched recently?"
    ]
    
    while len(probes) < 5 and fallbacks:
        fb = fallbacks.pop(0)
        if fb not in probes:
            probes.append(fb)
            
    return probes[:5]


def _build_rule_summary(transcript: list[dict], round_type: str, job_title: str, candidate_skills: list[str] = None) -> dict:
    candidate_turns = [t for t in transcript if t.get("role") == "candidate"]
    candidate_answers = [t.get("message", "") for t in candidate_turns]
    
    compact_turns = []
    for idx, t in enumerate(candidate_turns):
        ans = t.get("message", "")
        if round_type == "interview":
            compact_turns.append(_evaluate_behavioral(ans, idx + 1))
        elif round_type == "hr":
            compact_turns.append(_evaluate_hr(ans, idx + 1))
        elif round_type == "speaking":
            compact_turns.append(_evaluate_speaking(ans, idx + 1, t.get("speaking_metrics")))
        else:
            compact_turns.append(_evaluate_tech(ans, idx + 1))

    all_text = " ".join(candidate_answers).lower()

    detected = []
    if round_type == "interview":
        if re.search(r"\b(lead|leadership|initiative|owner)\b", all_text, re.IGNORECASE):
            detected.append("Leadership & Initiative")
        if re.search(r"\b(conflict|disagreement|align|resolve)\b", all_text, re.IGNORECASE):
            detected.append("Conflict Resolution & Team Alignment")
        if re.search(r"\b(agile|sprint|deadline|priorit)\b", all_text, re.IGNORECASE):
            detected.append("Agile Execution & Task Prioritization")
    elif round_type == "hr":
        if re.search(r"\b(notice|joining|available|immediate)\b", all_text, re.IGNORECASE):
            detected.append("Clear Availability & Notice Period")
        if re.search(r"\b(salary|compensation|expected|package)\b", all_text, re.IGNORECASE):
            detected.append("Transparent Salary Expectations")
        if re.search(r"\b(remote|hybrid|onsite|flexible)\b", all_text, re.IGNORECASE):
            detected.append("Work Environment Compatibility")
    elif round_type == "speaking":
        if re.search(r"\b(firstly|secondly|finally|however|therefore|because)\b", all_text, re.IGNORECASE):
            detected.append("Structured Oral Reasoning")
        if all_text.count("uh") + all_text.count("um") <= 3:
            detected.append("Fluent & Confident Delivery")
        if len(words_count := all_text.split()) > 60:
            detected.append("Elaborative Verbal Presentation")
    else:
        if re.search(r"\b(python|fastapi|django|flask|backend|api)\b", all_text, re.IGNORECASE):
            detected.append("Backend API Architecture")
        if re.search(r"\b(react|next|vue|frontend|ui|typescript)\b", all_text, re.IGNORECASE):
            detected.append("Frontend & React Systems")
        if re.search(r"\b(sql|postgres|database|mongodb|redis|cache)\b", all_text, re.IGNORECASE):
            detected.append("Database & Data Layer Optimization")

    scores = [t["score"] for t in compact_turns]
    avg_score = sum(scores) / len(scores) if scores else 7.5
    computed_score = min(98, max(65, int(round(avg_score * 10))))

    high_conf = sum(1 for t in compact_turns if t["confidence"] == "high")
    overall_conf = "high" if high_conf >= (len(compact_turns) // 2 + 1) else "medium"

    # Calculate Resume Integrity Verification Score
    verified_skills = []
    unverified_skills = []
    clean_skills = [s.strip() for s in (candidate_skills or []) if s.strip()]
    
    for skill in clean_skills:
        escaped_skill = re.escape(skill)
        if re.search(rf"\b{escaped_skill}\b", all_text, re.IGNORECASE):
            verified_skills.append(skill)
        else:
            unverified_skills.append(skill)
            
    integrity_score = 100
    if clean_skills:
        integrity_score = int(round((len(verified_skills) / len(clean_skills)) * 100))
        
    probe_questions = _get_probe_questions(unverified_skills)

    round_name_map = {"tech": "Technical Architecture", "interview": "Behavioral STAR Competency", "speaking": "Speaking & Communication", "hr": "HR & Cultural Fit"}
    round_label = round_name_map.get(round_type, "General Interview")

    assessment = f"Candidate completed the {round_label} round for {job_title or 'the role'}. Evaluated score: {computed_score}/100 (Confidence: {overall_conf.upper()}). Resume integrity: {integrity_score}% verified alignment. Demonstrated competencies: {', '.join(detected) if detected else 'role readiness'}."

    strengths = [f"Strong capability in {d}" for d in detected] if detected else ["Clear communication of concepts", "Structured problem-solving approach"]
    concerns = []
    if integrity_score < 50:
        concerns.append(f"Resume claims skills ({', '.join(unverified_skills)}) that were not demonstrated during the interview.")

    # Check for copy-paste concerns
    from app.services.plagiarism_detector import analyze_similarity
    for idx, ans in enumerate(candidate_answers, 1):
        prevs = candidate_answers[:idx-1]
        sim_res = analyze_similarity(ans, prevs)
        if sim_res.get("suspected_copy_paste"):
            reasons_str = f" ({', '.join(sim_res['reasons'])})" if sim_res.get("reasons") else ""
            concerns.append(f"⚠️ Suspected Copy-Paste: Turn {idx} showed high similarity/structural risk{reasons_str}.")

    # Speaking round scorecard calculation
    speaking_eval = None
    if round_type == "speaking":
        total_turns = len(compact_turns)
        avg_confidence = int(sum(t["confidence_score"] for t in compact_turns) / total_turns) if total_turns else 80
        avg_structure = int(sum(t["structure_score"] for t in compact_turns) / total_turns) if total_turns else 80
        avg_conciseness = int(sum(t["conciseness_score"] for t in compact_turns) / total_turns) if total_turns else 80
        avg_pace = int(sum(t["pace_score"] for t in compact_turns) / total_turns) if total_turns else 80
        avg_vocabulary = int(sum(t["vocabulary_score"] for t in compact_turns) / total_turns) if total_turns else 80
        total_fillers = sum(t["fillers_count"] for t in compact_turns)
        avg_len = round(sum(t["audio_duration"] for t in compact_turns) / total_turns, 1) if total_turns else 0.0
        
        speaking_eval = {
            "confidence": avg_confidence,
            "structure": avg_structure,
            "conciseness": avg_conciseness,
            "pace": avg_pace,
            "vocabulary": avg_vocabulary,
            "fillers": total_fillers,
            "avg_answer_length": avg_len
        }

    rule_eval = {
        "version": 1,
        "engine": "rule_based",
        "model": "Rule-Based Engine v1.0",
        "prompt_version": "N/A",
        "ai_score": computed_score,
        "ai_summary": f"[PROVISIONAL] {assessment}",
        "strengths": strengths[:4],
        "concerns": concerns + ["Fallback Observations: Interview was completed in offline mode. Reprocessing is pending."],
        "evaluated_at": datetime.now(timezone.utc).isoformat()
    }
    if speaking_eval:
        rule_eval["speaking_eval"] = speaking_eval

    ret_val = {
        "ai_score": computed_score,
        "confidence": overall_conf,
        "ai_summary": f"[PROVISIONAL] {assessment}",
        "strengths": strengths[:4],
        "concerns": concerns + ["Fallback Observations: Interview was completed in offline mode. Reprocessing is pending."],
        "resume_integrity_score": integrity_score,
        "probe_questions": probe_questions,
        "needs_recalculation": True,
        "eval_mode": "rule_engine",
        "engine": "rule_based",
        "evaluation_status": "pending_ai_review",
        "evaluation_engine": "rule_based",
        "evaluation_model": "Rule-Based Engine v1.0",
        "evaluation_version": 1,
        "requires_ai_reprocessing": True,
        "ai_review_completed": False,
        "compact_offline_data": {
            "evaluated_at": datetime.now(timezone.utc).isoformat(),
            "turns": compact_turns,
            "total_words": sum(t["wc"] for t in compact_turns),
            "detected_skills": detected,
            "rule_score": computed_score,
            "confidence": overall_conf,
            "resume_integrity_score": integrity_score,
            "probe_questions": probe_questions,
            "needs_recalculation": True,
            "engine": "rule_based",
            "evaluation_history": [rule_eval]
        }
    }
    if speaking_eval:
        ret_val["speaking_eval"] = speaking_eval
        ret_val["compact_offline_data"]["speaking_eval"] = speaking_eval
        
    return ret_val


async def generate_round_summary(
    round_type: str,
    transcript: list[dict],
    job_title: str,
    candidate_skills: list[str] = None
) -> dict[str, Any]:
    """
    After a round completes, generate the overall evaluation.

    Returns: {ai_score, ai_summary, strengths[], concerns[]}
    """
    candidate_answers = [t["message"] for t in transcript if t.get("role") == "candidate"]
    rule_result = _build_rule_summary(transcript, round_type, job_title, candidate_skills)

    transcript_text = "\n".join(
        f"{'Interviewer' if t['role'] == 'ai' else 'Candidate'}: {t['message']}"
        for t in transcript
    )

    summary_prompt = f"""You just completed a {round_type} interview for a {job_title} position.

Full transcript:
{transcript_text}

Provide a comprehensive evaluation. Return ONLY valid JSON:
{{
  "ai_score": integer 0-100 (overall performance in this round),
  "ai_summary": "2-3 sentence overall assessment for the hiring manager",
  "strengths": ["strength 1", "strength 2", "strength 3"],
  "concerns": ["concern 1", "concern 2"]
}}"""

    model_used = "Gemini 1.5 Flash"
    try:
        try:
            raw = _call_gemini("You are a senior interviewer writing an evaluation report. Return only valid JSON.", summary_prompt)
        except Exception:
            model_used = "DeepSeek-V3"
            client = _client()
            response = client.chat.completions.create(
                model="deepseek-chat",
                messages=[
                    {"role": "system", "content": "You are a senior interviewer writing an evaluation report. Return only valid JSON."},
                    {"role": "user", "content": summary_prompt},
                ],
                temperature=0.3,
                max_tokens=600,
            )
            raw = response.choices[0].message.content or ""
        result = _extract_json(raw)
        result.setdefault("ai_score", rule_result["ai_score"])
        result.setdefault("ai_summary", rule_result["ai_summary"])
        result.setdefault("strengths", rule_result["strengths"])
        result.setdefault("concerns", [])
        
        # Merge integrity scores and probes dynamically
        result["resume_integrity_score"] = rule_result["resume_integrity_score"]
        result["probe_questions"] = rule_result["probe_questions"]
        if "speaking_eval" in rule_result:
            result["speaking_eval"] = rule_result["speaking_eval"]
        result["needs_recalculation"] = False
        result["eval_mode"] = "llm"
        result["engine"] = "llm"

        # Verification fields
        result["evaluation_status"] = "verified"
        result["evaluation_engine"] = "llm"
        result["evaluation_model"] = model_used
        result["evaluation_version"] = 2
        result["requires_ai_reprocessing"] = False
        result["ai_review_completed"] = True
        result["reviewed_at"] = datetime.now(timezone.utc).isoformat()
        
        # Sync compact data
        rule_result["compact_offline_data"]["resume_integrity_score"] = rule_result["resume_integrity_score"]
        rule_result["compact_offline_data"]["probe_questions"] = rule_result["probe_questions"]
        
        # Append history entry
        llm_eval = {
            "version": 2,
            "engine": "llm",
            "model": model_used,
            "prompt_version": "v1.0",
            "ai_score": result["ai_score"],
            "ai_summary": result["ai_summary"],
            "strengths": result["strengths"],
            "concerns": result["concerns"],
            "evaluated_at": datetime.now(timezone.utc).isoformat()
        }
        history = rule_result["compact_offline_data"].get("evaluation_history") or []
        # If there's no rule-based provisional evaluation in history, seed it
        if not history:
            rule_eval = {
                "version": 1,
                "engine": "rule_based",
                "model": "Rule-Based Engine v1.0",
                "prompt_version": "N/A",
                "ai_score": rule_result["ai_score"],
                "ai_summary": rule_result["ai_summary"],
                "strengths": rule_result["strengths"],
                "concerns": rule_result["concerns"],
                "evaluated_at": datetime.now(timezone.utc).isoformat()
            }
            history.append(rule_eval)
        # Avoid duplicate LLM entries (idempotency)
        if not any(h.get("version") == 2 for h in history):
            history.append(llm_eval)
        rule_result["compact_offline_data"]["evaluation_history"] = history
        result["compact_offline_data"] = rule_result["compact_offline_data"]
        return result
    except Exception as exc:
        logger.error("LLM summary generation failed, using rule engine: %s", exc)
        return rule_result
