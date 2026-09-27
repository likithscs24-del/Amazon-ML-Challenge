"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ENTITIES, type Country, type MatchStatus } from "@/lib/mockData";
import { cn } from "@/lib/utils";

const STATUS_STYLE: Record<MatchStatus, string> = {
  matched: "bg-match/10 text-match border-match/30",
  review: "bg-review/10 text-review border-review/30",
  rejected: "bg-reject/10 text-reject border-reject/30",
};

const COUNTRY_LABEL: Record<Country, string> = { india: "IN", us: "US", france: "FR" };

export default function EntityTable() {
  const [countryFilter, setCountryFilter] = useState<Country | "all">("all");
  const [statusFilter, setStatusFilter] = useState<MatchStatus | "all">("all");
  const [query, setQuery] = useState("");

  const rows = useMemo(() => {
    return ENTITIES.filter((e) => {
      if (countryFilter !== "all" && e.country !== countryFilter) return false;
      if (statusFilter !== "all" && e.status !== statusFilter) return false;
      if (query && !e.name.toLowerCase().includes(query.toLowerCase()) && !e.id.toLowerCase().includes(query.toLowerCase()))
        return false;
      return true;
    });
  }, [countryFilter, statusFilter, query]);

  return (
    <div className="flex h-full flex-col">
      <div className="flex flex-wrap items-center gap-2 border-b border-border px-6 py-3">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search entity name or ID…"
          className="w-64 rounded-md border border-border bg-surface px-3 py-1.5 text-xs text-ink outline-none placeholder:text-ink-faint focus:border-border-strong"
        />
        <div className="ml-auto flex gap-1.5">
          {(["all", "india", "us", "france"] as const).map((c) => (
            <button
              key={c}
              onClick={() => setCountryFilter(c)}
              className={cn(
                "rounded-md border px-2.5 py-1 text-xs transition-colors",
                countryFilter === c
                  ? "border-signal/40 bg-signal/10 text-signal"
                  : "border-border text-ink-muted hover:text-ink"
              )}
            >
              {c === "all" ? "All countries" : COUNTRY_LABEL[c]}
            </button>
          ))}
        </div>
        <div className="flex gap-1.5">
          {(["all", "matched", "review", "rejected"] as const).map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={cn(
                "rounded-md border px-2.5 py-1 text-xs capitalize transition-colors",
                statusFilter === s
                  ? "border-signal/40 bg-signal/10 text-signal"
                  : "border-border text-ink-muted hover:text-ink"
              )}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        <table className="w-full text-left text-sm">
          <thead className="sticky top-0 bg-base/95 backdrop-blur-sm text-[11px] uppercase tracking-wide text-ink-muted">
            <tr>
              <th className="px-6 py-2.5 font-normal">Entity</th>
              <th className="px-3 py-2.5 font-normal">Name</th>
              <th className="px-3 py-2.5 font-normal">Country</th>
              <th className="px-3 py-2.5 font-normal">Candidates</th>
              <th className="px-3 py-2.5 font-normal">Top match</th>
              <th className="px-6 py-2.5 font-normal">Status</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((e) => (
              <tr key={e.id} className="group border-t border-border hover:bg-surface-hover">
                <td className="px-6 py-2.5">
                  <Link href={`/workspace/entities/${e.id}`} className="font-mono text-xs text-ink-muted group-hover:text-signal">
                    {e.id}
                  </Link>
                </td>
                <td className="px-3 py-2.5 text-ink">
                  <Link href={`/workspace/entities/${e.id}`}>{e.name}</Link>
                </td>
                <td className="px-3 py-2.5 text-ink-muted">{COUNTRY_LABEL[e.country]}</td>
                <td className="px-3 py-2.5 font-mono text-ink-muted">{e.candidates.length}</td>
                <td className="px-3 py-2.5 font-mono text-ink">{(e.topProbability * 100).toFixed(1)}%</td>
                <td className="px-6 py-2.5">
                  <span className={cn("rounded-full border px-2 py-0.5 text-[11px] capitalize", STATUS_STYLE[e.status])}>
                    {e.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {rows.length === 0 && (
          <div className="py-16 text-center text-sm text-ink-muted">No entities match these filters.</div>
        )}
      </div>
    </div>
  );
}
