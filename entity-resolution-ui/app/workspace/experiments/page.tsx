import GlassPanel from "@/components/ui/GlassPanel";
import StatCard from "@/components/ui/StatCard";
import TrainingChart from "@/components/training/TrainingChart";
import ThresholdSimulator from "@/components/training/ThresholdSimulator";
import { TRAINING_CURVE, BEST_THRESHOLD } from "@/lib/mockData";

export default function ExperimentsPage() {
  const latest = TRAINING_CURVE[TRAINING_CURVE.length - 1];

  return (
    <div className="mx-auto max-w-6xl space-y-6 px-6 py-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl text-ink">Training Observatory</h1>
          <p className="mt-1 text-sm text-ink-muted">Run #02491 · LightGBM · early stopping on validation AUC</p>
        </div>
        <span className="flex items-center gap-1.5 rounded-full border border-match/30 bg-match/10 px-3 py-1 text-xs text-match">
          <span className="h-1.5 w-1.5 rounded-full bg-match animate-pulseDot" />
          Early stopping
        </span>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard label="Iteration" value={`${latest.iteration}/500`} />
        <StatCard label="AUC" value={latest.auc.toFixed(3)} accent="vector" />
        <StatCard label="Val loss" value={latest.valLoss.toFixed(4)} accent="review" />
        <StatCard label="Best F0.5" value={`${(BEST_THRESHOLD.f05 * 100).toFixed(1)}%`} accent="match" />
      </div>

      <GlassPanel title="Loss curve">
        <TrainingChart />
      </GlassPanel>

      <GlassPanel title="Threshold Simulator — precision / recall tradeoff">
        <ThresholdSimulator />
      </GlassPanel>
    </div>
  );
}
