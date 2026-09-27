"""
Container entry point for the SageMaker Processing Job. Installs the
extra deps not baked into the base SKLearn image, then runs blocking
followed by feature engineering, reading/writing the paths the
Processing container mounts.
"""
import argparse
import subprocess
import sys
import os

THIS_DIR = os.path.dirname(os.path.abspath(__file__))
SRC_DIR = os.path.join(os.path.dirname(THIS_DIR), "src")
sys.path.insert(0, SRC_DIR)


def pip_install():
    subprocess.check_call([
        sys.executable, "-m", "pip", "install", "-q",
        "sentence-transformers==3.0.1", "faiss-cpu==1.8.0",
        "rapidfuzz==3.9.6", "pyarrow==17.0.0",
    ])


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("--split", choices=["train", "test"], required=True)
    args = ap.parse_args()

    pip_install()
    from blocking import build_candidates
    from features import explode_candidates, build_features, _load

    in_dir = "/opt/ml/processing/input"
    cand_out_dir = "/opt/ml/processing/output/candidates"
    feat_out_dir = "/opt/ml/processing/output/features"
    os.makedirs(cand_out_dir, exist_ok=True)
    os.makedirs(feat_out_dir, exist_ok=True)

    s1_path = f"{in_dir}/s1.tsv"
    s2_path = f"{in_dir}/s2.tsv"
    s3_path = f"{in_dir}/s3.tsv"
    cand_path = f"{cand_out_dir}/{args.split}_candidate_pairs.tsv"
    feat_path = f"{feat_out_dir}/{args.split}_features.parquet"

    build_candidates(s1_path, s2_path, s3_path, cand_path)

    import pandas as pd
    s1 = _load(s1_path)
    s2 = _load(s2_path)
    s3 = _load(s3_path)
    other = pd.concat([s2, s3])
    pairs = explode_candidates(cand_path)
    feats = build_features(pairs, s1, other)
    feats.to_parquet(feat_path, index=False)
    print(f"Done. Candidates -> {cand_path}, Features -> {feat_path}")
