"""
Runs train.py as a SageMaker Training Job using the SKLearn framework
container (script mode) with lightgbm installed via requirements.txt.

Usage:
    python sagemaker/launch_training_job.py \
        --bucket my-bucket --prefix entity-resolution

Expects:
    s3://<bucket>/<prefix>/features/train_features.parquet
    s3://<bucket>/<prefix>/data/train_ground_truth.tsv
Writes model.txt + threshold.json to:
    s3://<bucket>/<prefix>/model/
"""
import argparse
import sagemaker
from sagemaker.sklearn.estimator import SKLearn


def main(bucket, prefix, instance_type, role):
    sess = sagemaker.Session()
    role = role or sagemaker.get_execution_role()

    estimator = SKLearn(
        entry_point="train_entry.py",
        source_dir="sagemaker",          # ships src/train.py, utils.py via dependencies
        dependencies=["src"],
        framework_version="1.2-1",
        instance_type=instance_type,     # ml.m5.2xlarge is plenty for a tabular GBM
        instance_count=1,
        role=role,
        sagemaker_session=sess,
        base_job_name="er-lgbm-train",
        hyperparameters={},
    )

    estimator.fit({
        "features": f"s3://{bucket}/{prefix}/features/train_features.parquet",
        "ground_truth": f"s3://{bucket}/{prefix}/data/train_ground_truth.tsv",
    })
    print("Model artifact:", estimator.model_data)


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("--bucket", required=True)
    ap.add_argument("--prefix", default="entity-resolution")
    ap.add_argument("--instance-type", default="ml.m5.2xlarge")
    ap.add_argument("--role", default=None)
    args = ap.parse_args()
    main(args.bucket, args.prefix, args.instance_type, args.role)
