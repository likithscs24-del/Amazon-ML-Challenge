"use client";

import { Search } from "lucide-react";
import { TOTALS } from "@/lib/mockData";
import { formatCompact } from "@/lib/utils";

export default function TopStatusBar({ onOpenPalette }: { onOpenPalette: () => void }) {
  return (
    <header className="flex h-14 items-center justify-between border-b border-border px-6">
      <div className="flex items-center gap-6 text-xs">
        <span className="flex items-center gap-1.5 text-match">
          <span className="h-1.5 w-1.5 rounded-full bg-match animate-pulseDot" />
          SYSTEM OPERATIONAL
        </span>
        <span className="hidden gap-1.5 text-ink-muted sm:flex">
          <span className="font-mono text-ink">{formatCompact(TOTALS.totalRecords)}</span> records
        </span>
        <span className="hidden gap-1.5 text-ink-muted md:flex">
          <span className="font-mono text-ink">{formatCompact(TOTALS.candidatePairsApprox)}</span> candidates
        </span>
        <span className="hidden gap-1.5 text-ink-muted lg:flex">
          <span className="font-mono text-ink">{formatCompact(TOTALS.matchedApprox)}</span> matches
        </span>
        <span className="hidden gap-1.5 text-ink-muted lg:flex">
          {TOTALS.modelVersion}
        </span>
        <span className="hidden gap-1.5 text-ink-muted xl:flex">
          <span className="font-mono text-ink">{TOTALS.latencyMs}ms</span> latency
        </span>
      </div>

      <button
        onClick={onOpenPalette}
        className="flex items-center gap-2 rounded-md border border-border bg-surface px-3 py-1.5 text-xs text-ink-muted hover:text-ink hover:border-border-strong transition-colors"
      >
        <Search className="h-3.5 w-3.5" />
        Search
        <kbd className="ml-2 rounded border border-border px-1.5 py-0.5 font-mono text-[10px]">⌘K</kbd>
      </button>
    </header>
  );
}
