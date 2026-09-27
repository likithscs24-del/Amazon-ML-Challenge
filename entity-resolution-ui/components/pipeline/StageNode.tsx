"use client";

import { Handle, Position } from "@xyflow/react";
import { cn } from "@/lib/utils";

export type StageStatus = "idle" | "running" | "complete";

const ACCENT_BORDER: Record<string, string> = {
  signal: "border-signal/50",
  vector: "border-vector/50",
  review: "border-review/50",
  match: "border-match/50",
};
const ACCENT_TEXT: Record<string, string> = {
  signal: "text-signal",
  vector: "text-vector",
  review: "text-review",
  match: "text-match",
};
const ACCENT_DOT: Record<string, string> = {
  signal: "bg-signal",
  vector: "bg-vector",
  review: "bg-review",
  match: "bg-match",
};

export interface StageNodeData {
  title: string;
  subtitle: string;
  metric: string;
  accent: "signal" | "vector" | "review" | "match";
  status: StageStatus;
  [key: string]: unknown;
}

export default function StageNode({ data }: { data: StageNodeData }) {
  const { title, subtitle, metric, accent, status } = data;

  return (
    <div
      className={cn(
        "w-[190px] rounded-lg border bg-surface-raised px-3.5 py-3 shadow-lg transition-all",
        ACCENT_BORDER[accent],
        status === "running" && "shadow-glow scale-[1.03]",
        status === "idle" && "opacity-60"
      )}
    >
      <Handle type="target" position={Position.Top} className="!bg-border-strong" />
      <div className="flex items-center justify-between">
        <span className={cn("text-[10px] uppercase tracking-wide", ACCENT_TEXT[accent])}>
          {status === "running" ? "processing" : status === "complete" ? "complete" : "idle"}
        </span>
        <span
          className={cn(
            "h-1.5 w-1.5 rounded-full",
            status === "running" ? `${ACCENT_DOT[accent]} animate-pulseDot` : status === "complete" ? ACCENT_DOT[accent] : "bg-ink-faint"
          )}
        />
      </div>
      <div className="mt-1.5 text-sm text-ink">{title}</div>
      <div className="mt-0.5 text-[11px] text-ink-muted">{subtitle}</div>
      <div className="mt-2 border-t border-border pt-1.5 font-mono text-[11px] text-ink">
        {metric}
      </div>
      <Handle type="source" position={Position.Bottom} className="!bg-border-strong" />
    </div>
  );
}
