"use client";

import { FEATURE_COLS, type Candidate, type EntityRecord } from "@/lib/mockData";
import { CheckCircle2, XCircle } from "lucide-react";

function FeatureBar({ label, value, kind }: { label: string; value: number; kind: "pct" | "binary" | "raw" }) {
  const pct = kind === "pct" ? value : kind === "binary" ? value : Math.max(0, 1 - value / 12);
  const display =
    kind === "pct" ? `${(value * 100).toFixed(1)}%` : kind === "binary" ? (value ? "MATCH" : "NO MATCH") : `Δ${value}`;

  return (
    <div>
      <div className="mb-1 flex items-center justify-between text-xs">
        <span className="text-ink-muted">{label}</span>
        <span className="font-mono text-ink">{display}</span>
      </div>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-surface-hover">
        <div
          className={kind === "binary" && !value ? "h-full bg-reject/60 rounded-full" : "h-full bg-signal rounded-full"}
          style={{ width: `${Math.max(4, pct * 100)}%` }}
        />
      </div>
    </div>
  );
}

function reasonsFor(candidate: Candidate): string[] {
  const f = candidate.features;
  const reasons: string[] = [];
  if (f.country_match) reasons.push("Same country");
  if (f.postal_match) reasons.push("Matching postal code");
  if (f.name_token_sort > 0.85) reasons.push("Strong business-name similarity");
  if (f.addr_token_sort > 0.8) reasons.push("High address similarity");
  if (f.name_char3_jaccard > 0.6) reasons.push("Strong character overlap");
  return reasons;
}

function counterReasonsFor(candidate: Candidate): string[] {
  const f = candidate.features;
  const reasons: string[] = [];
  if (!f.country_match) reasons.push("Country does not match");
  if (!f.postal_match) reasons.push("Postal code not confirmed");
  if (f.name_token_sort < 0.6) reasons.push("Weak name similarity");
  if (f.name_len_diff > 6) reasons.push("Large name length difference");
  return reasons;
}

export default function MatchExplanation({ entity, candidate }: { entity: EntityRecord; candidate: Candidate }) {
  const positives = reasonsFor(candidate);
  const negatives = counterReasonsFor(candidate);

  return (
    <div className="space-y-5">
      {/* AI X-Ray: side-by-side identity comparison */}
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-lg border border-border bg-surface p-3">
          <div className="text-[10px] uppercase tracking-wide text-ink-muted">Source 1</div>
          <div className="mt-1 text-sm text-ink">{entity.name}</div>
          <div className="mt-0.5 text-xs text-ink-muted">{entity.address}</div>
        </div>
        <div className="rounded-lg border border-border bg-surface p-3">
          <div className="text-[10px] uppercase tracking-wide text-ink-muted">
            {candidate.source === "s2" ? "Source 2" : "Source 3"}
          </div>
          <div className="mt-1 text-sm text-ink">{candidate.name}</div>
          <div className="mt-0.5 text-xs text-ink-muted">{candidate.address}</div>
        </div>
      </div>

      <div className="flex items-center justify-center gap-3 rounded-lg border border-signal/25 bg-signal/5 py-3">
        <span className="font-mono text-2xl text-signal">{(candidate.probability * 100).toFixed(1)}%</span>
        <span className="text-xs text-ink-muted">model confidence</span>
      </div>

      <div className="space-y-3">
        {FEATURE_COLS.map((f) => (
          <FeatureBar key={f.key} label={f.label} value={candidate.features[f.key] ?? 0} kind={f.kind} />
        ))}
      </div>

      <div>
        <div className="mb-2 text-xs uppercase tracking-wide text-ink-muted">Why this match?</div>
        <ul className="space-y-1.5 text-sm">
          {positives.map((r) => (
            <li key={r} className="flex items-center gap-2 text-ink">
              <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-match" />
              {r}
            </li>
          ))}
          {negatives.map((r) => (
            <li key={r} className="flex items-center gap-2 text-ink-muted">
              <XCircle className="h-3.5 w-3.5 shrink-0 text-reject" />
              {r}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
