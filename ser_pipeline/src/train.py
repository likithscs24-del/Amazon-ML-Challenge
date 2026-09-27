"""
Train a LightGBM binary classifier on candidate pairs, using
train_ground_truth.tsv to label each (S1, candidate) pair as
match / non-match. Also sweeps a decision threshold on a held-out
split to maximize macro F_0.5 (the actual competition metric),
since accuracy/AUC don't directly optimize what's being scored.

LightGBM is MIT-licensed and nowhere near the 8B-parameter cap.
"""
import argparse
import json
import numpy as np
import pandas as pd
import lightgbm as lgb
from sklearn.model_selection import GroupShuffleSplit

from utils import macro_f_beta

FEATURE_COLS = [
    "country_match", "name_token_sort", "name_token_set", "name_partial",
    "name_lev_ratio", "name_char3_jaccard", "addr_token_sort",
    "addr_token_set", "addr_char3_jaccard", "postal_match",
    "postal_present_both", "name_len_diff",
]


def label_pairs(feats: pd.DataFrame, ground_truth_path: str) -> pd.DataFrame:
    gt = pd.read_csv(ground_truth_path, sep="\t", dtype=str).fillna("")
    truth_map = {}
    for s1_id, ids_str in zip(gt["source1_entity_id"], gt["matched_entity_ids"]):
        truth_map[s1_id] = set(x for x in ids_str.split(",") if x)

    # vectorized-ish: plain python loop over dict/set lookups, not
    # DataFrame.apply — orders of magnitude faster at millions of rows
    labels = [
        int(cid in truth_map.get(s1_id, ()))
        for s1_id, cid in zip(feats["source1_entity_id"], feats["candidate_entity_id"])
    ]
    feats = feats.copy()
    feats["label"] = labels
    return feats, truth_map


def sweep_threshold(val_feats: pd.DataFrame, val_probs: np.ndarray, truth_map: dict):
    # group once into {s1_id: [(candidate_id, prob), ...]} instead of
    # re-running groupby for every threshold in the sweep
    groups = {}
    for s1_id, cid, prob in zip(val_feats["source1_entity_id"], val_feats["candidate_entity_id"], val_probs):
        groups.setdefault(s1_id, []).append((cid, prob))

    best_t, best_f = 0.5, -1.0
    for t in np.arange(0.05, 0.96, 0.02):
        pred_map = {s1_id: {cid for cid, p in lst if p >= t} for s1_id, lst in groups.items()}
        score = macro_f_beta(pred_map, truth_map, beta=0.5)
        if score > best_f:
            best_f, best_t = score, t
    return best_t, best_f


def main(features_path, ground_truth_path, model_out, threshold_out):
    feats = pd.read_parquet(features_path)
    feats, truth_map = label_pairs(feats, ground_truth_path)

    # group split by source1_entity_id so no leakage of an S1 entity's
    # pairs across train/val
    gss = GroupShuffleSplit(n_splits=1, test_size=0.2, random_state=42)
    train_idx, val_idx = next(gss.split(feats, groups=feats["source1_entity_id"]))
    train_df, val_df = feats.iloc[train_idx], feats.iloc[val_idx]

    train_set = lgb.Dataset(train_df[FEATURE_COLS], label=train_df["label"])
    val_set = lgb.Dataset(val_df[FEATURE_COLS], label=val_df["label"], reference=train_set)

    params = dict(
        objective="binary", metric="auc", learning_rate=0.05,
        num_leaves=31, min_data_in_leaf=50, feature_fraction=0.9,
        bagging_fraction=0.8, bagging_freq=5, is_unbalance=True, verbose=-1,
    )
    model = lgb.train(
        params, train_set, num_boost_round=500, valid_sets=[val_set],
        callbacks=[lgb.early_stopping(30), lgb.log_evaluation(50)],
    )
    model.save_model(model_out)

    val_probs = model.predict(val_df[FEATURE_COLS])
    # restrict truth_map to the S1 ids present in the val split for a fair sweep
    val_truth = {k: v for k, v in truth_map.items() if k in set(val_df["source1_entity_id"])}
    best_t, best_f = sweep_threshold(val_df, val_probs, val_truth)
    print(f"Best threshold={best_t:.2f}  val macro F0.5={best_f:.4f}")

    with open(threshold_out, "w") as fh:
        json.dump({"threshold": float(best_t), "val_f0_5": float(best_f)}, fh, indent=2)


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("--features", required=True, help="parquet from features.py, built on TRAIN candidates")
    ap.add_argument("--ground-truth", required=True)
    ap.add_argument("--model-out", default="model.txt")
    ap.add_argument("--threshold-out", default="threshold.json")
    args = ap.parse_args()
    main(args.features, args.ground_truth, args.model_out, args.threshold_out)
