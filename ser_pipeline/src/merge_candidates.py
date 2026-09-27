"""
Merge per-country candidate_pairs TSVs (produced by running
blocking_token_index.py once per country) into a single file covering
every Source-1 test entity, in the original test_source1 row order.
"""
import argparse
import pandas as pd


def merge(source1_path: str, country_files: list, out_path: str):
    lookup = {}
    for path in country_files:
        df = pd.read_csv(path, sep="\t", dtype=str).fillna("")
        for _, r in df.iterrows():
            lookup[r["source1_entity_id"]] = r["candidate_entity_ids"]

    s1 = pd.read_csv(source1_path, sep="\t", dtype=str)
    rows = [{"source1_entity_id": eid, "candidate_entity_ids": lookup.get(eid, "")}
            for eid in s1["entity_id"]]
    out = pd.DataFrame(rows)
    out.to_csv(out_path, sep="\t", index=False)

    n_with = (out["candidate_entity_ids"] != "").sum()
    print(f"Merged {len(country_files)} country files -> {len(out)} rows, "
          f"{n_with} ({n_with/len(out)*100:.1f}%) with >=1 candidate")


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("--source1", required=True)
    ap.add_argument("--country-files", nargs="+", required=True)
    ap.add_argument("--out", required=True)
    args = ap.parse_args()
    merge(args.source1, args.country_files, args.out)
