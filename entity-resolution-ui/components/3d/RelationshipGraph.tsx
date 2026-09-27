"use client";

import { useMemo, useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls, Html, Line } from "@react-three/drei";
import * as THREE from "three";
import type { Candidate } from "@/lib/mockData";

const STATUS_COLOR: Record<string, string> = {
  matched: "#3DDC84",
  review: "#F5B94E",
  rejected: "#F16A6A",
};

function CenterNode({ label }: { label: string }) {
  const ref = useRef<THREE.Mesh>(null);
  useFrame((state) => {
    if (ref.current) {
      const s = 1 + Math.sin(state.clock.elapsedTime * 1.4) * 0.04;
      ref.current.scale.setScalar(s);
    }
  });
  return (
    <group>
      <mesh ref={ref}>
        <sphereGeometry args={[0.34, 32, 32]} />
        <meshStandardMaterial color="#2FE0C8" emissive="#2FE0C8" emissiveIntensity={0.6} />
      </mesh>
      <Html distanceFactor={8} position={[0, -0.55, 0]} center>
        <div className="pointer-events-none whitespace-nowrap rounded bg-surface/90 px-2 py-0.5 font-mono text-[10px] text-ink border border-border">
          {label}
        </div>
      </Html>
    </group>
  );
}

function CandidateNode({
  candidate,
  position,
  onSelect,
  selected,
}: {
  candidate: Candidate;
  position: [number, number, number];
  onSelect: () => void;
  selected: boolean;
}) {
  const color = STATUS_COLOR[candidate.status];
  return (
    <group position={position}>
      <Line points={[[0, 0, 0], position.map((v) => -v) as [number, number, number]]} color={color} lineWidth={Math.max(1, candidate.probability * 4)} transparent opacity={0.15 + candidate.probability * 0.5} />
      <mesh onClick={onSelect} scale={selected ? 1.3 : 1}>
        <sphereGeometry args={[0.16, 24, 24]} />
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={selected ? 0.9 : 0.35} />
      </mesh>
      <Html distanceFactor={8} position={[0, 0.32, 0]} center>
        <div
          className="pointer-events-none whitespace-nowrap rounded px-2 py-0.5 font-mono text-[10px] border"
          style={{ background: "rgba(13,15,19,0.9)", borderColor: color, color }}
        >
          {(candidate.probability * 100).toFixed(1)}%
        </div>
      </Html>
    </group>
  );
}

export default function RelationshipGraph({
  centerLabel,
  candidates,
  selectedId,
  onSelect,
}: {
  centerLabel: string;
  candidates: Candidate[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  const positions = useMemo<[number, number, number][]>(() => {
    const n = candidates.length;
    return candidates.map((_, i) => {
      const angle = (i / n) * Math.PI * 2;
      const radius = 2.1;
      return [Math.cos(angle) * radius, Math.sin(i * 1.7) * 0.6, Math.sin(angle) * radius];
    });
  }, [candidates]);

  return (
    <div className="h-full w-full">
      <Canvas camera={{ position: [0, 1.2, 5.2], fov: 42 }} dpr={[1, 1.6]}>
        <color attach="background" args={["#07080a"]} />
        <ambientLight intensity={0.6} />
        <pointLight position={[3, 3, 3]} intensity={20} />
        <CenterNode label={centerLabel} />
        {candidates.map((c, i) => (
          <CandidateNode
            key={c.id}
            candidate={c}
            position={positions[i]}
            selected={selectedId === c.id}
            onSelect={() => onSelect(c.id)}
          />
        ))}
        <OrbitControls enablePan={false} minDistance={3} maxDistance={9} autoRotate autoRotateSpeed={0.6} />
      </Canvas>
    </div>
  );
}
