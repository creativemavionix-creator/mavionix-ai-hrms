import re

# Configurable thresholds
DOC_SIMILARITY_THRESHOLD = 0.45
BULLET_DENSITY_THRESHOLD = 0.15  # ratio of bullet items to total words
STRUCTURAL_BOLD_THRESHOLD = 3     # count of bold elements in text

# Reference Documentation Database (commonly copied definitions)
DOC_DATABASE = {
    "javascript_closure": (
        "closure is the combination of a function bundled together enclosed with references "
        "to its surrounding state the lexical environment. in other words a closure gives you "
        "access to an outer functions scope from an inner function. in javascript closures are "
        "created every time a function is created at function creation time"
    ),
    "javascript_prototype": (
        "prototypes are the mechanism by which javascript objects inherit features from one "
        "another. every object in javascript has a built-in property which is called its prototype. "
        "the prototype is itself an object so the prototype will have its own prototype making what "
        "is called a prototype chain"
    ),
    "javascript_event_loop": (
        "javascript has a runtime model based on an event loop which is responsible for executing "
        "the code collecting and processing events and executing queued sub-tasks. this model is "
        "quite different from models in other languages like c and java"
    ),
    "python_decorator": (
        "a decorator is a design pattern in python that allows a user to add new functionality "
        "to an existing object without modifying its structure. decorators are usually called "
        "before the definition of a function you want to extend"
    ),
    "python_list_comprehension": (
        "list comprehensions provide a concise way to create lists. it consists of brackets "
        "containing an expression followed by a for clause then zero or more for or if clauses. "
        "the list comprehension is much more readable and concise"
    ),
    "python_gil": (
        "the python global interpreter lock or gil in simple words is a mutex or a lock that allows "
        "only one thread to hold the control of the python interpreter. this means that only one "
        "thread can be in a state of execution at any point in time"
    ),
    "react_virtual_dom": (
        "the virtual dom vdom is a programming concept where an ideal or virtual representation "
        "of a ui is kept in memory and synced with the real dom by a library such as reactdom. "
        "this process is called reconciliation"
    ),
    "react_use_effect": (
        "useeffect is a react hook that lets you synchronize a component with an external system. "
        "it takes a setup function with optional cleanup code and an array of dependencies to trigger "
        "re-runs"
    ),
    "database_acid": (
        "acid atomicity consistency isolation durability is a set of properties of database "
        "transactions intended to guarantee data validity despite errors power failures and other "
        "mishaps. in the context of databases a single logical operation on the data is called a transaction"
    ),
    "database_index": (
        "an index is a schema object that contains an entry for each value that appears in the "
        "indexed columns of the table or view and provides direct and rapid access to rows"
    ),
    "docker_container": (
        "a container is a standard unit of software that packages up code and all its dependencies "
        "so the application runs quickly and reliably from one computing environment to another. "
        "a docker container image is a lightweight standalone executable package of software"
    )
}

def _clean_and_tokenize(text: str) -> list[str]:
    """Lowercase, strip non-alphanumeric characters, and split into tokens."""
    cleaned = re.sub(r'[^a-zA-Z0-9\s]', '', text.lower())
    return [t for t in cleaned.split() if len(t) > 1]

def _generate_bigrams(tokens: list[str]) -> set[str]:
    """Generate word bigrams from a list of tokens."""
    return {f"{tokens[i]} {tokens[i+1]}" for i in range(len(tokens) - 1)}

def _calculate_jaccard(set1: set, set2: set) -> float:
    """Calculate Intersection over Union (Jaccard similarity)."""
    if not set1 or not set2:
        return 0.0
    union = set1.union(set2)
    if not union:
        return 0.0
    return len(set1.intersection(set2)) / len(union)

def analyze_similarity(answer: str, previous_answers: list[str] = None) -> dict:
    """
    Analyzes a candidate response for copy-paste indicators and reference documentation matches.
    """
    if not answer or len(answer.strip()) < 10:
        return {
            "suspected_copy_paste": False,
            "risk_score": 0.0,
            "reasons": [],
            "details": {"similarity_score": 0.0, "structural_score": 0.0}
        }

    reasons = []
    max_similarity = 0.0
    matched_doc = None
    
    # 1. Documentation Database Search
    tokens = _clean_and_tokenize(answer)
    bigrams = _generate_bigrams(tokens)
    
    for doc_name, doc_text in DOC_DATABASE.items():
        doc_tokens = _clean_and_tokenize(doc_text)
        doc_bigrams = _generate_bigrams(doc_tokens)
        sim = _calculate_jaccard(bigrams, doc_bigrams)
        if sim > max_similarity:
            max_similarity = sim
            matched_doc = doc_name

    if max_similarity > DOC_SIMILARITY_THRESHOLD:
        reasons.append(f"High similarity with stored documentation ({matched_doc.replace('_', ' ').title()})")

    # 2. Structural Heuristics
    structural_score = 0.0
    structural_reasons = []
    
    # Count bullet items
    bullet_items = re.findall(r'^\s*(?:\*|-|\+|-|\d+\.)\s+', answer, re.MULTILINE)
    word_count = len(answer.split())
    
    if bullet_items and word_count > 0:
        if len(bullet_items) >= 3:
            structural_reasons.append("High bullet-list density")
            structural_score += 0.40
            
    # Count bold keyword occurrences (e.g. **Keyword:**)
    bold_items = re.findall(r'\*\*.*?\*\*', answer)
    if len(bold_items) >= STRUCTURAL_BOLD_THRESHOLD:
        structural_reasons.append("Highly structured markdown layout")
        structural_score += 0.35

    # Code block format formatting consistency check
    code_blocks = re.findall(r'```', answer)
    if len(code_blocks) >= 2:
        structural_reasons.append("Contains pre-formatted markdown code blocks")
        structural_score += 0.20

    if structural_reasons:
        reasons.extend(structural_reasons)
        
    # 3. Conversation Style Consistency
    consistency_score = 0.0
    if previous_answers:
        non_empty_prevs = [p for p in previous_answers if p and len(p.split()) > 0]
        if non_empty_prevs:
            avg_prev_len = sum(len(p.split()) for p in non_empty_prevs) / len(non_empty_prevs)
            # Flag if current answer is exceptionally long compared to their typical responses
            if word_count > 150 and avg_prev_len > 0 and (word_count / avg_prev_len) > 5.0:
                reasons.append("Abrupt length & formatting consistency shift")
                consistency_score = 0.40

    # Calculate overall risk score
    overall_risk = min(1.0, max_similarity * 1.0 + structural_score * 0.8 + consistency_score * 0.5)

    suspected = False
    # Flag as suspected copy-paste if overall risk is high, or direct doc match occurs
    if overall_risk >= 0.50 or max_similarity > DOC_SIMILARITY_THRESHOLD:
        suspected = True

    # Limit maximum 3 reasons to keep the UI clean
    reasons = sorted(list(set(reasons)))[:3]

    return {
      "suspected_copy_paste": suspected,
      "risk_score": round(overall_risk, 2),
      "reasons": reasons,
      "details": {
        "similarity_score": round(max_similarity, 2),
        "structural_score": round(structural_score, 2),
        "consistency_score": round(consistency_score, 2)
      }
    }
