"use client";

import { useCallback, useMemo, useState } from "react";
import {
  ReactFlow,
  Background,
  BackgroundVariant,
  Node,
  Edge,
  useNodesState,
  useEdgesState,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import StageNode, { StageStatus } from "./StageNode";
import { PIPELINE_STAGES } from "@/lib/mockData";
import { Play, RotateCcw } from "lucide-react";

const nodeTypes = { stage: StageNode };

function layout(): { nodes: Node[]; edges: Edge[] } {
  const cols = 2;
  const colGap = 260;
  const rowGap = 130;

  const nodes: Node[] = PIPELINE_STAGES.map((s, i) => {
    const row = Math.floor(i / cols);
    const col = i % cols;
    // snake layout left-to-right, right-to-left, so the flow reads naturally
    const x = row % 2 === 0 ? col * colGap : (cols - 1 - col) * colGap;
    return {
      id: s.id,
      type: "stage",
      position: { x, y: row * rowGap },
      data: { title: s.title, subtitle: s.subtitle, metric: s.metric, accent: s.accent, status: "idle" as StageStatus },
    };
  });

  const edges: Edge[] = PIPELINE_STAGES.slice(1).map((s, i) => ({
    id: `${PIPELINE_STAGES[i].id}-${s.id}`,
    source: PIPELINE_STAGES[i].id,
    target: s.id,
    className: "edge-idle",
    style: { stroke: "#2FE0C8" },
  }));

  return { nodes, edges };
}

export default function PipelineCanvas() {
  const initial = useMemo(layout, []);
  const [nodes, setNodes, onNodesChange] = useNodesState(initial.nodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initial.edges);
  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState(0); // index of stage currently active

  const reset = useCallback(() => {
    setRunning(false);
    setProgress(0);
    setNodes((nds) => nds.map((n) => ({ ...n, data: { ...n.data, status: "idle" } })));
    setEdges((eds) => eds.map((e) => ({ ...e, className: "edge-idle" })));
  }, [setNodes, setEdges]);

  const runPipeline = useCallback(() => {
    reset();
    setRunning(true);
    let step = 0;
    const total = PIPELINE_STAGES.length;

    const interval = setInterval(() => {
      setNodes((nds) =>
        nds.map((n, i) => {
          if (i < step) return { ...n, data: { ...n.data, status: "complete" } };
          if (i === step) return { ...n, data: { ...n.data, status: "running" } };
          return n;
        })
      );
      setEdges((eds) =>
        eds.map((e, i) => (i < step ? { ...e, className: "" } : { ...e, className: "edge-idle" }))
      );
      setProgress(step + 1);
      step += 1;
      if (step >= total) {
        clearInterval(interval);
        setNodes((nds) => nds.map((n) => ({ ...n, data: { ...n.data, status: "complete" } })));
        setEdges((eds) => eds.map((e) => ({ ...e, className: "" })));
        setRunning(false);
      }
    }, 550);
  }, [reset, setNodes, setEdges]);

  return (
    <div className="relative h-full w-full">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        nodeTypes={nodeTypes}
        fitView
        fitViewOptions={{ padding: 0.3 }}
        proOptions={{ hideAttribution: true }}
        minZoom={0.4}
      >
        <Background variant={BackgroundVariant.Dots} gap={20} size={1} color="rgba(255,255,255,0.06)" />
      </ReactFlow>

      <div className="absolute right-4 top-4 flex items-center gap-2">
        <div className="rounded-md border border-border bg-surface/90 px-3 py-1.5 font-mono text-xs text-ink-muted backdrop-blur-sm">
          {progress}/{PIPELINE_STAGES.length}
        </div>
        <button
          onClick={reset}
          disabled={running}
          className="flex items-center gap-1.5 rounded-md border border-border bg-surface/90 px-3 py-1.5 text-xs text-ink-muted hover:text-ink disabled:opacity-40 backdrop-blur-sm"
        >
          <RotateCcw className="h-3.5 w-3.5" />
          Reset
        </button>
        <button
          onClick={runPipeline}
          disabled={running}
          className="flex items-center gap-1.5 rounded-md bg-signal px-3.5 py-1.5 text-xs font-medium text-base hover:brightness-110 disabled:opacity-60 transition"
        >
          <Play className="h-3.5 w-3.5" />
          {running ? "Processing…" : "Run pipeline"}
        </button>
      </div>
    </div>
  );
}
