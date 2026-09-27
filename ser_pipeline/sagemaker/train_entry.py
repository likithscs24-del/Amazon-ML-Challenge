import os
import sys
import subprocess
import tarfile

sys.path.insert(0, "src")


def pip_install():
    subprocess.check_call([sys.executable, "-m", "pip", "install", "-q", "lightgbm==4.5.0", "pyarrow==17.0.0"])


if __name__ == "__main__":
    pip_install()
    from train import main as train_main

    # SageMaker SKLearn container conventions
    features_dir = os.environ.get("SM_CHANNEL_FEATURES", "/opt/ml/input/data/features")
    gt_dir = os.environ.get("SM_CHANNEL_GROUND_TRUTH", "/opt/ml/input/data/ground_truth")
    model_dir = os.environ.get("SM_MODEL_DIR", "/opt/ml/model")

    features_path = next(
        os.path.join(features_dir, f) for f in os.listdir(features_dir) if f.endswith(".parquet")
    )
    gt_path = next(
        os.path.join(gt_dir, f) for f in os.listdir(gt_dir) if f.endswith(".tsv")
    )

    model_out = os.path.join(model_dir, "model.txt")
    threshold_out = os.path.join(model_dir, "threshold.json")
    train_main(features_path, gt_path, model_out, threshold_out)
    print("Saved model + threshold to", model_dir)
