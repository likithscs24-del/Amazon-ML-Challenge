# ENTITY // RESOLUTION — Frontend

A command-center UI for the `ser_pipeline` entity-resolution engine: a 3D
entity universe, an animated pipeline studio, a dataset explorer, a 3D
relationship/match-explanation view, and a training observatory with an
interactive threshold simulator. Built with Next.js 14 (App Router),
Tailwind, React Three Fiber, React Flow, and Recharts.

This does **not** touch or modify anything in `ser_pipeline/` — it's a
separate, independent app that currently runs on realistic **mock data**
shaped exactly like the pipeline's real outputs (`candidate_pairs.tsv`,
`features.parquet`, `matching_results.tsv`, `threshold.json`). Wiring it to
real pipeline output is a small, isolated change — see "Connecting real
data" below.

## 1. Install

Requires Node.js 18.18+ (20 LTS recommended).

```bash
cd entity-resolution-ui
npm install
```

## 2. Run

```bash
npm run dev
```

Open http://localhost:3000 — that's the landing / command-center screen.
Click **Open workspace** for the dashboard, or use the routes directly:

| Route | Screen |
|---|---|
| `/` | Landing — 3D entity universe hero |
| `/workspace` | Overview — stats + global entity space + per-country coverage |
| `/workspace/pipeline` | Pipeline Studio — animated React Flow diagram of the real pipeline stages |
| `/workspace/entities` | Dataset Explorer — filterable table of sampled entities |
| `/workspace/entities/[id]` | Entity detail — 3D relationship graph + Match X-Ray / explanation |
| `/workspace/experiments` | Training Observatory — loss curve + interactive threshold simulator |

Press **⌘K / Ctrl+K** anywhere inside `/workspace` for the command palette.

## 3. What's implemented (from the brainstorm doc)

- ✅ Command-center landing page with animated 3D particle universe
- ✅ Collapsible minimal sidebar navigation
- ✅ Pipeline Studio: custom React Flow nodes, run/reset simulation with
  per-stage idle → processing → complete states and animated flowing edges
- ✅ 3D Entity Universe: country-clustered particle field (India / US /
  France), hover tooltips, orbit + auto-rotate camera
- ✅ Entity Explorer: filterable/searchable table, status badges
  (matched / review / rejected)
- ✅ 3D Relationship view: center entity with candidates arranged around
  it, edge thickness/opacity encodes model probability, click to select
- ✅ Match Explanation ("AI X-Ray"): side-by-side source comparison, the
  12 real feature columns from `features.py` as bars, model confidence,
  and a generated "why this match" / counter-evidence list
- ✅ Training Observatory: loss curve (train vs. validation), live
  metrics, early-stopping badge
- ✅ Threshold Simulator: drag threshold 0.05–0.95 (the real sweep range
  in `train.py`) and watch precision/recall/F0.5 update against the
  curve, with the actual selected threshold marked
- ✅ Command palette (⌘K) for entity/page search
- ✅ Dark, restrained design system: one electric accent (teal/cyan),
  semantic colors for matched/review/rejected/vector-operation, JetBrains
  Mono for all numbers, Inter for UI text

### Deliberately left out of this first pass (natural next additions)
- Full 3D "pipeline in 3D" toggle and camera fly-throughs between
  global → country → entity (the 2D pipeline + 3D relationship view
  already cover the "spatial understanding" goal; this is the next
  layer of polish)
- "Search Space Collapse" funnel visualization and the global
  country map (`places`-style world view) — good candidates for a
  second iteration
- Persisted/live run history — the pipeline run and training numbers
  reset per session since there's no backend yet

## 4. Connecting real data

Every screen reads from `lib/mockData.ts`, which exports typed shapes
(`EntityRecord`, `Candidate`, `PipelineStageDef`, threshold sweep rows,
etc.) that mirror the real pipeline's TSV/Parquet columns. To go live:

1. Stand up a small API (FastAPI/Flask, or SageMaker endpoint + a thin
   Next.js API route) that reads `output/matching_results.tsv`,
   `output/candidate_pairs.tsv`, the `features.parquet` used for a given
   entity, and `threshold.json`.
2. Replace the exports in `lib/mockData.ts` with `fetch` calls (or add a
   sibling `lib/api.ts` with the same function names —
   `getEntity`, `ENTITIES`, `THRESHOLD_SWEEP`, `TRAINING_CURVE`,
   `COUNTRY_STATS`, `PIPELINE_STAGES` — and swap the imports). No
   component needs to change because they only depend on the exported
   types, not on where the data comes from.
3. For the Pipeline Studio's "Run pipeline" button to reflect a real
   SageMaker Processing/Training Job instead of a client-side timer,
   poll a status endpoint and map job stage → `StageStatus`
   (`idle` / `running` / `complete`) in `PipelineCanvas.tsx`.

## 5. Customizing the look

All design tokens live in `tailwind.config.ts` under `theme.extend.colors`
(`base`, `surface`, `border`, `ink`, `signal`, `match`, `review`, `reject`,
`vector`). Change the `signal` accent to restyle the whole app's single
electric color; everything else is intentionally neutral/dark so that
accent — and the semantic match/review/reject colors — stay legible.

Swap `Inter` / `JetBrains_Mono` in `app/layout.tsx` for `Geist` /
`Geist Mono` if you'd prefer (both are on `next/font/google` as of
recent Next.js versions).
