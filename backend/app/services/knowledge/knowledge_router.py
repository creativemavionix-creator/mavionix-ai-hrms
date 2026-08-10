from __future__ import annotations
from typing import Any

from app.services.knowledge.ai_scoring import get_scoring_weights_guide
from app.services.knowledge.candidate_management import get_add_candidate_guide
from app.services.knowledge.hr_faq import get_hr_faq
from app.services.knowledge.interview_rules import (
    get_3_strike_policy,
    get_plagiarism_policy,
    get_termination_policy,
)
from app.services.knowledge.pipeline_workflow import get_shortlist_override_guide
from app.services.knowledge.platform_navigation import (
    get_adjust_weights_guide,
    get_portal_link_guide,
)


def route_knowledge_query(topic_key: str) -> dict[str, Any]:
    """
    Routes platform guide, policy, and HR procedural questions to specific modules
    and attaches explainability metadata.
    """
    payload: dict[str, Any] = {}
    is_policy = False

    if topic_key == "add_candidate":
        payload = get_add_candidate_guide()
    elif topic_key == "portal_link":
        payload = get_portal_link_guide()
    elif topic_key == "3_strike_policy":
        payload = get_3_strike_policy()
        is_policy = True
    elif topic_key == "plagiarism_policy":
        payload = get_plagiarism_policy()
        is_policy = True
    elif topic_key == "termination_policy":
        payload = get_termination_policy()
        is_policy = True
    elif topic_key == "ai_scoring_weights":
        payload = get_scoring_weights_guide()
    elif topic_key == "adjust_weights":
        payload = get_adjust_weights_guide()
    elif topic_key == "shortlist_override":
        payload = get_shortlist_override_guide()
    else:
        payload = get_hr_faq(topic_key)

    source_label = "✓ Security & Anti-Cheating Policy (v1.0)" if is_policy else "✓ Platform Documentation (v1.0)"

    return {
        "topic_key": topic_key,
        "is_policy": is_policy,
        "payload": payload,
        "metadata": {
            "source": source_label,
            "confidence_score": 100,
            "last_updated": "2026-07-29",
            "version": "v1.0"
        }
    }
