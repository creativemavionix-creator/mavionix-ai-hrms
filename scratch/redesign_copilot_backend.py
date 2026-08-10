import os

code = """\"\"\"
Recruiter Copilot Router – /api/recruiter-copilot

Exposes endpoints for the Layered Recruiter AI Copilot Assistant:
- POST /api/recruiter-copilot/chat
- GET  /api/recruiter-copilot/daily-brief
\"\"\"
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
        match = re.search(r"\\{.*\\}", cleaned, re.DOTALL)
        if match:
            return json.loads(match.group(0))
    raise ValueError("Could not parse JSON")


# ── Helper: Intent Classifier Fallback ────────────────────────────────────────

def classify_recruiter_intent(query: str, page_ctx: PageContext | None = None) -> tuple[str, dict[str, Any]]:
    text = query.lower().strip()
    params: dict[str, Any] = {}

    if page_ctx and page_ctx.current_candidate_name:
        current_name = page_ctx.current_candidate_name
        if re.search(r"\\b(she|her|he|him|this candidate|selected candidate)\\b", text):
            params["resolved_candidate_name"] = current_name

    if re.search(r"\\b(hi|hello|hey|good morning|good afternoon|greetings)\\b", text):
        return "GREETING", params

    if re.search(r"\\b(how to add|add a candidate|create candidate|upload resume)\\b", text):
        params["topic_key"] = "add_candidate"
        return "KNOWLEDGE_GUIDE", params

    if re.search(r"\\b(portal link|interview link|generate link|generate portal)\\b", text):
        params["topic_key"] = "portal_link"
        return "KNOWLEDGE_GUIDE", params

    if re.search(r"\\b(adjust weights|ai weight|change scoring|calibration)\\b", text):
        params["topic_key"] = "adjust_weights"
        return "KNOWLEDGE_GUIDE", params

    if re.search(r"\\b(shortlist|override|bypass)\\b", text):
        params["topic_key"] = "shortlist_override"
        return "KNOWLEDGE_GUIDE", params

    if re.search(r"\\b(3 strike|strike|tab switch|tab-switch|window blur)\\b", text):
        params["topic_key"] = "3_strike_policy"
        return "KNOWLEDGE_POLICY", params

    if re.search(r"\\b(plagiarism threshold|copy risk policy|cheating policy)\\b", text):
        params["topic_key"] = "plagiarism_policy"
        return "KNOWLEDGE_POLICY", params

    if re.search(r"\\b(terminate|termination|why candidate terminated|locked out)\\b", text):
        params["topic_key"] = "termination_policy"
        return "KNOWLEDGE_POLICY", params

    if re.search(r"\\b(brief|morning|summary|today'?s|overview|priorities|what should i do)\\b", text):
        return "DAILY_BRIEF", params

    if re.search(r"\\b(compare|versus|vs|difference|side by side)\\b", text):
        names = re.findall(r"\\b([a-zA-Z]{3,15})\\b", query)
        names = [n for n in names if n.lower() not in {"compare", "versus", "and", "show", "with", "between", "her", "him"}]
        if params.get("resolved_candidate_name") and len(names) < 2:
            names.append(params["resolved_candidate_name"])
        params["candidates"] = list(set(names)) if names else ["Priya", "Aisha"]
        return "COMPARE_CANDIDATES", params

    if re.search(r"\\b(why|explain|reason|ranking|rank|rejected|accepted)\\b", text):
        params["candidate"] = params.get("resolved_candidate_name", "Priya Sharma")
        return "EXPLAIN_RANKING", params

    if re.search(r"\\b(risk|flagged|plagiarism|anomaly|copy|cheat)\\b", text):
        return "RISK_ANOMALIES", params

    if re.search(r"\\b(funnel|pipeline|health|drop|drop-off|conversion)\\b", text):
        return "PIPELINE_HEALTH", params

    if re.search(r"\\b(question|ask|interview questions|recommend questions)\\b", text):
        return "RECOMMEND_QUESTIONS", params

    if re.search(r"\\b(email|draft|write email|invite|send message)\\b", text):
        params["candidate"] = params.get("resolved_candidate_name", "Priya Sharma")
        return "DRAFT_EMAIL", params

    if re.search(r"\\b(react|python|backend|frontend|machine learning|ml|score above|from delhi|bengaluru|notice)\\b", text):
        return "UNIVERSAL_SEARCH", params

    if len(text) > 3 and not re.search(r"\\b(candidate|job|applicant|interview|score|resume|hire|recruiter)\\b", text):
        return "OFF_TOPIC", params

    return "UNIVERSAL_SEARCH", params


def classify_intent_with_llm(query: str, history: list[ChatMessage], page_ctx: PageContext | None) -> dict:
    system_prompt = (
        "You are the HireMind AI Recruiter Copilot intent classification engine.\\n"
        "Analyze the user's query, history, and page context. Identify the intent and extract relevant parameters.\\n"
        "Allowed Intents:\\n"
        "- CREATE_JOB: User wants to create a new job requisition role.\\n"
        "- REJECT_CANDIDATE: User wants to reject or disqualify a candidate.\\n"
        "- SCHEDULE_INTERVIEW: User wants to schedule or request an interview round.\\n"
        "- COMPARE_CANDIDATES: User wants to compare applicants side-by-side.\\n"
        "- RISK_ANOMALIES: User asks about flagged candidates or integrity warnings.\\n"
        "- PIPELINE_HEALTH: User asks about stage conversions or pipeline metrics.\\n"
        "- DAILY_BRIEF: User asks for morning priorities/statistics.\\n"
        "- KNOWLEDGE_GUIDE: User asks how to use the platform (e.g. how to add candidates, generate links).\\n"
        "- KNOWLEDGE_POLICY: User asks about platform policies/rules (e.g. 3-strike rules).\\n"
        "- GREETING: Standard chat welcome.\\n"
        "- OFF_TOPIC: Unrelated queries.\\n\\n"
        "For CREATE_JOB, the required parameters are: ['title', 'department', 'location']. If any of these are missing in the query or history, list them in 'missing_parameters'.\\n"
        "For REJECT_CANDIDATE, the required parameter is: ['candidate_name']. If missing, list it.\\n"
        "For SCHEDULE_INTERVIEW, the required parameters are: ['candidate_name', 'interview_time']. If missing, list them.\\n\\n"
        "Return ONLY a raw JSON block matching this exact structure:\\n"
        "{\\n"
        "  \\\"intent\\\": \\\"INTENT_NAME\\\",\\n"
        "  \\\"parameters\\\": {\\n"
        "     \\\"title\\\": \\\"extracted job title or null\\\",\\n"
        "     \\\"location\\\": \\\"extracted job location or null\\\",\\n"
        "     \\\"department\\\": \\\"extracted job department or null\\\",\\n"
        "     \\\"candidate_name\\\": \\\"extracted candidate name or null\\\",\\n"
        "     \\\"interview_time\\\": \\\"extracted time or null\\\"\\n"
        "  },\\n"
        "  \\\"missing_parameters\\\": []\\n"
        "}"
    )

    history_str = "\\n".join([f"{h.role}: {h.content}" for h in history[-5:]]) if history else ""
    ctx_str = f"Active Tab: {page_ctx.active_tab if page_ctx else ''}, Candidate ID: {page_ctx.current_candidate_id if page_ctx else ''}, Candidate Name: {page_ctx.current_candidate_name if page_ctx else ''}"
    user_prompt = f"Page Context: {ctx_str}\\nChat History:\\n{history_str}\\nUser Question: '{query}'"

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
                "location": params.get("location"),
                "department": params.get("department"),
                "candidate_name": params.get("resolved_candidate_name") or (page_ctx.current_candidate_name if page_ctx else None),
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

    # 1. Advanced LLM Intent classification & parameter extraction
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

    # Handle parameter slot-filling
    if missing_params:
        missing_fields = ", ".join(missing_params).upper()
        formatted_explanation = (
            f"I can help you execute that action, but I need a few more details. "
            f"Please specify the following missing parameter(s): **{missing_fields}**."
        )
        return {
            "message": formatted_explanation,
            "intent": intent,
            "skill_data": {},
            "follow_up_chips": [f"Specify parameters for {intent.lower().replace('_', ' ')}"],
            "action_buttons": [],
            "confidence_score": 100,
            "confidence_reason": "Slot-filling prompting",
            "sources": ["copilot_memory"],
        }

    # ── 2. Route Intent ──
    if intent == "GREETING":
        formatted_explanation = (
            "**Hello! I am your HireMind AI Recruiter Copilot.** 👋\\n\\n"
            "I can assist you with candidate evaluation, side-by-side comparison, pipeline analytics, "
            "platform operational guides, anti-cheating policies, and draft invitations. "
            "What hiring task would you like to focus on today?"
        )
        follow_up_chips = ["☀️ Morning Hiring Brief", "⭐ Show Top Candidates", "⚖ Compare Candidates", "❓ How to Add Candidate"]
        action_buttons = [
            {"label": "Show Today's Priorities", "action": "trigger_brief"},
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

    elif intent in ("KNOWLEDGE_GUIDE", "KNOWLEDGE_POLICY"):
        topic_key = params.get("topic_key", "add_candidate")
        know_res = route_knowledge_query(topic_key)
        data_payload = know_res["payload"]
        metadata_badge = know_res["metadata"]
        sources = ["platform_documentation", "security_policy"]
        confidence_score = 100
        confidence_reason = metadata_badge.get("source", "✓ Platform Documentation")

        guide_title = data_payload.get("title", data_payload.get("policy_name", "Platform Guidance"))
        steps_or_rules = data_payload.get("steps") or data_payload.get("summary")

        if isinstance(steps_or_rules, list):
            body_text = "\\n".join(steps_or_rules)
        else:
            body_text = f"• **Summary**: {steps_or_rules}\\n• **Enforcement**: {data_payload.get('enforcement', 'N/A')}"

        formatted_explanation = f"### {guide_title}\\n\\n{body_text}\\n\\n*Source: {metadata_badge['source']}*"
        
        qa = data_payload.get("quick_action")
        if qa:
            action_buttons.append({"label": qa["label"], "action": qa["action"], "target_tab": qa.get("target_tab", "candidates")})
        
        follow_up_chips = ["❓ Candidate 3-Strike Rule", "⚙️ How AI Weights Work", "⭐ Show Top Candidates"]

        return {
            "message": formatted_explanation,
            "intent": intent,
            "skill_data": data_payload,
            "follow_up_chips": follow_up_chips,
            "action_buttons": action_buttons,
            "confidence_score": 100,
            "confidence_reason": confidence_reason,
            "sources": sources,
            "metadata_badge": metadata_badge,
        }

    elif intent == "CREATE_JOB":
        # Formulate deterministic action proposal
        action_proposal = {
            "tool": "CREATE_JOB",
            "parameters": {
                "title": params.get("title"),
                "department": params.get("department", "Engineering"),
                "location": params.get("location", "Remote"),
                "status": "active",
                "priority": "medium",
                "description": f"AI Drafted role definition for {params.get('title')} in {params.get('department')}."
            },
            "status": "pending_approval"
        }
        formatted_explanation = (
            f"I have gathered all the parameters for this request. "
            f"Please approve or cancel the action to post this job requisition."
        )

    elif intent == "REJECT_CANDIDATE":
        action_proposal = {
            "tool": "REJECT_CANDIDATE",
            "parameters": {
                "candidate_name": params.get("candidate_name") or "Priya Sharma",
                "stage": "rejected"
            },
            "status": "pending_approval"
        }
        formatted_explanation = (
            f"I have drafted a candidate rejection status update. "
            f"Please review and approve this action."
        )

    elif intent == "SCHEDULE_INTERVIEW":
        action_proposal = {
            "tool": "SCHEDULE_INTERVIEW",
            "parameters": {
                "candidate_name": params.get("candidate_name") or "Priya Sharma",
                "interview_time": params.get("interview_time", "Tomorrow at 10:00 AM")
            },
            "status": "pending_approval"
        }
        formatted_explanation = (
            f"I have drafted an interview session invitation. "
            f"Please review and approve to commit the scheduler trigger."
        )

    elif intent == "UNIVERSAL_SEARCH":
        data_payload = execute_universal_search(query, ctx_filters)
        follow_up_chips = ["Compare top candidates", "Why is Priya ranked first?", "Draft candidate invite"]
        action_buttons = [
            {"label": "Open Top Candidate Dossier", "action": "open_dossier", "candidate_id": "c1"},
            {"label": "Draft Invitation Email", "action": "draft_email"},
        ]

    elif intent == "DAILY_BRIEF":
        data_payload = daily_recruiter_brief()
        follow_up_chips = ["Compare top candidates", "Show flagged candidates", "Pipeline bottleneck check"]
        action_buttons = [
            {"label": "Review Priya Sharma", "action": "open_dossier", "candidate_id": "c1"},
            {"label": "Schedule Technical Round", "action": "schedule_interview"},
        ]

    elif intent == "COMPARE_CANDIDATES":
        cand_list = params.get("candidates", ["Priya", "Aisha"])
        data_payload = compare_candidates(cand_list)
        follow_up_chips = ["Why is Priya ranked first?", "Draft interview email for Priya", "Show risk candidates"]
        action_buttons = [
            {"label": "Open Priya's Dossier", "action": "open_dossier", "candidate_id": "c1"},
            {"label": "Schedule Technical Round", "action": "schedule_interview"},
        ]

    elif intent == "EXPLAIN_RANKING":
        cand_name = params.get("candidate", "Priya Sharma")
        data_payload = explain_ranking(cand_name)
        follow_up_chips = ["Compare Priya and Aisha", "Draft interview invite", "Recommend technical questions"]
        action_buttons = [
            {"label": f"Open {cand_name}'s Dossier", "action": "open_dossier", "candidate_id": "c1"},
            {"label": "Advance Stage", "action": "advance_stage"},
        ]

    elif intent == "RISK_ANOMALIES":
        data_payload = find_risk_candidates()
        follow_up_chips = ["Show top candidates", "Explain Priya's ranking", "Draft candidate warning"]
        action_buttons = [
            {"label": "Review Flagged Transcript", "action": "open_dossier", "candidate_id": "c1"},
            {"label": "Reset Assessment", "action": "reset_assessment"},
        ]

    elif intent == "PIPELINE_HEALTH":
        data_payload = pipeline_health()
        follow_up_chips = ["Show top candidates", "Find flagged candidates", "Daily brief summary"]
        action_buttons = [
            {"label": "Filter Candidates", "action": "filter_candidates"},
            {"label": "Adjust AI Weights", "action": "open_settings"},
        ]

    elif intent == "OFF_TOPIC":
        formatted_explanation = (
            "I specialize in recruitment and the **HireMind AI Platform**! 🎯\\n\\n"
            "I can help you with candidate evaluations, interview transcript analysis, hiring pipeline workflows, "
            "platform operational guides, anti-cheating policies, and HR best practices. "
            "How can I assist you with your hiring tasks today?"
        )
        follow_up_chips = ["⭐ Show Top Candidates", "☀️ Morning Hiring Brief", "❓ How to Add Candidate", "🛡️ Candidate 3-Strike Rule"]
        return {
            "message": formatted_explanation,
            "intent": "OFF_TOPIC",
            "skill_data": {},
            "follow_up_chips": follow_up_chips,
            "action_buttons": [
                {"label": "View Candidates", "action": "open_tab", "target_tab": "candidates"},
            ],
            "confidence_score": 100,
            "confidence_reason": "Domain Guardrail Notice",
            "sources": ["platform_copilot"],
        }

    else:
        data_payload = get_top_candidates(ctx_filters)
        follow_up_chips = ["Compare top candidates", "Why is Priya ranked first?", "Show flagged candidates"]
        action_buttons = [
            {"label": "Open Priya Sharma's Dossier", "action": "open_dossier", "candidate_id": "c1"},
        ]

    # LLM Synthesis for textual explanation
    if not formatted_explanation:
        system_prompt = (
            "You are HireMind AI Recruiter Copilot, a senior talent acquisition assistant. "
            "Summarize the provided JSON clearly for the recruiter using bullet points. Highlight key metrics."
        )
        user_prompt = f"User Question: '{query}'\\n\\nStructured Data (JSON):\\n{data_payload}"
        try:
            formatted_explanation = _call_gemini(system_prompt, user_prompt)
        except Exception:
            if intent == "EXPLAIN_RANKING":
                reasons = data_payload.get("ranking_reasons", [])
                formatted_explanation = (
                    f"**Ranking Breakdown for {data_payload.get('candidate', {}).get('name', 'Priya Sharma')}:**\\n\\n"
                    + "\\n".join(f"• {r}" for r in reasons)
                )
            elif intent == "COMPARE_CANDIDATES":
                formatted_explanation = "Here is the side-by-side metric comparison matrix based on live database evaluations."
            else:
                formatted_explanation = f"Found **{len(data_payload.get('candidates', []))}** candidate records matching your query."

    return {
        "message": formatted_explanation,
        "intent": intent,
        "skill_data": data_payload,
        "candidate_cards": data_payload.get("candidates") or ([data_payload.get("candidate")] if data_payload.get("candidate") else []),
        "comparison_matrix": data_payload.get("comparison_matrix"),
        "follow_up_chips": follow_up_chips,
        "action_buttons": action_buttons,
        "confidence_score": data_payload.get("confidence_score", confidence_score),
        "confidence_reason": data_payload.get("confidence_reason", confidence_reason),
        "sources": data_payload.get("sources", sources),
        "metadata_badge": metadata_badge,
        "context_filters": ctx_filters,
        "action_proposal": action_proposal,
    }
"""

with open("backend/app/routers/recruiter_copilot.py", "w", encoding="utf-8") as f:
    f.write(code)
print("Successfully redesigned backend recruiter_copilot.py")
