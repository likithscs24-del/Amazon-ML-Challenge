# Business Entity Resolution — AWS SageMaker Solution

## Approach summary

1. **Blocking / candidate generation** (`src/blocking.py`)
   - Partition all three sources by `country` (a true match essentially
     always agrees on country, so this alone cuts the search space by
     ~3x with near-zero recall loss, and keeps the France-only test
     country working with no special-casing).
   - Within each country shard, embed `normalized name + normalized
     address` with `sentence-transformers/all-MiniLM-L6-v2`
     (Apache-2.0, 22M params — well inside the 8B-param / open-license
     rule) and run exact/approximate nearest-neighbor search with
     FAISS to pull the top-K (default 20) most similar Source-2 and
     Source-3 records per Source-1 entity.
   - Add a cheap lexical fallback (shared first name token within the
     same country) to catch cases the embedding model might miss.
   - This is the last stage before matching, so its output *is*
     `candidate_pairs.tsv`, exactly as the brief requires.

2. **Feature engineering** (`src/features.py`)
   - For every (S1, candidate) pair: token-sort/token-set/partial
     fuzzy ratios and normalized Levenshtein similarity on name and
     address, character 3-gram Jaccard, postal/PIN code exact-match
     flags, country-match flag, name length difference.

3. **Matching model** (`src/train.py`)
   - LightGBM binary classifier (MIT-licensed, tiny) trained on
     candidate pairs labeled against `train_ground_truth.tsv`
     (positives = true matches, negatives = every other candidate the
     blocking stage proposed — these are the "hard negatives" that
     matter most).
   - Split by `source1_entity_id` (not by row) so no entity leaks
     across train/validation.
   - Threshold isn't picked by accuracy/AUC — it's swept directly
     against the **macro F_0.5** formula from the brief on the
     validation split, since that's precision-heavy and what's
     actually scored.

4. **Inference** (`src/infer.py`)
   - Score test candidates, keep those above the tuned threshold,
     group by `source1_entity_id`, write `matching_results.tsv`.
   - `candidate_pairs.tsv` for the test set is carried through as-is.

## Why this fits the constraints

- **Scales**: no all-pairs comparison anywhere. Country partitioning +
  ANN search is sub-quadratic and the same code path handles millions
  of records per source.
- **No external lookups**: only the provided TSVs and a locally-run,
  open-weight embedding model are used — no APIs, geocoders, or
  registries.
- **Precision-heavy**: F_0.5 is optimized directly via threshold
  sweep rather than a generic classification metric; singletons are
  handled correctly (empty prediction scores 1.0 when correct).

## Running it locally in VS Code / Jupyter (no AWS needed)

Open `notebook/entity_resolution_pipeline.ipynb` in VS Code (Jupyter
extension, kernel Python 3.9+) and run cells top to bottom. Edit the
config cell first:

```python
DATA_DIR = "./data"              # put the 7 challenge TSVs here
SRC_DIR = "./ser_pipeline/src"
OUT_DIR = "./output"
USE_EMBEDDINGS = False            # False = offline token-index blocking (default)
TOP_K = 20
N_JOBS = <auto-detected from your CPU count>
```

The notebook runs: blocking (train + test) → feature engineering
(parallelized across your CPU cores) → training + threshold tuning →
inference → a local format sanity-check. It produces
`output/matching_results.tsv` and `output/candidate_pairs.tsv`.

**Performance notes for a laptop-scale run** (this challenge's real test
set is ~11.7M records across the three sources):
- `features.py` was rewritten from the original DataFrame-`.apply()`
  version — that version does not scale past a few thousand pairs.
  The current version uses plain dict lookups and `multiprocessing`,
  reaching several hundred thousand pairs/sec/core on the fuzzy-match
  computations.
- If your machine is memory- or CPU-constrained, lower `TOP_K` (e.g. 10)
  to shrink the candidate set before feature engineering — this is the
  single biggest lever, since pair count scales directly with it.
- `USE_EMBEDDINGS=True` needs internet access (downloads
  `all-MiniLM-L6-v2` from Hugging Face the first time) and is slower per
  record than token-index blocking, but recovers matches token overlap
  misses — notably cross-script name pairs (e.g. Devanagari vs.
  transliterated Latin business names), which is where the token-index
  method's recall is weakest (see the India results below).

## Running it on AWS SageMaker

### 0. One-time setup
- Create/choose an S3 bucket, e.g. `s3://my-bucket/entity-resolution/`.
- Upload the challenge data:
  ```
  s3://my-bucket/entity-resolution/data/train_source1.tsv
  s3://my-bucket/entity-resolution/data/train_source2.tsv
  s3://my-bucket/entity-resolution/data/train_source3.tsv
  s3://my-bucket/entity-resolution/data/train_ground_truth.tsv
  s3://my-bucket/entity-resolution/data/test_source1.tsv
  s3://my-bucket/entity-resolution/data/test_source2.tsv
  s3://my-bucket/entity-resolution/data/test_source3.tsv
  ```
- Open a SageMaker Studio notebook (or a classic Notebook Instance),
  kernel `Python 3 (Data Science)`, and clone/upload this
  `ser_pipeline/` folder there. `pip install -r requirements.txt`.

### 1. Quick path — run everything inside one notebook/instance
Good for a first pass or if the data comfortably fits on one machine
(`ml.m5.4xlarge` / `ml.g4dn.xlarge` for faster embeddings):

```bash
cd ser_pipeline/src

# Candidate generation (train + test)
python blocking.py --source1 ../data/train_source1.tsv --source2 ../data/train_source2.tsv \
    --source3 ../data/train_source3.tsv --out ../output/train_candidate_pairs.tsv
python blocking.py --source1 ../data/test_source1.tsv --source2 ../data/test_source2.tsv \
    --source3 ../data/test_source3.tsv --out ../output/candidate_pairs.tsv

# Features
python features.py --source1 ../data/train_source1.tsv --source2 ../data/train_source2.tsv \
    --source3 ../data/train_source3.tsv --candidates ../output/train_candidate_pairs.tsv \
    --out ../output/train_features.parquet
python features.py --source1 ../data/test_source1.tsv --source2 ../data/test_source2.tsv \
    --source3 ../data/test_source3.tsv --candidates ../output/candidate_pairs.tsv \
    --out ../output/test_features.parquet

# Train + tune threshold
python train.py --features ../output/train_features.parquet \
    --ground-truth ../data/train_ground_truth.tsv \
    --model-out ../output/model.txt --threshold-out ../output/threshold.json

# Inference -> final submission files
python infer.py --test-source1 ../data/test_source1.tsv \
    --test-features ../output/test_features.parquet \
    --test-candidates ../output/candidate_pairs.tsv \
    --model ../output/model.txt --threshold ../output/threshold.json \
    --out-dir ../output
```

Then validate before submitting:
```bash
python utils/validate_submission.py --matching ../output/matching_results.tsv \
    --candidate ../output/candidate_pairs.tsv --test-dir ../data
```

### 2. Scaled path — SageMaker Processing + Training Jobs
If a single notebook kernel struggles with the full data volume, offload
the heavy stages to managed jobs (from the Studio notebook, with the
SageMaker Python SDK and an execution role available):

```bash
# Blocking + features as a Processing Job (repeat for split=train and split=test)
python sagemaker/launch_processing_job.py --bucket my-bucket \
    --prefix entity-resolution --split train
python sagemaker/launch_processing_job.py --bucket my-bucket \
    --prefix entity-resolution --split test

# Training as a Training Job
python sagemaker/launch_training_job.py --bucket my-bucket --prefix entity-resolution
```
Download the resulting `model.txt` / `threshold.json` from
`s3://my-bucket/entity-resolution/model/` and run `infer.py` locally
(it's cheap — just scoring the already-computed test feature table),
or wrap it in a third Processing Job the same way if you'd rather keep
it all server-side.

## Validated against the real test files (11.7M records)

`test_source1` (1,732,544 rows), `test_source2` (4,887,274 rows) and
`test_source3` (5,082,317 rows) were actually run through a
**network-free** alternative to the embedding-based blocking above —
`src/blocking_token_index.py` — since a locked-down sandbox has no
route to Hugging Face for the embedding model. It builds an inverted
index from normalized name tokens (plus an exact postal/PIN-code
index) per country/source, with a max-document-frequency cutoff so
generic tokens don't blow up candidate lists. Results, run country by
country (`merge_candidates.py` stitches them back into one file):

| Country | S1 entities | S2 pool | S3 pool | Runtime | Got ≥1 candidate |
|---|---|---|---|---|---|
| France | 259,452 | 703,378 | 731,615 | ~2 min | 83.0% |
| US | 663,106 | 1,871,330 | 1,945,701 | ~5 min | 77.9% |
| India | 809,986 | 2,312,565 | 2,405,000 | ~5 min | 59.4% |
| **Total** | **1,732,544** | | | | **70.0%** |

Format-validated: exactly one row per S1 entity, no duplicate S1 rows,
every candidate ID exists in the real test_source2/3 files, no
duplicate IDs within a row, ~32 candidates/entity on average (median
50 when non-empty, capped at 25 per source).

**India's lower coverage is a real, diagnosed limitation**, not noise:
a meaningful share of Source-2/3 India records use Devanagari script
for the business name (e.g. `मॉडर्न फाइनेंस`) while the matching
Source-1 record may be transliterated to Latin script. Pure token
overlap can't bridge that — this is exactly the gap the
embedding-based approach in `blocking.py` is meant to close (a
multilingual sentence embedding model would place a transliteration
pair close in vector space even with zero shared tokens). Recommended
fix once running on SageMaker (which has internet egress to Hugging
Face): run `blocking_token_index.py`'s output as a fast first pass,
then run `blocking.py`'s embedding search *only* on the India entities
that got zero or few token-index candidates, and union the two
candidate sets.

## Tuning knobs worth trying
- `blocking.py --top-k`: raise if validation recall (candidates that
  actually contain the true match) is too low; lower to shrink the
  candidate set (scored as a tie-breaker in the final ranking).
- LightGBM `num_leaves` / `min_data_in_leaf` in `train.py`: guard
  against overfitting given how imbalanced match/non-match pairs are.
- Country-specific address parsing in `utils.extract_postal_code` —
  the France PIN regex is a rough guess; check it against real
  training addresses and tighten it.
- Consider a second, higher threshold band for ambiguous score ranges
  reviewed with extra rules (e.g. require postal_match when
  name similarity is only moderate) to push precision further, since
  F_0.5 rewards that 2x over recall.

## Package structure (maps to the required submission zip)
```
ser_pipeline/
├── src/                  -> code/business_entity_resolution/src/
├── sagemaker/            -> optional, for the Processing/Training job launchers
├── requirements.txt      -> code/business_entity_resolution/requirements.txt
├── README.md             -> code/business_entity_resolution/README.md
└── output/               -> output/ (matching_results.tsv, candidate_pairs.tsv)
```
