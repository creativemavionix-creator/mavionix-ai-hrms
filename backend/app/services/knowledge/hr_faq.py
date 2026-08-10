def get_hr_faq(topic: str) -> dict:
    faqs = {
        "star_method": {
            "title": "STAR Method Behavioral Interviewing",
            "summary": "Structure candidate evaluation around Situation, Task, Action, and Result.",
            "tips": [
                "Ask candidates for specific past scenarios rather than hypothetical answers.",
                "Focus 60% of evaluation weight on the candidate's specific Actions and quantifiable Results."
            ]
        },
        "notice_period": {
            "title": "Notice Period & Buyout Standards",
            "summary": "Assess candidate availability and buyout constraints early in screening.",
            "tips": [
                "Standard notice periods range from 15 to 90 days depending on seniority.",
                "Candidates with <30 days notice can be fast-tracked to technical interview rounds."
            ]
        }
    }
    return faqs.get(topic, faqs["star_method"])
