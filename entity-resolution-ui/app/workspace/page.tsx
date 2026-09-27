"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import StatCard from "@/components/ui/StatCard";
import GlassPanel from "@/components/ui/GlassPanel";
import { COUNTRY_STATS, TOTALS, BEST_THRESHOLD } from "@/lib/mockData";
import { formatCompact } from "@/lib/utils";
import { AlertTriangle } from "lucide-react";

const EntityUniverse = dynamic(() => import("@/components/3d/EntityUniverse"), { ssr: false });

export default function OverviewPage() {
  return (
    <div className="mx-auto max-w-7xl px-6 py-6 space-y-6">
      <div>
        <h1 className="text-xl text-ink">Overview</h1>
        <p className="mt-1 text-sm text-ink-muted">
          Live snapshot of the entity-resolution engine across all three sources.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard label="Total records" value={formatCompact(TOTALS.totalRecords)} sub="3 sources" />
        <StatCard label="Candidate pairs" value={formatCompact(TOTALS.candidatePairsApprox)} accent="vector" sub="post-blocking" />
        <StatCard label="Matches" value={formatCompact(TOTALS.matchedApprox)} accent="match" sub={`t = ${BEST_THRESHOLD.threshold}`} />
        <StatCard label="Model" value="LightGBM" accent="signal" sub={`AUC 0.981 · F0.5 ${(BEST_THRESHOLD.f05 * 100).toFixed(1)}%`} />
      </div>

      <GlassPanel
        title="Global entity space"
        action={
          <Link href="/workspace/pipeline" className="text-xs text-signal hover:underline">
            View pipeline →
          </Link>
        }
        className="overflow-hidden"
      >
        <div className="h-[420px] w-full -m-4">
          <EntityUniverse />
        </div>
      </GlassPanel>

      <div className="grid gap-4 md:grid-cols-3">
        {COUNTRY_STATS.map((c) => (
          <GlassPanel key={c.key} title={c.label}>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-ink-muted">Source 1</span>
                <span className="font-mono text-ink">{c.s1.toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-ink-muted">Candidate coverage</span>
                <span className="font-mono text-ink">{c.coveragePct}%</span>
              </div>
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-surface-hover">
                <div
                  className="h-full rounded-full bg-signal"
                  style={{ width: `${c.coveragePct}%` }}
                />
              </div>
              {c.note && (
                <div className="mt-2 flex gap-2 rounded-md border border-review/30 bg-review/5 p-2 text-xs text-review">
                  <AlertTriangle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                  <span>{c.note}</span>
                </div>
              )}
            </div>
          </GlassPanel>
        ))}
      </div>
    </div>
  );
}
