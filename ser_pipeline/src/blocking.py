"""
Candidate generation (blocking) stage.

Design goals, given the scale constraint in the brief:
  - Never do an all-pairs comparison. Partition by country first (a
    correct match essentially always agrees on country), then do
    approximate nearest-neighbour search within each country shard.
  - Use a small, MIT/Apache-2.0, <8B-param embedding model
    (sentence-transformers/all-MiniLM-L6-v2, 22M params, Apache-2.0)
    to embed "normalized name + normalized address" and search with
    FAISS (inner product over L2-normalized vectors = cosine sim).
  - Add a cheap lexical fallback (shared first-name-token + country)
    so candidates aren't missed purely because the embedding model
    misses a paraphrase.

Output: candidate_pairs.tsv with columns
  source1_entity_id, candidate_entity_ids
This is deliberately generated *before* the classifier filters it —
it is the exact set fed to the matching model, per the spec.
"""
import argparse
import numpy as np
import pandas as pd
import faiss
from sentence_transformers import SentenceTransformer
from collections import defaultdict

from utils import normalize_name, normalize_address

EMBED_MODEL = "sentence-transformers/all-MiniLM-L6-v2"  # Apache-2.0, 22M params
TOP_K = 20  # candidates per (S1 entity, source) — tune on validation recall


def _text_for_embedding(df: pd.DataFrame) -> pd.Series:
    return (df["norm_name"] + " || " + df["norm_addr"]).values


def _load_and_normalize(path: str) -> pd.DataFrame:
    df = pd.read_csv(path, sep="\t", dtype=str).fillna("")
    df["norm_name"] = df["business_name"].map(normalize_name)
    df["norm_addr"] = df["business_address"].map(normalize_address)
    df["country_key"] = df["country"].str.strip().str.lower()
    df["first_token"] = df["norm_name"].str.split().str[0].fillna("")
    return df


def _embed(model: SentenceTransformer, texts, batch_size=512) -> np.ndarray:
    vecs = model.encode(
        list(texts), batch_size=batch_size, show_progress_bar=True,
        normalize_embeddings=True, convert_to_numpy=True,
    )
    return vecs.astype("float32")


def build_candidates(s1_path: str, s2_path: str, s3_path: str, out_path: str,
                      top_k: int = TOP_K, model_name: str = EMBED_MODEL):
    model = SentenceTransformer(model_name)

    s1 = _load_and_normalize(s1_path)
    s2 = _load_and_normalize(s2_path)
    s3 = _load_and_normalize(s3_path)

    candidates = defaultdict(list)  # s1_entity_id -> [candidate_ids]

    for country, s1_grp in s1.groupby("country_key"):
        s1_idx = s1_grp.index.to_numpy()
        s1_emb = _embed(model, _text_for_embedding(s1_grp))

        for other_name, other_df in (("s2", s2), ("s3", s3)):
            other_grp = other_df[other_df["country_key"] == country]
            if other_grp.empty:
                continue
            other_idx = other_grp.index.to_numpy()
            other_emb = _embed(model, _text_for_embedding(other_grp))

            k = min(top_k, len(other_grp))
            index = faiss.IndexFlatIP(other_emb.shape[1])
            index.add(other_emb)
            sims, neighbors = index.search(s1_emb, k)

            other_ids = other_grp["entity_id"].to_numpy()
            for row_i, s1_row_pos in enumerate(range(len(s1_grp))):
                s1_id = s1_grp["entity_id"].iloc[s1_row_pos]
                for j in range(k):
                    if sims[row_i, j] <= 0:
                        continue
                    candidates[s1_id].append(other_ids[neighbors[row_i, j]])

            # cheap lexical fallback: same country + same first name token
            tok_index = defaultdict(list)
            for pos, tok in enumerate(other_grp["first_token"].values):
                if tok:
                    tok_index[tok].append(other_grp["entity_id"].iloc[pos])
            for pos, tok in enumerate(s1_grp["first_token"].values):
                if not tok:
                    continue
                s1_id = s1_grp["entity_id"].iloc[pos]
                for cand_id in tok_index.get(tok, [])[:top_k]:
                    candidates[s1_id].append(cand_id)

    # dedupe, write output — every S1 id must appear even with zero candidates
    rows = []
    for s1_id in s1["entity_id"]:
        ids = sorted(set(candidates.get(s1_id, [])))
        rows.append({"source1_entity_id": s1_id, "candidate_entity_ids": ",".join(ids)})
    pd.DataFrame(rows).to_csv(out_path, sep="\t", index=False)
    print(f"Wrote {len(rows)} candidate rows to {out_path}")


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("--source1", required=True)
    ap.add_argument("--source2", required=True)
    ap.add_argument("--source3", required=True)
    ap.add_argument("--out", required=True)
    ap.add_argument("--top-k", type=int, default=TOP_K)
    args = ap.parse_args()
    build_candidates(args.source1, args.source2, args.source3, args.out, args.top_k)
