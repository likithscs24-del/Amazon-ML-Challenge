const ACCENT_TEXT: Record<string, string> = {
  signal: "text-signal",
  match: "text-match",
  review: "text-review",
  reject: "text-reject",
  vector: "text-vector",
};

export default function StatCard({
  label,
  value,
  sub,
  accent = "signal",
}: {
  label: string;
  value: string;
  sub?: string;
  accent?: "signal" | "match" | "review" | "reject" | "vector";
}) {
  return (
    <div className="rounded-lg border border-border bg-surface px-4 py-3.5">
      <div className="text-[11px] uppercase tracking-wide text-ink-muted">{label}</div>
      <div className="mt-1.5 font-mono text-2xl text-ink tabular">{value}</div>
      {sub && <div className={`mt-1 text-xs ${ACCENT_TEXT[accent]}`}>{sub}</div>}
    </div>
  );
}
