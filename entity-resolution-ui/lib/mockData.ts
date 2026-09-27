// Mock data shaped after the real ser_pipeline outputs (candidate_pairs.tsv,
// features.parquet, matching_results.tsv, threshold.json). Swap the functions
// in lib/api.ts for real fetch calls once the pipeline exposes an API —
// every component below only depends on these types, not on mock vs. real.

export type Country = "india" | "us" | "france";

export interface CountryStat {
  key: Country;
  label: string;
  s1: number;
  s2: number;
  s3: number;
  coveragePct: number; // % of S1 entities that got >=1 candidate
  note?: string;
}

export const COUNTRY_STATS: CountryStat[] = [
  { key: "france", label: "France", s1: 259452, s2: 703378, s3: 731615, coveragePct: 83.0 },
  { key: "us", label: "United States", s1: 663106, s2: 1871330, s3: 1945701, coveragePct: 77.9 },
  {
    key: "india",
    label: "India",
    s1: 809986,
    s2: 2312565,
    s3: 2405000,
    coveragePct: 59.4,
    note: "Devanagari vs. transliterated-Latin names limit token overlap — embedding search closes most of this gap.",
  },
];

export const TOTALS = {
  totalRecords: 1732544 + 4887274 + 5082317,
  s1: 1732544,
  s2: 4887274,
  s3: 5082317,
  candidatePairsApprox: 56_400_000,
  matchedApprox: 8_200_000,
  avgCandidatesPerEntity: 32,
  modelVersion: "LightGBM v1.4",
  latencyMs: 284,
};

export const FEATURE_COLS = [
  { key: "country_match", label: "Country", kind: "binary" as const, group: "geo" },
  { key: "postal_match", label: "Postal", kind: "binary" as const, group: "geo" },
  { key: "postal_present_both", label: "Postal present (both)", kind: "binary" as const, group: "geo" },
  { key: "name_token_sort", label: "Name — token sort", kind: "pct" as const, group: "name" },
  { key: "name_token_set", label: "Name — token set", kind: "pct" as const, group: "name" },
  { key: "name_partial", label: "Name — partial", kind: "pct" as const, group: "name" },
  { key: "name_lev_ratio", label: "Name — Levenshtein", kind: "pct" as const, group: "name" },
  { key: "name_char3_jaccard", label: "Name — 3-gram Jaccard", kind: "pct" as const, group: "name" },
  { key: "name_len_diff", label: "Name length diff", kind: "raw" as const, group: "name" },
  { key: "addr_token_sort", label: "Address — token sort", kind: "pct" as const, group: "address" },
  { key: "addr_token_set", label: "Address — token set", kind: "pct" as const, group: "address" },
  { key: "addr_char3_jaccard", label: "Address — 3-gram Jaccard", kind: "pct" as const, group: "address" },
];

export type MatchStatus = "matched" | "review" | "rejected";

export interface Candidate {
  id: string;
  source: "s2" | "s3";
  name: string;
  address: string;
  country: Country;
  probability: number; // 0..1 model output
  status: MatchStatus;
  features: Record<string, number>;
}

export interface EntityRecord {
  id: string;
  source: "s1";
  name: string;
  address: string;
  country: Country;
  status: MatchStatus;
  topProbability: number;
  candidates: Candidate[];
}

function mkFeatures(base: number): Record<string, number> {
  const jitter = () => Math.max(0, Math.min(1, base + (Math.random() - 0.5) * 0.15));
  return {
    country_match: base > 0.5 ? 1 : Math.random() > 0.3 ? 1 : 0,
    postal_match: base > 0.7 ? 1 : 0,
    postal_present_both: 1,
    name_token_sort: jitter(),
    name_token_set: Math.min(1, jitter() + 0.03),
    name_partial: Math.min(1, jitter() + 0.05),
    name_lev_ratio: jitter(),
    name_char3_jaccard: jitter() * 0.9,
    name_len_diff: Math.round((1 - base) * 12),
    addr_token_sort: jitter() * 0.95,
    addr_token_set: jitter(),
    addr_char3_jaccard: jitter() * 0.85,
  };
}

function statusFor(p: number): MatchStatus {
  if (p >= 0.73) return "matched";
  if (p >= 0.45) return "review";
  return "rejected";
}

const NAME_BANK: Record<Country, [string, string][]> = {
  india: [
    ["ABC PHARMA LTD", "ABC PHARMA PRIVATE LIMITED"],
    ["MODERN FINANCE CO", "MODERN FINANCE PVT LTD"],
    ["SUNRISE TEXTILES", "SUNRISE TEXTILE MILLS LTD"],
    ["GANGA AGRO EXPORTS", "GANGA AGRO EXPORTS PVT LTD"],
    ["VERMA STEEL WORKS", "VERMA STEEL INDUSTRIES"],
  ],
  us: [
    ["GLOBAL FOODS INC", "GLOBAL FOODS LLC"],
    ["NORTHSTAR LOGISTICS", "NORTHSTAR LOGISTICS CORP"],
    ["BLUE RIDGE CAPITAL", "BLUE RIDGE CAPITAL PARTNERS"],
    ["SUMMIT MEDICAL GROUP", "SUMMIT MEDICAL GROUP LLC"],
    ["CASCADE ENERGY CO", "CASCADE ENERGY CORPORATION"],
  ],
  france: [
    ["BOULANGERIE MARTIN", "BOULANGERIE MARTIN SARL"],
    ["ATELIER LUMIERE", "ATELIER LUMIERE SAS"],
    ["GROUPE DUPONT", "GROUPE DUPONT ET FILS"],
    ["PHARMACIE CENTRALE", "PHARMACIE CENTRALE SASU"],
    ["TRANSPORT ROUSSEAU", "TRANSPORTS ROUSSEAU SA"],
  ],
};

const ADDR_BANK: Record<Country, string[]> = {
  india: ["Andheri East, Mumbai 400069", "Sector 18, Gurugram 122015", "Koramangala, Bengaluru 560034"],
  us: ["4500 Market St, Philadelphia PA 19104", "220 5th Ave, New York NY 10001", "88 Bay St, San Francisco CA 94133"],
  france: ["12 Rue de Rivoli, Paris 75001", "5 Avenue Jean Jaures, Lyon 69007", "9 Cours Mirabeau, Aix-en-Provence 13100"],
};

function buildEntity(idx: number, country: Country): EntityRecord {
  const bank = NAME_BANK[country][idx % NAME_BANK[country].length];
  const addr = ADDR_BANK[country][idx % ADDR_BANK[country].length];
  const s1Id = `S1_${country.slice(0, 2).toUpperCase()}${String(1800 + idx)}`;

  const nCandidates = 2 + (idx % 3);
  const candidates: Candidate[] = Array.from({ length: nCandidates }).map((_, ci) => {
    const p = Math.max(0.05, Math.min(0.99, 0.95 - ci * (0.18 + Math.random() * 0.12)));
    return {
      id: `${ci === 0 ? "S2" : "S3"}_${String(9000 + idx * 3 + ci)}`,
      source: ci === 0 ? "s2" : "s3",
      name: ci === 0 ? bank[1] : `${bank[1]} (${["Branch", "Group", "Holdings"][ci % 3]})`,
      address: addr,
      country,
      probability: p,
      status: statusFor(p),
      features: mkFeatures(p),
    };
  });

  const top = candidates[0]?.probability ?? 0;
  return {
    id: s1Id,
    source: "s1",
    name: bank[0],
    address: addr,
    country,
    status: statusFor(top),
    topProbability: top,
    candidates,
  };
}

export const ENTITIES: EntityRecord[] = (["india", "us", "france"] as Country[]).flatMap((c) =>
  Array.from({ length: 24 }).map((_, i) => buildEntity(i, c))
);

export function getEntity(id: string): EntityRecord | undefined {
  return ENTITIES.find((e) => e.id === id);
}

// --- Training Observatory mock series -------------------------------------

export const TRAINING_CURVE = Array.from({ length: 68 }).map((_, i) => {
  const trainLoss = 0.62 * Math.exp(-i / 22) + 0.03 + Math.random() * 0.004;
  const valLoss = 0.64 * Math.exp(-i / 20) + 0.045 + Math.random() * 0.006;
  const auc = Math.min(0.984, 0.74 + (1 - Math.exp(-i / 14)) * 0.25);
  return { iteration: i, trainLoss: +trainLoss.toFixed(4), valLoss: +valLoss.toFixed(4), auc: +auc.toFixed(4) };
});

// Precision / recall / F0.5 across the actual sweep range used in train.py
export const THRESHOLD_SWEEP = Array.from({ length: 46 }).map((_, i) => {
  const t = +(0.05 + i * 0.02).toFixed(2);
  const precision = 0.58 + 0.41 * (t / 0.95) ** 1.4;
  const recall = 0.97 - 0.55 * (t / 0.95) ** 1.1;
  const beta2 = 0.25;
  const f05 = ((1 + beta2) * precision * recall) / (beta2 * precision + recall);
  return { threshold: t, precision: +precision.toFixed(3), recall: +recall.toFixed(3), f05: +f05.toFixed(3) };
});

export const BEST_THRESHOLD = THRESHOLD_SWEEP.reduce((best, cur) => (cur.f05 > best.f05 ? cur : best));

// --- Pipeline stage metadata -------------------------------------------

export type StageStatus = "idle" | "running" | "complete";

export interface PipelineStageDef {
  id: string;
  title: string;
  subtitle: string;
  metric: string;
  accent: "signal" | "vector" | "match" | "review";
}

export const PIPELINE_STAGES: PipelineStageDef[] = [
  { id: "source", title: "Source Records", subtitle: "3 TSV sources", metric: "11.7M rows", accent: "signal" },
  { id: "partition", title: "Country Partition", subtitle: "FR · US · IN", metric: "3 shards", accent: "signal" },
  { id: "normalize", title: "Normalization", subtitle: "name + address", metric: "legal suffixes stripped", accent: "signal" },
  { id: "embed", title: "Embedding", subtitle: "MiniLM-L6-v2 · 22M params", metric: "384-dim vectors", accent: "vector" },
  { id: "index", title: "FAISS / Token Index", subtitle: "ANN + inverted index fallback", metric: "top-20 / entity", accent: "vector" },
  { id: "candidates", title: "Candidate Generation", subtitle: "S1 × (S2 ∪ S3)", metric: "~56.4M pairs", accent: "vector" },
  { id: "features", title: "Feature Engineering", subtitle: "12 similarity signals", metric: "parallelized · multiprocessing", accent: "review" },
  { id: "model", title: "LightGBM", subtitle: "binary classifier", metric: "AUC 0.981", accent: "match" },
  { id: "threshold", title: "Threshold Tuning", subtitle: "macro F0.5 sweep, 0.05–0.95", metric: `t = ${BEST_THRESHOLD.threshold}`, accent: "match" },
  { id: "results", title: "Match Results", subtitle: "matching_results.tsv", metric: "~8.2M matches", accent: "match" },
];
