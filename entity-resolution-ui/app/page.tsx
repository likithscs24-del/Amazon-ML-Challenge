"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { motion } from "framer-motion";
import { TOTALS, COUNTRY_STATS } from "@/lib/mockData";
import { formatCompact } from "@/lib/utils";

const EntityUniverse = dynamic(() => import("@/components/3d/EntityUniverse"), { ssr: false });

export default function LandingPage() {
  return (
    <main className="relative h-screen w-screen overflow-hidden bg-base">
      <div className="absolute inset-0">
        <EntityUniverse />
      </div>

      {/* readability scrim so text sits above the 3D field without hiding it */}
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-base/70 via-transparent to-base/90" />

      <div className="relative z-10 flex h-full flex-col">
        <div className="flex items-center justify-between px-8 py-6">
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-signal" />
            <span className="font-mono text-sm tracking-wide text-ink">ENTITY // RESOLUTION</span>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-match">
            <span className="h-1.5 w-1.5 rounded-full bg-match animate-pulseDot" />
            SYSTEM LIVE
          </div>
        </div>

        <div className="flex flex-1 flex-col items-center justify-center px-6 text-center">
          <motion.p
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="mb-3 font-mono text-xs uppercase tracking-[0.2em] text-ink-muted"
          >
            Cross-source business entity matching
          </motion.p>
          <motion.h1
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.1 }}
            className="max-w-2xl text-4xl leading-tight text-ink sm:text-5xl"
          >
            Watching {formatCompact(TOTALS.totalRecords)} records
            <br />
            resolve into one truth.
          </motion.h1>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.35 }}
            className="mt-8 flex items-center gap-8 font-mono text-sm text-ink-muted"
          >
            <span>
              <span className="text-ink">{formatCompact(TOTALS.totalRecords)}</span> records
            </span>
            <span className="h-3 w-px bg-border-strong" />
            <span>
              <span className="text-ink">3</span> sources
            </span>
            <span className="h-3 w-px bg-border-strong" />
            <span>
              <span className="text-ink">{COUNTRY_STATS.length}</span> countries
            </span>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.5 }}
            className="mt-10 flex items-center gap-3"
          >
            <Link
              href="/workspace"
              className="rounded-md bg-signal px-5 py-2.5 text-sm font-medium text-base hover:brightness-110 transition"
            >
              Open workspace
            </Link>
            <Link
              href="/workspace/pipeline"
              className="rounded-md border border-border-strong px-5 py-2.5 text-sm text-ink hover:bg-surface-hover transition"
            >
              Run pipeline
            </Link>
          </motion.div>
        </div>

        <div className="px-8 pb-6 text-center font-mono text-[11px] text-ink-faint">
          drag to rotate the entity space · scroll to zoom
        </div>
      </div>
    </main>
  );
}
