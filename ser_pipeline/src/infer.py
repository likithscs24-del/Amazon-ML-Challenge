"""
Score TEST candidate pairs with the trained model, apply the tuned
threshold, and write the two required submission files:
  output/matching_results.tsv
  output/candidate_pairs.tsv   (copied through unchanged — it's the
                                 exact set the model ran inference over)
"""
import argparse
import json
import shutil
import pandas as pd
import lightgbm as lgb

from train import FEATURE_COLS


def main(test_source1_path, test_features_path, test_candidates_path,
         model_path, threshold_path, out_dir):
    model = lgb.Booster(model_file=model_path)
    with open(threshold_path) as fh:
        threshold = json.load(fh)["threshold"]

    feats = pd.read_parquet(test_features_path)
    feats["prob"] = model.predict(feats[FEATURE_COLS])
    kept = feats[feats["prob"] >= threshold]

    matches = (
        kept.groupby("source1_entity_id")["candidate_entity_id"]
        .apply(lambda s: ",".join(sorted(set(s))))
        .to_dict()
    )

    s1 = pd.read_csv(test_source1_path, sep="\t", dtype=str)
    rows = [{"source1_entity_id": eid, "matched_entity_ids": matches.get(eid, "")}
            for eid in s1["entity_id"]]
    out_df = pd.DataFrame(rows)

    out_matches = f"{out_dir}/matching_results.tsv"
    out_df.to_csv(out_matches, sep="\t", index=False)
    print(f"Wrote {len(out_df)} rows to {out_matches}")

    dest_candidates = f"{out_dir}/candidate_pairs.tsv"
    if test_candidates_path != dest_candidates:
        shutil.copy(test_candidates_path, dest_candidates)
    print(f"Copied candidate set to {dest_candidates}")


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("--test-source1", required=True)
    ap.add_argument("--test-features", required=True, help="parquet from features.py on TEST candidates")
    ap.add_argument("--test-candidates", required=True, help="candidate_pairs.tsv for the test set")
    ap.add_argument("--model", default="model.txt")
    ap.add_argument("--threshold", default="threshold.json")
    ap.add_argument("--out-dir", default="output")
    args = ap.parse_args()
    main(args.test_source1, args.test_features, args.test_candidates,
         args.model, args.threshold, args.out_dir)
