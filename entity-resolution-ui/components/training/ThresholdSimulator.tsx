"use client";

import { useMemo, useState } from "react";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from "recharts";
import { THRESHOLD_SWEEP, BEST_THRESHOLD } from "@/lib/mockData";

function closest(threshold: number) {
  return THRESHOLD_SWEEP.reduce((best, cur) =>
    Math.abs(cur.threshold - threshold) < Math.abs(best.threshold - threshold) ? cur : best
  );
}

export default function ThresholdSimulator() {
  const [threshold, setThreshold] = useState(BEST_THRESHOLD.threshold);
  const current = useMemo(() => closest(threshold), [threshold]);

  return (
    <div className="space-y-4">
      <ResponsiveContainer width="100%" height={200}>
        <AreaChart data={THRESHOLD_SWEEP} margin={{ top: 8, right: 16, left: -16, bottom: 0 }}>
          <CartesianGrid stroke="rgba(255,255,255,0.06)" vertical={false} />
          <XAxis
            dataKey="threshold"
            stroke="#5A5F6A"
            tick={{ fontSize: 11, fontFamily: "var(--font-mono)" }}
            tickLine={false}
            axisLine={{ stroke: "rgba(255,255,255,0.08)" }}
          />
          <YAxis stroke="#5A5F6A" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} width={32} domain={[0, 1]} />
          <Tooltip
            contentStyle={{ background: "#12151A", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, fontSize: 12 }}
            labelStyle={{ color: "#8A8F99" }}
          />
          <Area type="monotone" dataKey="precision" stroke="#3DDC84" fill="#3DDC84" fillOpacity={0.06} strokeWidth={1.5} />
          <Area type="monotone" dataKey="recall" stroke="#9B87F5" fill="#9B87F5" fillOpacity={0.06} strokeWidth={1.5} />
          <Area type="monotone" dataKey="f05" stroke="#2FE0C8" fill="#2FE0C8" fillOpacity={0.1} strokeWidth={2} />
          <ReferenceLine x={current.threshold} stroke="#EDEEF1" strokeDasharray="3 3" />
        </AreaChart>
      </ResponsiveContainer>

      <div>
        <input
          type="range"
          min={0.05}
          max={0.95}
          step={0.02}
          value={threshold}
          onChange={(e) => setThreshold(parseFloat(e.target.value))}
          className="w-full accent-signal"
        />
        <div className="mt-1 flex justify-between font-mono text-[11px] text-ink-faint">
          <span>0.05</span>
          <span className="text-signal">t = {current.threshold.toFixed(2)}</span>
          <span>0.95</span>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3 text-center">
        <div className="rounded-md border border-border bg-surface py-2.5">
          <div className="font-mono text-lg text-match">{(current.precision * 100).toFixed(1)}%</div>
          <div className="text-[10px] uppercase tracking-wide text-ink-muted">Precision</div>
        </div>
        <div className="rounded-md border border-border bg-surface py-2.5">
          <div className="font-mono text-lg text-vector">{(current.recall * 100).toFixed(1)}%</div>
          <div className="text-[10px] uppercase tracking-wide text-ink-muted">Recall</div>
        </div>
        <div className="rounded-md border border-signal/30 bg-signal/5 py-2.5">
          <div className="font-mono text-lg text-signal">{(current.f05 * 100).toFixed(1)}%</div>
          <div className="text-[10px] uppercase tracking-wide text-ink-muted">F0.5</div>
        </div>
      </div>
      {Math.abs(current.threshold - BEST_THRESHOLD.threshold) < 0.001 && (
        <p className="text-center text-[11px] text-signal">This is the threshold train.py selected on the validation sweep.</p>
      )}
    </div>
  );
}
