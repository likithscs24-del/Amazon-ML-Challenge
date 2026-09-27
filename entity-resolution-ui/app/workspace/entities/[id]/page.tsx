"use client";

import { useMemo, useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { getEntity } from "@/lib/mockData";
import GlassPanel from "@/components/ui/GlassPanel";
import MatchExplanation from "@/components/entities/MatchExplanation";
import { ArrowLeft } from "lucide-react";
import { cn } from "@/lib/utils";

const RelationshipGraph = dynamic(() => import("@/components/3d/RelationshipGraph"), { ssr: false });

const STATUS_DOT: Record<string, string> = {
  matched: "bg-match",
  review: "bg-review",
  rejected: "bg-reject",
};

export default function EntityDetailPage({ params }: { params: { id: string } }) {
  const entity = useMemo(() => getEntity(params.id), [params.id]);
  const [selectedId, setSelectedId] = useState<string | null>(entity?.candidates[0]?.id ?? null);

  if (!entity) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 text-ink-muted">
        <p>Entity {params.id} not found in this sample.</p>
        <Link href="/workspace/entities" className="text-signal hover:underline text-sm">
          Back to dataset explorer
        </Link>
      </div>
    );
  }

  const selected = entity.candidates.find((c) => c.id === selectedId) ?? entity.candidates[0];

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-3 px-6 py-4">
        <Link href="/workspace/entities" className="text-ink-muted hover:text-ink">
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-lg text-ink">{entity.name}</h1>
            <span className="font-mono text-xs text-ink-muted">{entity.id}</span>
          </div>
          <p className="text-xs text-ink-muted">{entity.address}</p>
        </div>
      </div>

      <div className="grid flex-1 min-h-0 grid-cols-1 gap-4 px-6 pb-6 lg:grid-cols-[1.3fr_1fr]">
        <GlassPanel title="Relationship view" className="flex flex-col overflow-hidden">
          <div className="h-[380px] w-full lg:h-full">
            {selected && (
              <RelationshipGraph
                centerLabel={entity.name}
                candidates={entity.candidates}
                selectedId={selected.id}
                onSelect={setSelectedId}
              />
            )}
          </div>
        </GlassPanel>

        <div className="flex min-h-0 flex-col gap-4 overflow-y-auto">
          <GlassPanel title="Candidates">
            <div className="space-y-1.5">
              {entity.candidates.map((c) => (
                <button
                  key={c.id}
                  onClick={() => setSelectedId(c.id)}
                  className={cn(
                    "flex w-full items-center justify-between rounded-md border px-3 py-2 text-left text-sm transition-colors",
                    selected?.id === c.id
                      ? "border-signal/40 bg-signal/10"
                      : "border-border hover:bg-surface-hover"
                  )}
                >
                  <span className="flex items-center gap-2">
                    <span className={cn("h-1.5 w-1.5 rounded-full", STATUS_DOT[c.status])} />
                    <span className="text-ink">{c.name}</span>
                  </span>
                  <span className="font-mono text-xs text-ink-muted">{(c.probability * 100).toFixed(1)}%</span>
                </button>
              ))}
            </div>
          </GlassPanel>

          {selected && (
            <GlassPanel title="Match analysis">
              <MatchExplanation entity={entity} candidate={selected} />
            </GlassPanel>
          )}
        </div>
      </div>
    </div>
  );
}
