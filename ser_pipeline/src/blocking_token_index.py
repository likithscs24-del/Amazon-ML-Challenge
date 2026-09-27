"""
Token-index blocking — an alternative to blocking.py's embedding+FAISS
approach that needs NO model download and NO GPU. Useful when:
  - running in a locked-down / offline environment (no Hugging Face egress)
  - as a fast first pass before the heavier embedding-based refinement
  - sanity-checking the pipeline on real data before a full SageMaker run

Method: inverted index. For each (country, source) shard, map every
significant name token -> list of entity_ids containing it. A Source-1
entity's candidates are the union of postings for its own name tokens
(plus an exact-postal-code index), with two scale guards:
  - overly common tokens (df above --max-df) are dropped as
    non-distinctive (they'd blow up candidate-list size for ~zero
    precision benefit)
  - a small English/French/Hindi-transliteration stopword list is
    stripped before indexing

This is pure Python + pandas, streams input in chunks, and comfortably
handles multi-million-row sources on a single small instance.
"""
import argparse
import time
from collections import defaultdict, Counter
import pandas as pd

from utils import normalize_name, normalize_address, extract_postal_code

STOPWORDS = {"the", "of", "and", "for", "de", "la", "le", "du", "des", "et"}


def _tokens(norm_name: str):
    return [t for t in norm_name.split() if t and t not in STOPWORDS and len(t) > 1]


def _load_chunked(path: str, country: str, chunksize: int = 200_000) -> pd.DataFrame:
    parts = []
    for chunk in pd.read_csv(path, sep="\t", dtype=str, chunksize=chunksize):
        chunk = chunk.fillna("")
        sub = chunk[chunk["country"].str.strip().str.lower() == country.lower()]
        if not sub.empty:
            parts.append(sub)
    if not parts:
        return pd.DataFrame(columns=["entity_id", "business_name", "business_address", "country"])
    df = pd.concat(parts, ignore_index=True)
    df["norm_name"] = df["business_name"].map(normalize_name)
    # vectorized postal extraction (single country per call, so one regex suffices)
    country_l = country.strip().lower()
    if country_l == "us":
        pat = r"\b(\d{5})(?:-\d{4})?\b"
    elif country_l == "india":
        pat = r"\b(\d{6})\b"
    else:
        pat = r"\b(\d{5,6})\b"
    df["postal"] = df["business_address"].str.extract(pat, expand=False)
    df["postal"] = df["postal"].fillna("")
    return df


def _build_index(df: pd.DataFrame, max_df: int):
    token_index = defaultdict(list)
    postal_index = defaultdict(list)
    df_counts = Counter()

    for eid, name in zip(df["entity_id"], df["norm_name"]):
        for tok in set(_tokens(name)):
            df_counts[tok] += 1

    dropped = {tok for tok, c in df_counts.items() if c > max_df}

    for eid, name, postal in zip(df["entity_id"], df["norm_name"], df["postal"]):
        for tok in set(_tokens(name)):
            if tok not in dropped:
                token_index[tok].append(eid)
        if postal:
            postal_index[postal].append(eid)

    return token_index, postal_index, dropped


def build_candidates_for_country(s1_path, s2_path, s3_path, country, max_df=2000, top_k=25):
    t0 = time.time()
    s1 = _load_chunked(s1_path, country)
    s2 = _load_chunked(s2_path, country)
    s3 = _load_chunked(s3_path, country)
    print(f"[{country}] loaded S1={len(s1)} S2={len(s2)} S3={len(s3)} in {time.time()-t0:.1f}s")

    candidates = defaultdict(set)
    for label, other in (("s2", s2), ("s3", s3)):
        t1 = time.time()
        token_idx, postal_idx, dropped = _build_index(other, max_df)
        print(f"[{country}/{label}] index built: {len(token_idx)} tokens "
              f"({len(dropped)} dropped as too common), {len(postal_idx)} postal keys, "
              f"{time.time()-t1:.1f}s")

        t2 = time.time()
        for eid, name, postal in zip(s1["entity_id"], s1["norm_name"], s1["postal"]):
            hits = Counter()
            for tok in set(_tokens(name)):
                for cid in token_idx.get(tok, ()):
                    hits[cid] += 1
            if postal:
                for cid in postal_idx.get(postal, ()):
                    hits[cid] += 3  # postal match is a strong signal
            for cid, _score in hits.most_common(top_k):
                candidates[eid].add(cid)
        print(f"[{country}/{label}] candidate lookup done in {time.time()-t2:.1f}s")

    rows = []
    for eid in s1["entity_id"]:
        ids = sorted(candidates.get(eid, set()))
        rows.append({"source1_entity_id": eid, "candidate_entity_ids": ",".join(ids)})
    out = pd.DataFrame(rows)
    n_with_cand = (out["candidate_entity_ids"] != "").sum()
    print(f"[{country}] {len(out)} S1 entities, {n_with_cand} ({n_with_cand/len(out)*100:.1f}%) "
          f"got >=1 candidate, total time {time.time()-t0:.1f}s")
    return out


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("--source1", required=True)
    ap.add_argument("--source2", required=True)
    ap.add_argument("--source3", required=True)
    ap.add_argument("--country", required=True)
    ap.add_argument("--out", required=True)
    ap.add_argument("--max-df", type=int, default=2000)
    ap.add_argument("--top-k", type=int, default=25)
    args = ap.parse_args()
    result = build_candidates_for_country(
        args.source1, args.source2, args.source3, args.country, args.max_df, args.top_k
    )
    result.to_csv(args.out, sep="\t", index=False)
    print(f"Wrote {args.out}")
