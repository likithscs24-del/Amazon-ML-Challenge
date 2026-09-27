"""
Turn candidate_pairs.tsv into a feature table for the classifier.
One row per (source1_entity_id, candidate_entity_id) pair.

Rewritten for local (non-cluster) performance: the original version
used DataFrame.loc[entity_id] and df.apply() inside a per-pair Python
loop, which is fine for thousands of pairs but crawls at the
tens-of-millions scale this challenge's real data produces. This
version:
  - extracts postal codes with a vectorized regex (no row-wise apply)
  - looks records up in plain Python dicts (dict[] is far faster than
    repeated DataFrame.loc[] in a tight loop)
  - splits work across all CPU cores with multiprocessing
"""
import argparse
import multiprocessing as mp
import pandas as pd
from rapidfuzz import fuzz
from rapidfuzz.distance import Levenshtein

from utils import normalize_name, normalize_address

FEATURE_COLS = [
    "country_match", "name_token_sort", "name_token_set", "name_partial",
    "name_lev_ratio", "name_char3_jaccard", "addr_token_sort",
    "addr_token_set", "addr_char3_jaccard", "postal_match",
    "postal_present_both", "name_len_diff",
]

# module-level so worker processes can see them without re-pickling
# huge dicts on every task
_S1 = None
_OTHER = None


def _char_ngrams(s: str, n: int = 3) -> set:
    s = s.replace(" ", "")
    if len(s) < n:
        return {s} if s else set()
    return {s[i:i + n] for i in range(len(s) - n + 1)}


def _jaccard(a: set, b: set) -> float:
    if not a and not b:
        return 1.0
    if not a or not b:
        return 0.0
    return len(a & b) / len(a | b)


def _load(path: str) -> dict:
    """Returns {entity_id: (norm_name, norm_addr, postal, country)}."""
    df = pd.read_csv(path, sep="\t", dtype=str).fillna("")
    df["norm_name"] = df["business_name"].map(normalize_name)
    df["norm_addr"] = df["business_address"].map(normalize_address)

    country_l = df["country"].str.strip().str.lower()
    postal = pd.Series("", index=df.index)
    for c, pat in (("us", r"\b(\d{5})(?:-\d{4})?\b"),
                   ("india", r"\b(\d{6})\b"),
                   ("france", r"\b(\d{5})\b")):
        mask = country_l == c
        if mask.any():
            postal.loc[mask] = df.loc[mask, "business_address"].str.extract(pat, expand=False).fillna("")
    other_mask = ~country_l.isin(["us", "india", "france"])
    if other_mask.any():
        postal.loc[other_mask] = df.loc[other_mask, "business_address"] \
            .str.extract(r"\b(\d{5,6})\b", expand=False).fillna("")
    df["postal"] = postal

    return {
        eid: (n, a, p, c)
        for eid, n, a, p, c in zip(df["entity_id"], df["norm_name"], df["norm_addr"],
                                    df["postal"], df["country"])
    }


def explode_candidates(cand_path: str) -> pd.DataFrame:
    cand = pd.read_csv(cand_path, sep="\t", dtype=str).fillna("")
    s1_ids, cand_ids = [], []
    for s1_id, ids_str in zip(cand["source1_entity_id"], cand["candidate_entity_ids"]):
        if not ids_str:
            continue
        for cid in ids_str.split(","):
            s1_ids.append(s1_id)
            cand_ids.append(cid)
    return pd.DataFrame({"source1_entity_id": s1_ids, "candidate_entity_id": cand_ids})


def _feature_row(s1_id: str, cand_id: str):
    name_a, addr_a, postal_a, country_a = _S1[s1_id]
    name_b, addr_b, postal_b, country_b = _OTHER[cand_id]
    return (
        int(country_a.strip().lower() == country_b.strip().lower()),
        fuzz.token_sort_ratio(name_a, name_b) / 100.0,
        fuzz.token_set_ratio(name_a, name_b) / 100.0,
        fuzz.partial_ratio(name_a, name_b) / 100.0,
        1 - Levenshtein.normalized_distance(name_a, name_b),
        _jaccard(_char_ngrams(name_a), _char_ngrams(name_b)),
        fuzz.token_sort_ratio(addr_a, addr_b) / 100.0,
        fuzz.token_set_ratio(addr_a, addr_b) / 100.0,
        _jaccard(_char_ngrams(addr_a), _char_ngrams(addr_b)),
        int(bool(postal_a) and postal_a == postal_b),
        int(bool(postal_a) and bool(postal_b)),
        abs(len(name_a) - len(name_b)),
    )


def _feature_chunk(args):
    s1_ids, cand_ids = args
    return [_feature_row(a, b) for a, b in zip(s1_ids, cand_ids)]


def _init_worker(s1_dict, other_dict):
    global _S1, _OTHER
    _S1, _OTHER = s1_dict, other_dict


def build_features(pairs: pd.DataFrame, s1: dict, other: dict, n_jobs: int = 1,
                    chunk_size: int = 200_000) -> pd.DataFrame:
    global _S1, _OTHER
    s1_ids = pairs["source1_entity_id"].tolist()
    cand_ids = pairs["candidate_entity_id"].tolist()
    n = len(s1_ids)
    chunks = [(s1_ids[i:i + chunk_size], cand_ids[i:i + chunk_size]) for i in range(0, n, chunk_size)]

    if n_jobs <= 1:
        _S1, _OTHER = s1, other
        results = [row for chunk in chunks for row in _feature_chunk(chunk)]
    else:
        with mp.Pool(n_jobs, initializer=_init_worker, initargs=(s1, other)) as pool:
            out = []
            for i, chunk_result in enumerate(pool.imap(_feature_chunk, chunks)):
                out.extend(chunk_result)
                print(f"  features: {min((i + 1) * chunk_size, n)}/{n} pairs done", end="\r")
            results = out
        print()

    feats = pd.DataFrame(results, columns=FEATURE_COLS)
    feats.insert(0, "candidate_entity_id", cand_ids)
    feats.insert(0, "source1_entity_id", s1_ids)
    return feats


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("--source1", required=True)
    ap.add_argument("--source2", required=True)
    ap.add_argument("--source3", required=True)
    ap.add_argument("--candidates", required=True)
    ap.add_argument("--out", required=True)
    ap.add_argument("--n-jobs", type=int, default=max(1, mp.cpu_count() - 1))
    args = ap.parse_args()

    s1 = _load(args.source1)
    s2 = _load(args.source2)
    s3 = _load(args.source3)
    other = {**s2, **s3}

    pairs = explode_candidates(args.candidates)
    feats = build_features(pairs, s1, other, n_jobs=args.n_jobs)
    feats.to_parquet(args.out, index=False)
    print(f"Wrote {len(feats)} feature rows to {args.out}")
