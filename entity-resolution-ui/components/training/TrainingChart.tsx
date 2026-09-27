"use client";

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { TRAINING_CURVE } from "@/lib/mockData";

export default function TrainingChart() {
  return (
    <ResponsiveContainer width="100%" height={260}>
      <LineChart data={TRAINING_CURVE} margin={{ top: 8, right: 16, left: -16, bottom: 0 }}>
        <CartesianGrid stroke="rgba(255,255,255,0.06)" vertical={false} />
        <XAxis
          dataKey="iteration"
          stroke="#5A5F6A"
          tick={{ fontSize: 11, fontFamily: "var(--font-mono)" }}
          tickLine={false}
          axisLine={{ stroke: "rgba(255,255,255,0.08)" }}
        />
        <YAxis
          stroke="#5A5F6A"
          tick={{ fontSize: 11, fontFamily: "var(--font-mono)" }}
          tickLine={false}
          axisLine={false}
          width={40}
        />
        <Tooltip
          contentStyle={{
            background: "#12151A",
            border: "1px solid rgba(255,255,255,0.1)",
            borderRadius: 8,
            fontSize: 12,
          }}
          labelStyle={{ color: "#8A8F99" }}
        />
        <Line type="monotone" dataKey="trainLoss" name="Train loss" stroke="#9B87F5" dot={false} strokeWidth={1.75} />
        <Line type="monotone" dataKey="valLoss" name="Val loss" stroke="#2FE0C8" dot={false} strokeWidth={1.75} />
      </LineChart>
    </ResponsiveContainer>
  );
}
