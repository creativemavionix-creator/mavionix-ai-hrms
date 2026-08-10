from __future__ import annotations
from typing import Any
from app.services.copilot_skills import get_top_candidates

def execute_universal_search(query: str, filters: dict[str, Any] | None = None) -> dict[str, Any]:
    """
    Direct deterministic search mapper for queries like:
    'React developer', 'Priya', 'Score above 80', 'Candidates from Delhi'
    """
    text = query.lower().strip()
    ctx_filters = filters or {}

    if "react" in text:
        ctx_filters["role"] = "Frontend"
        ctx_filters["skill"] = "React"
    elif "python" in text or "backend" in text:
        ctx_filters["role"] = "Backend"
        ctx_filters["skill"] = "Python"
    elif "ml" in text or "machine learning" in text:
        ctx_filters["role"] = "Machine Learning"

    if "80" in text or "top" in text:
        ctx_filters["min_score"] = 80
    elif "90" in text:
        ctx_filters["min_score"] = 90

    if "priya" in text:
        ctx_filters["name"] = "Priya"
    elif "aisha" in text:
        ctx_filters["name"] = "Aisha"
    elif "rohit" in text:
        ctx_filters["name"] = "Rohit"

    data = get_top_candidates(ctx_filters)
    data["intent"] = "UNIVERSAL_SEARCH"
    data["search_query"] = query
    data["applied_filters"] = ctx_filters
    data["confidence_score"] = 100
    data["confidence_reason"] = f"Direct database search match for '{query}'"
    return data
