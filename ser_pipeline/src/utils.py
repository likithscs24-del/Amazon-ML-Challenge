"""
Shared utilities: text normalization, postal-code extraction, and the
official F_0.5 scorer used to validate against a held-out split.
"""
import re
from typing import Optional

LEGAL_SUFFIXES = [
    "private limited", "pvt ltd", "pvt. ltd.", "pvt", "ltd", "limited",
    "llp", "llc", "l.l.c", "inc", "incorporated", "corp", "corporation",
    "co", "company", "sarl", "sasu", "eurl", "sas", "sa", "sci",
    "associates", "group", "holdings", "enterprises", "enterprise",
    "trust", "society", "trading", "industries", "international",
]
# sort longest-first so "private limited" is stripped before "limited"
_SUFFIX_RE = re.compile(
    r"\b(" + "|".join(sorted((re.escape(s) for s in LEGAL_SUFFIXES), key=len, reverse=True)) + r")\b",
    flags=re.IGNORECASE,
)
_PUNCT_RE = re.compile(r"[^\w\s]")
_WS_RE = re.compile(r"\s+")

US_ZIP_RE = re.compile(r"\b(\d{5})(?:-\d{4})?\b")
IN_PIN_RE = re.compile(r"\b(\d{6})\b")
FR_POSTAL_RE = re.compile(r"\b(\d{5})\b")


def normalize_name(name: str) -> str:
    """Lowercase, strip legal suffixes/punctuation, collapse whitespace."""
    if not isinstance(name, str):
        return ""
    s = name.lower()
    s = s.replace("&", " and ")
    s = _PUNCT_RE.sub(" ", s)
    s = _SUFFIX_RE.sub(" ", s)
    s = _WS_RE.sub(" ", s).strip()
    return s


def normalize_address(addr: str) -> str:
    if not isinstance(addr, str):
        return ""
    s = addr.lower()
    repl = {
        r"\broad\b": "rd", r"\bstreet\b": "st", r"\bavenue\b": "ave",
        r"\bboulevard\b": "blvd", r"\bapartment\b": "apt", r"\bfloor\b": "fl",
        r"\bnear\b": "", r"\bopp\b": "", r"\bopposite\b": "",
    }
    for pat, rep in repl.items():
        s = re.sub(pat, rep, s)
    s = _PUNCT_RE.sub(" ", s)
    s = _WS_RE.sub(" ", s).strip()
    return s


def extract_postal_code(address: str, country: str) -> Optional[str]:
    """Best-effort postal/PIN code extraction, country-aware but with a
    generic fallback so unseen countries (e.g. test-only ones) still work."""
    if not isinstance(address, str):
        return None
    country = (country or "").strip().lower()
    if country == "us":
        m = US_ZIP_RE.search(address)
    elif country == "india":
        m = IN_PIN_RE.search(address)
    elif country == "france":
        m = FR_POSTAL_RE.search(address)
    else:
        # generic: look for the last standalone 5-6 digit run
        m = re.search(r"\b(\d{5,6})\b", address)
    return m.group(1) if m else None


def f_beta_per_entity(pred: set, truth: set, beta: float = 0.5) -> float:
    """F_beta for one Source-1 entity's predicted vs true match sets.
    Empty truth + empty pred -> 1.0 (singleton correctly identified)."""
    if not truth and not pred:
        return 1.0
    if not pred:
        return 0.0
    tp = len(pred & truth)
    if tp == 0:
        return 0.0
    precision = tp / len(pred)
    recall = tp / len(truth)
    b2 = beta * beta
    denom = (b2 * precision) + recall
    if denom == 0:
        return 0.0
    return (1 + b2) * precision * recall / denom


def macro_f_beta(pred_map: dict, truth_map: dict, beta: float = 0.5) -> float:
    """pred_map / truth_map: {source1_entity_id: set(matched_ids)}.
    Averages per-entity F_beta over every key in truth_map (ground truth
    defines the evaluation universe)."""
    scores = []
    for s1_id, truth in truth_map.items():
        pred = pred_map.get(s1_id, set())
        scores.append(f_beta_per_entity(pred, truth, beta))
    return sum(scores) / len(scores) if scores else 0.0
