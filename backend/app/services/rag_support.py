import asyncio
import json
import logging
import os
import re
from typing import AsyncGenerator

logger = logging.getLogger(__name__)

SUPPORT_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "support")

def _load_configs():
    try:
        with open(os.path.join(SUPPORT_DIR, "faq_rules.json"), "r", encoding="utf-8") as f:
            faq_rules = json.load(f)
        with open(os.path.join(SUPPORT_DIR, "synonym_map.json"), "r", encoding="utf-8") as f:
            synonym_map = json.load(f)
        with open(os.path.join(SUPPORT_DIR, "responses.json"), "r", encoding="utf-8") as f:
            responses = json.load(f)
        return faq_rules, synonym_map, responses
    except Exception as e:
        logger.error(f"Failed to load support config files: {e}")
        return [], {}, {}

def normalize_input(text: str) -> str:
    """Lowercase and normalize whitespace."""
    return re.sub(r'\s+', ' ', text.lower().strip())

def replace_synonyms(text: str, synonym_map: dict) -> str:
    """Replace words with their base keywords based on the synonym map."""
    words = text.split()
    replaced = []
    for word in words:
        # Check direct mapping
        replaced.append(synonym_map.get(word, word))
    
    # Also handle multi-word replacements if needed (naive approach)
    joined_text = " ".join(replaced)
    for syn, base in synonym_map.items():
        if syn in joined_text and " " in syn:
            joined_text = joined_text.replace(syn, base)
            
    return joined_text

def evaluate_intent(query: str) -> str:
    """
    Hybrid Rule-Based Intent Engine (v1).
    Classifies a query through 5 layers.
    """
    faq_rules, synonym_map, responses = _load_configs()

    if not faq_rules:
        return "I'm sorry, my configuration is currently unavailable."

    normalized_query = normalize_input(query)
    
    # Layer 1 - Exact Match
    for rule in faq_rules:
        if normalized_query in [p.lower() for p in rule["patterns"]]:
            return responses.get(rule["intent"], "• We are currently unable to classify your request.\n• Please try rephrasing your inquiry.\n• Recruiter Contact: recruiter-support@hiremind.ai | +1 (800) 555-0199")

    # Apply synonym replacements for Layer 2 & 3
    synonymized_query = replace_synonyms(normalized_query, synonym_map)
    
    # Layer 4 - Confidence Scoring (Combines Layer 2 & 3 evaluations)
    intent_scores = {}
    
    for rule in faq_rules:
        intent = rule["intent"]
        priority = rule.get("priority", 50)
        score = 0
        
        for pattern in rule["patterns"]:
            # Treat patterns as regex boundary matches where possible
            try:
                if re.search(r'\b' + re.escape(pattern.lower()) + r'\b', normalized_query):
                    score += priority
                elif re.search(r'\b' + re.escape(pattern.lower()) + r'\b', synonymized_query):
                    score += priority * 0.8  # Slight penalty for synonym match
            except Exception:
                # Fallback to simple string inclusion
                if pattern.lower() in normalized_query:
                    score += priority
                elif pattern.lower() in synonymized_query:
                    score += priority * 0.8
                    
        if score > 0:
            intent_scores[intent] = score

    if intent_scores:
        # Find the highest scoring intent
        best_intent = max(intent_scores, key=intent_scores.get)
        if intent_scores[best_intent] > 0:
            return responses.get(best_intent, "• We are currently unable to classify your request.\n• Please try rephrasing your inquiry.\n• Recruiter Contact: recruiter-support@hiremind.ai | +1 (800) 555-0199")
            
    # Layer 5 - Default Fallback
    return "• We are currently unable to classify your request.\n• Please try rephrasing your inquiry.\n• Recruiter Contact: recruiter-support@hiremind.ai | +1 (800) 555-0199"

async def query_support_faq(query: str, history: list[dict] = None) -> AsyncGenerator[str, None]:
    """
    Evaluates the intent and streams the response to simulate a conversational assistant.
    """
    best_match = evaluate_intent(query)
        
    # Simulate LLM token streaming
    words = best_match.split(" ")
    for i, word in enumerate(words):
        yield word + (" " if i < len(words) - 1 else "")
        await asyncio.sleep(0.05) # Simulate token generation delay
