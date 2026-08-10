"""
Recruiter Copilot Router – /api/recruiter-copilot

Exposes endpoints for the Layered Recruiter AI Copilot Assistant:
- POST /api/recruiter-copilot/chat
- GET  /api/recruiter-copilot/daily-brief
"""
from __future__ import annotations

import re
import json
import logging
from typing import Annotated, Any

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from app.auth import get_current_user
from app.schemas.users import CurrentUser
from app.services.ai_interviews import _call_gemini
from app.services.copilot_skills import (
    compare_candidates,
    daily_recruiter_brief,
    draft_candidate_email,
    explain_ranking,
    find_risk_candidates,
    get_top_candidates,
    pipeline_health,
    recommend_interview_questions,
)
from app.services.knowledge import route_knowledge_query
from app.services.universal_search import execute_universal_search

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/recruiter-copilot", tags=["Recruiter Copilot"])

CurrentUserDep = Annotated[CurrentUser, Depends(get_current_user)]


# ── Models ────────────────────────────────────────────────────────────────────

class ChatMessage(BaseModel):
    role: str
    content: str


class PageContext(BaseModel):
    active_tab: str | None = "dashboard"
    current_candidate_id: str | None = None
    current_candidate_name: str | None = None
    active_job_id: str | None = None


class CopilotRequest(BaseModel):
    message: str
    history: list[ChatMessage] | None = None
    context_filters: dict[str, Any] | None = None
    page_context: PageContext | None = None


# ── Helper: JSON Extractor ─────────────────────────────────────────────────────

def extract_json(raw: str) -> dict:
    cleaned = re.sub(r"```(?:json)?", "", raw).replace("```", "").strip()
    try:
        return json.loads(cleaned)
    except Exception:
        match = re.search(r"\{.*\}", cleaned, re.DOTALL)
        if match:
            return json.loads(match.group(0))
    raise ValueError("Could not parse JSON")


# ── Helper: Intent Classifier Fallback ────────────────────────────────────────

def classify_recruiter_intent(query: str, page_ctx: PageContext | None = None) -> tuple[str, dict[str, Any]]:
    text = query.lower().strip()
    params: dict[str, Any] = {}

    if page_ctx and page_ctx.current_candidate_name:
        current_name = page_ctx.current_candidate_name
        if re.search(r"\b(she|her|he|him|this candidate|selected candidate)\b", text):
            params["resolved_candidate_name"] = current_name

    if re.search(r"\b(hi|hello|hey|good morning|good afternoon|greetings)\b", text):
        return "GREETING", params

    if re.search(r"\b(delete candidate|remove candidate|drop candidate)\b", text):
        return "DELETE_CANDIDATE", params

    if re.search(r"\b(delete job|remove job|close job|archive job)\b", text):
        return "DELETE_JOB", params

    if re.search(r"\b(add candidate|create candidate|new candidate)\b", text):
        return "ADD_CANDIDATE", params

    if re.search(r"\b(create job|add job|post job|new job)\b", text):
        return "CREATE_JOB", params

    if re.search(r"\b(shortlist|accept candidate)\b", text):
        return "SHORTLIST_CANDIDATE", params

    if re.search(r"\b(reject|disqualify)\b", text):
        return "REJECT_CANDIDATE", params

    if re.search(r"\b(schedule|interview time|book interview)\b", text):
        return "SCHEDULE_INTERVIEW", params

    if re.search(r"\b(brief|morning|summary|today'?s|overview|priorities|what should i do)\b", text):
        return "DAILY_BRIEF", params

    if re.search(r"\b(compare|versus|vs|difference|side by side)\b", text):
        names = re.findall(r"\b([a-zA-Z]{3,15})\b", query)
        names = [n for n in names if n.lower() not in {"compare", "versus", "and", "show", "with", "between", "her", "him"}]
        if params.get("resolved_candidate_name") and len(names) < 2:
            names.append(params["resolved_candidate_name"])
        params["candidates"] = list(set(names)) if names else ["Priya", "Aisha"]
        return "COMPARE_CANDIDATES", params

    if re.search(r"\b(why|explain|reason|ranking|rank|rejected|accepted)\b", text):
        params["candidate"] = params.get("resolved_candidate_name", "Priya Sharma")
        return "EXPLAIN_RANKING", params

    if re.search(r"\b(risk|flagged|plagiarism|anomaly|copy|cheat)\b", text):
        return "RISK_ANOMALIES", params

    if re.search(r"\b(funnel|pipeline|health|drop|drop-off|conversion)\b", text):
        return "PIPELINE_HEALTH", params

    if re.search(r"\b(question|ask|interview questions|recommend questions)\b", text):
        return "RECOMMEND_QUESTIONS", params

    if re.search(r"\b(email|draft|write email|invite|send message)\b", text):
        params["candidate"] = params.get("resolved_candidate_name", "Priya Sharma")
        return "DRAFT_EMAIL", params

    return "UNIVERSAL_SEARCH", params


def classify_intent_with_llm(query: str, history: list[ChatMessage], page_ctx: PageContext | None) -> dict:
    system_prompt = (
        "You are the HireMind AI Recruiter Copilot intent classification engine.\n"
        "Analyze the user's query, history, and page context. Identify the intent and extract relevant parameters.\n"
        "Allowed Intents:\n"
        "- CREATE_JOB: User wants to create a new job role.\n"
        "- DELETE_JOB: User wants to delete, close, or remove a job role.\n"
        "- ADD_CANDIDATE: User wants to add/create a new candidate.\n"
        "- DELETE_CANDIDATE: User wants to delete or remove a candidate profile.\n"
        "- REJECT_CANDIDATE: User wants to reject or disqualify a candidate.\n"
        "- SHORTLIST_CANDIDATE: User wants to shortlist or advance a candidate.\n"
        "- SCHEDULE_INTERVIEW: User wants to schedule an interview round.\n"
        "- COMPARE_CANDIDATES: User wants to compare applicants side-by-side.\n"
        "- RISK_ANOMALIES: User asks about flagged candidates or integrity warnings.\n"
        "- PIPELINE_HEALTH: User asks about stage conversions or pipeline metrics.\n"
        "- DAILY_BRIEF: User asks for morning priorities/statistics.\n"
        "- KNOWLEDGE_GUIDE: User asks how to use the platform.\n"
        "- KNOWLEDGE_POLICY: User asks about platform policies/rules.\n"
        "- GREETING: Standard chat welcome.\n"
        "- OFF_TOPIC: Unrelated queries.\n\n"
        "For CREATE_JOB, required parameters: ['title', 'department', 'location']. If missing, list in 'missing_parameters'.\n"
        "For ADD_CANDIDATE, required parameters: ['candidate_name', 'email']. If missing, list in 'missing_parameters'.\n"
        "For DELETE_CANDIDATE, required parameter: ['candidate_name']. If missing, list in 'missing_parameters'.\n"
        "For DELETE_JOB, required parameter: ['job_title']. If missing, list in 'missing_parameters'.\n"
        "For REJECT_CANDIDATE / SHORTLIST_CANDIDATE, required parameter: ['candidate_name']. If missing, list in 'missing_parameters'.\n"
        "For SCHEDULE_INTERVIEW, required parameters: ['candidate_name', 'interview_time']. If missing, list in 'missing_parameters'.\n\n"
        "Return ONLY a raw JSON block matching this exact structure:\n"
        "{\n"
        "  \"intent\": \"INTENT_NAME\",\n"
        "  \"parameters\": {\n"
        "     \"title\": \"extracted job title or null\",\n"
        "     \"job_title\": \"extracted job title or null\",\n"
        "     \"location\": \"extracted job location or null\",\n"
        "     \"department\": \"extracted job department or null\",\n"
        "     \"candidate_name\": \"extracted candidate name or null\",\n"
        "     \"email\": \"extracted candidate email or null\",\n"
        "     \"interview_time\": \"extracted time or null\"\n"
        "  },\n"
        "  \"missing_parameters\": []\n"
        "}"
    )

    history_str = "\n".join([f"{h.role}: {h.content}" for h in history[-5:]]) if history else ""
    ctx_str = f"Active Tab: {page_ctx.active_tab if page_ctx else ''}, Candidate ID: {page_ctx.current_candidate_id if page_ctx else ''}, Candidate Name: {page_ctx.current_candidate_name if page_ctx else ''}"
    user_prompt = f"Page Context: {ctx_str}\nChat History:\n{history_str}\nUser Question: '{query}'"

    try:
        raw_res = _call_gemini(system_prompt, user_prompt)
        parsed = extract_json(raw_res)
        return parsed
    except Exception as e:
        logger.error("LLM intent classification failed, falling back to regex: %s", e)
        intent, params = classify_recruiter_intent(query, page_ctx)
        return {
            "intent": intent,
            "parameters": {
                "title": params.get("title"),
                "job_title": params.get("title"),
                "location": params.get("location"),
                "department": params.get("department"),
                "candidate_name": params.get("resolved_candidate_name") or (page_ctx.current_candidate_name if page_ctx else None),
                "email": None,
                "interview_time": None
            },
            "missing_parameters": []
        }


# ── Routes ────────────────────────────────────────────────────────────────────

@router.get("/daily-brief")
async def get_daily_brief():
    return daily_recruiter_brief()


@router.post("/chat")
async def chat_copilot(req: CopilotRequest):
    query = req.message.strip()
    if not query:
        raise HTTPException(status_code=400, detail="Message cannot be empty.")

    llm_payload = classify_intent_with_llm(query, req.history or [], req.page_context)
    intent = llm_payload.get("intent", "UNIVERSAL_SEARCH")
    params = llm_payload.get("parameters", {})
    missing_params = llm_payload.get("missing_parameters", [])

    ctx_filters = req.context_filters or {}
    ctx_filters.update(params)

    data_payload: dict[str, Any] = {}
    follow_up_chips: list[str] = []
    action_buttons: list[dict[str, str]] = []
    sources: list[str] = ["candidates", "applications", "jobs"]
    confidence_score = 98
    confidence_reason = "Based on live database records"
    metadata_badge: dict[str, str] | None = None
    action_proposal: dict[str, Any] | None = None

    # Handle missing parameter prompt
    if missing_params:
        missing_fields = ", ".join(missing_params).upper()
        formatted_explanation = (
            f"I can help you execute that action, but I need a few more details. "
            f"Please specify the missing information: **{missing_fields}**."
        )
        return {
            "message": formatted_explanation,
            "intent": intent,
            "skill_data": {},
            "follow_up_chips": [f"Provide parameters for {intent.lower().replace('_', ' ')}"],
            "action_buttons": [],
            "confidence_score": 100,
            "confidence_reason": "Slot-filling prompting",
            "sources": ["copilot_memory"],
        }

    # Intent Routing
    if intent == "GREETING":
        formatted_explanation = (
            "**Hello! I am your HireMind AI Recruiter Copilot.** 👋\n\n"
            "I can create or delete candidates, post or delete jobs, schedule interviews, shortlist applicants, "
            "and answer queries about your hiring pipeline. What task would you like to perform?"
        )
        follow_up_chips = ["+ Add New Candidate", "+ Post New Job", "❌ Delete Candidate", "⭐ Top Candidates"]
        action_buttons = [
            {"label": "Show Priorities", "action": "trigger_brief"},
            {"label": "Review Candidates", "action": "open_tab", "target_tab": "candidates"},
        ]
        return {
            "message": formatted_explanation,
            "intent": intent,
            "skill_data": {},
            "follow_up_chips": follow_up_chips,
            "action_buttons": action_buttons,
            "confidence_score": 100,
            "confidence_reason": "Assistant Greeting",
            "sources": ["platform_copilot"],
        }

    elif intent == "CREATE_JOB":
        action_proposal = {
            "tool": "CREATE_JOB",
            "parameters": {
                "title": params.get("title") or "Senior Software Engineer",
                "department": params.get("department", "Engineering"),
                "location": params.get("location", "Remote"),
                "status": "active",
                "priority": "medium",
                "description": f"AI Drafted role definition for {params.get('title')} in {params.get('department')}."
            },
            "status": "pending_approval"
        }
        formatted_explanation = (
            f"I have prepared the requisition for **{params.get('title')}**. "
            f"Please approve or cancel the action to commit this job role."
        )

    elif intent == "DELETE_JOB":
        action_proposal = {
            "tool": "DELETE_JOB",
            "parameters": {
                "job_title": params.get("job_title") or params.get("title") or "Software Engineer",
                "job_id": req.page_context.active_job_id if req.page_context else "1"
            },
            "status": "pending_approval"
        }
        formatted_explanation = (
            f"**CONFIRMATION REQUIRED**: You requested to delete the job role **{params.get('job_title') or 'selected job'}**. "
            f"This action is destructive. Please confirm to execute."
        )

    elif intent == "ADD_CANDIDATE":
        c_name = params.get("candidate_name") or "New Applicant"
        c_email = params.get("email") or f"{c_name.lower().replace(' ', '.')}@example.com"
        action_proposal = {
            "tool": "ADD_CANDIDATE",
            "parameters": {
                "name": c_name,
                "email": c_email,
                "phone": "+1-555-0199",
                "job_title": params.get("title") or "Senior Developer"
            },
            "status": "pending_approval"
        }
        formatted_explanation = (
            f"I have gathered the candidate profile details for **{c_name}** ({c_email}). "
            f"Please approve to add this candidate to your talent pipeline."
        )

    elif intent == "DELETE_CANDIDATE":
        cand_name = params.get("candidate_name") or (req.page_context.current_candidate_name if req.page_context else "Priya Sharma")
        action_proposal = {
            "tool": "DELETE_CANDIDATE",
            "parameters": {
                "candidate_name": cand_name,
                "candidate_id": (req.page_context.current_candidate_id if req.page_context else "c1")
            },
            "status": "pending_approval"
        }
        formatted_explanation = (
            f"**DESTRUCTIVE ACTION WARNING**: You requested to delete candidate **{cand_name}** and all associated applications. "
            f"Please approve or cancel this requisition."
        )

    elif intent == "REJECT_CANDIDATE":
        cand_name = params.get("candidate_name") or (req.page_context.current_candidate_name if req.page_context else "Priya Sharma")
        action_proposal = {
            "tool": "REJECT_CANDIDATE",
            "parameters": {
                "candidate_name": cand_name,
                "stage": "rejected"
            },
            "status": "pending_approval"
        }
        formatted_explanation = f"I have drafted a stage update to **REJECT** {cand_name}. Please approve to execute."

    elif intent == "SHORTLIST_CANDIDATE":
        cand_name = params.get("candidate_name") or (req.page_context.current_candidate_name if req.page_context else "Priya Sharma")
        action_proposal = {
            "tool": "SHORTLIST_CANDIDATE",
            "parameters": {
                "candidate_name": cand_name,
                "stage": "shortlisted"
            },
            "status": "pending_approval"
        }
        formatted_explanation = f"I have drafted a stage update to **SHORTLIST** {cand_name}. Please approve to execute."

    elif intent == "SCHEDULE_INTERVIEW":
        cand_name = params.get("candidate_name") or (req.page_context.current_candidate_name if req.page_context else "Priya Sharma")
        action_proposal = {
            "tool": "SCHEDULE_INTERVIEW",
            "parameters": {
                "candidate_name": cand_name,
                "interview_time": params.get("interview_time", "Tomorrow at 10:00 AM")
            },
            "status": "pending_approval"
        }
        formatted_explanation = f"I have prepared an interview invitation for **{cand_name}**. Please approve to issue the schedule."

    elif intent in ("KNOWLEDGE_GUIDE", "KNOWLEDGE_POLICY"):
        topic_key = params.get("topic_key", "add_candidate")
        know_res = route_knowledge_query(topic_key)
        data_payload = know_res["payload"]
        metadata_badge = know_res["metadata"]
        guide_title = data_payload.get("title", data_payload.get("policy_name", "Platform Guidance"))
        steps_or_rules = data_payload.get("steps") or data_payload.get("summary")
        body_text = "\n".join(steps_or_rules) if isinstance(steps_or_rules, list) else f"• **Summary**: {steps_or_rules}"
        formatted_explanation = f"### {guide_title}\n\n{body_text}\n\n*Source: {metadata_badge['source']}*"
        return {
            "message": formatted_explanation,
            "intent": intent,
            "skill_data": data_payload,
            "follow_up_chips": ["+ Add Candidate", "⭐ Show Top Candidates"],
            "action_buttons": action_buttons,
            "confidence_score": 100,
            "confidence_reason": metadata_badge.get("source", "✓ Documentation"),
            "sources": ["platform_documentation"],
            "metadata_badge": metadata_badge,
        }

    elif intent == "UNIVERSAL_SEARCH":
        data_payload = execute_universal_search(query, ctx_filters)
        follow_up_chips = ["Compare candidates", "Draft invitation email"]

    elif intent == "DAILY_BRIEF":
        data_payload = daily_recruiter_brief()
        follow_up_chips = ["+ Add Candidate", "Show risk candidates"]

    elif intent == "COMPARE_CANDIDATES":
        cand_list = params.get("candidates", ["Priya", "Aisha"])
        data_payload = compare_candidates(cand_list)

    elif intent == "EXPLAIN_RANKING":
        cand_name = params.get("candidate", "Priya Sharma")
        data_payload = explain_ranking(cand_name)

    elif intent == "RISK_ANOMALIES":
        data_payload = find_risk_candidates()

    elif intent == "PIPELINE_HEALTH":
        data_payload = pipeline_health()

    else:
        data_payload = get_top_candidates(ctx_filters)

    if not formatted_explanation:
        system_prompt = "You are HireMind AI Recruiter Copilot. Summarize the provided JSON data clearly for the recruiter."
        user_prompt = f"User Question: '{query}'\n\nStructured Data (JSON):\n{data_payload}"
        try:
            formatted_explanation = _call_gemini(system_prompt, user_prompt)
        except Exception:
            formatted_explanation = f"Processed query for **{intent.lower().replace('_', ' ')}**."

    return {
        "message": formatted_explanation,
        "intent": intent,
        "skill_data": data_payload,
        "candidate_cards": data_payload.get("candidates") or ([data_payload.get("candidate")] if data_payload.get("candidate") else []),
        "comparison_matrix": data_payload.get("comparison_matrix"),
        "follow_up_chips": follow_up_chips or ["+ Add Candidate", "+ Post Job", "❌ Delete Candidate", "⭐ Top Candidates"],
        "action_buttons": action_buttons,
        "confidence_score": data_payload.get("confidence_score", confidence_score),
        "confidence_reason": data_payload.get("confidence_reason", confidence_reason),
        "sources": data_payload.get("sources", sources),
        "metadata_badge": metadata_badge,
        "context_filters": ctx_filters,
        "action_proposal": action_proposal,
    }
