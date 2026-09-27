import EntityTable from "@/components/entities/EntityTable";
import { ENTITIES } from "@/lib/mockData";

export default function EntitiesPage() {
  return (
    <div className="flex h-full flex-col">
      <div className="px-6 py-5">
        <h1 className="text-xl text-ink">Dataset Explorer</h1>
        <p className="mt-1 text-sm text-ink-muted">
          {ENTITIES.length} sampled Source-1 entities and their candidate matches. Click a row for the
          full relationship view and match explanation.
        </p>
      </div>
      <div className="flex-1 min-h-0">
        <EntityTable />
      </div>
    </div>
  );
}
