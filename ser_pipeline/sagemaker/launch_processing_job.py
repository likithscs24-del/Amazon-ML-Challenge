"""
Runs blocking.py + features.py as a SageMaker Processing Job instead of
inline in a notebook, so the heavy embedding/ANN step gets a dedicated
(optionally GPU) instance and doesn't tie up your Studio kernel.

Usage (from a SageMaker notebook / Studio terminal with the SageMaker
Python SDK installed):

    python sagemaker/launch_processing_job.py \
        --bucket my-bucket \
        --prefix entity-resolution \
        --split train            # or "test"

Expects your source TSVs already uploaded to:
    s3://<bucket>/<prefix>/data/<split>_source1.tsv
    s3://<bucket>/<prefix>/data/<split>_source2.tsv
    s3://<bucket>/<prefix>/data/<split>_source3.tsv

Writes:
    s3://<bucket>/<prefix>/candidates/<split>_candidate_pairs.tsv
    s3://<bucket>/<prefix>/features/<split>_features.parquet
"""
import argparse
import sagemaker
from sagemaker.sklearn.processing import SKLearnProcessor
from sagemaker.processing import ProcessingInput, ProcessingOutput

ENTRY_SCRIPT = "run_blocking_and_features.sh"


def main(bucket, prefix, split, instance_type, role):
    sess = sagemaker.Session()
    role = role or sagemaker.get_execution_role()

    processor = SKLearnProcessor(
        framework_version="1.2-1",
        role=role,
        instance_type=instance_type,   # e.g. ml.m5.4xlarge, or ml.g4dn.xlarge for GPU embeddings
        instance_count=1,
        sagemaker_session=sess,
        base_job_name=f"er-{split}-blocking",
    )

    s3_data = f"s3://{bucket}/{prefix}/data"
    s3_out_cand = f"s3://{bucket}/{prefix}/candidates"
    s3_out_feat = f"s3://{bucket}/{prefix}/features"

    processor.run(
        code="sagemaker/run_blocking_and_features.py",
        source_dir=".",  # ships src/ alongside so imports resolve
        inputs=[
            ProcessingInput(source=f"{s3_data}/{split}_source1.tsv", destination="/opt/ml/processing/input/s1.tsv"),
            ProcessingInput(source=f"{s3_data}/{split}_source2.tsv", destination="/opt/ml/processing/input/s2.tsv"),
            ProcessingInput(source=f"{s3_data}/{split}_source3.tsv", destination="/opt/ml/processing/input/s3.tsv"),
        ],
        outputs=[
            ProcessingOutput(source="/opt/ml/processing/output/candidates", destination=s3_out_cand),
            ProcessingOutput(source="/opt/ml/processing/output/features", destination=s3_out_feat),
        ],
        arguments=["--split", split],
    )


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("--bucket", required=True)
    ap.add_argument("--prefix", default="entity-resolution")
    ap.add_argument("--split", choices=["train", "test"], required=True)
    ap.add_argument("--instance-type", default="ml.m5.4xlarge")
    ap.add_argument("--role", default=None)
    args = ap.parse_args()
    main(args.bucket, args.prefix, args.split, args.instance_type, args.role)
