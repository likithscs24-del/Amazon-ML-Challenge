"use client";

import { useMemo, useRef, useState } from "react";
import { Canvas, useFrame, ThreeEvent } from "@react-three/fiber";
import { OrbitControls, Points, PointMaterial } from "@react-three/drei";
import * as THREE from "three";
import { COUNTRY_STATS, type Country } from "@/lib/mockData";

const COUNTRY_COLOR: Record<Country, string> = {
  india: "#2FE0C8",
  us: "#9B87F5",
  france: "#F5B94E",
};

const COUNTRY_CENTER: Record<Country, [number, number, number]> = {
  india: [-3.2, 0.4, 0],
  us: [3.2, -0.6, 1.2],
  france: [0, 1.6, -2.4],
};

function ClusterPoints({
  country,
  count,
  onHover,
}: {
  country: Country;
  count: number;
  onHover: (c: Country | null) => void;
}) {
  const ref = useRef<THREE.Points>(null);
  const center = COUNTRY_CENTER[country];

  const positions = useMemo(() => {
    const arr = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      // gaussian-ish blob so clusters read as organic entity clouds, not cubes
      const r = Math.pow(Math.random(), 0.5) * 1.6;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      arr[i * 3] = center[0] + r * Math.sin(phi) * Math.cos(theta);
      arr[i * 3 + 1] = center[1] + r * Math.sin(phi) * Math.sin(theta) * 0.7;
      arr[i * 3 + 2] = center[2] + r * Math.cos(phi);
    }
    return arr;
  }, [count, center]);

  useFrame((_, delta) => {
    if (ref.current) ref.current.rotation.y += delta * 0.02;
  });

  return (
    <group
      onPointerOver={(e: ThreeEvent<PointerEvent>) => {
        e.stopPropagation();
        onHover(country);
      }}
      onPointerOut={() => onHover(null)}
    >
      <Points ref={ref} positions={positions} stride={3} frustumCulled>
        <PointMaterial
          transparent
          color={COUNTRY_COLOR[country]}
          size={0.028}
          sizeAttenuation
          depthWrite={false}
          opacity={0.85}
        />
      </Points>
    </group>
  );
}

function ConnectionArcs() {
  // A handful of curved lines between cluster centers to suggest active
  // candidate flow between countries' shards — not literal data, just the idea.
  const arcs = useMemo(() => {
    const pairs: [Country, Country][] = [
      ["india", "us"],
      ["us", "france"],
      ["france", "india"],
    ];
    return pairs.map(([a, b]) => {
      const start = new THREE.Vector3(...COUNTRY_CENTER[a]);
      const end = new THREE.Vector3(...COUNTRY_CENTER[b]);
      const mid = start.clone().lerp(end, 0.5).add(new THREE.Vector3(0, 1.1, 0));
      const curve = new THREE.QuadraticBezierCurve3(start, mid, end);
      return curve.getPoints(32);
    });
  }, []);

  return (
    <>
      {arcs.map((pts, i) => (
        <line key={i}>
          <bufferGeometry>
            <bufferAttribute
              attach="attributes-position"
              args={[new Float32Array(pts.flatMap((p) => [p.x, p.y, p.z])), 3]}
            />
          </bufferGeometry>
          <lineBasicMaterial color="#2FE0C8" transparent opacity={0.12} />
        </line>
      ))}
    </>
  );
}

export default function EntityUniverse({ interactive = true }: { interactive?: boolean }) {
  const [hovered, setHovered] = useState<Country | null>(null);

  return (
    <div className="relative h-full w-full">
      <Canvas camera={{ position: [0, 0.8, 7.5], fov: 45 }} dpr={[1, 1.6]}>
        <color attach="background" args={["#07080a"]} />
        <fog attach="fog" args={["#07080a", 6, 14]} />
        <ambientLight intensity={0.4} />
        <ConnectionArcs />
        {COUNTRY_STATS.map((c) => (
          <ClusterPoints key={c.key} country={c.key} count={420} onHover={setHovered} />
        ))}
        {interactive && (
          <OrbitControls
            enablePan={false}
            enableZoom={true}
            minDistance={4}
            maxDistance={11}
            autoRotate
            autoRotateSpeed={0.35}
          />
        )}
      </Canvas>

      {hovered && (
        <div className="pointer-events-none absolute left-6 top-6 rounded-lg border border-border bg-surface/90 px-4 py-3 backdrop-blur-sm">
          <div className="text-xs uppercase tracking-wide text-ink-muted">Cluster</div>
          <div className="mt-0.5 font-mono text-lg text-ink">
            {COUNTRY_STATS.find((c) => c.key === hovered)?.label}
          </div>
          <div className="mt-1 text-xs text-ink-muted">
            {COUNTRY_STATS.find((c) => c.key === hovered)?.s1.toLocaleString()} entities ·{" "}
            {COUNTRY_STATS.find((c) => c.key === hovered)?.coveragePct}% coverage
          </div>
        </div>
      )}
    </div>
  );
}
