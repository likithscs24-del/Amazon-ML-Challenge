import PipelineCanvas from "@/components/pipeline/PipelineCanvas";

export default function PipelinePage() {
  return (
    <div className="flex h-full flex-col">
      <div className="px-6 py-5">
        <h1 className="text-xl text-ink">Pipeline Studio</h1>
        <p className="mt-1 text-sm text-ink-muted">
          Source → country partition → embedding / token index → candidate generation → feature
          engineering → LightGBM → threshold → matches.
        </p>
      </div>
      <div className="flex-1">
        <PipelineCanvas />
      </div>
    </div>
  );
}
