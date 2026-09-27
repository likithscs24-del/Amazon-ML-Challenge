"use client";

import { Command } from "cmdk";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { ENTITIES } from "@/lib/mockData";

export default function CommandPalette({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const router = useRouter();

  useEffect(() => {
    function handler(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        onOpenChange(!open);
      }
      if (e.key === "Escape") onOpenChange(false);
    }
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [open, onOpenChange]);

  function go(path: string) {
    router.push(path);
    onOpenChange(false);
  }

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-black/60 pt-[15vh] backdrop-blur-sm"
      onClick={() => onOpenChange(false)}
    >
      <div onClick={(e) => e.stopPropagation()} className="w-full max-w-lg">
        <Command
          className="overflow-hidden rounded-xl border border-border-strong bg-surface-raised shadow-2xl"
          loop
        >
          <Command.Input
            autoFocus
            placeholder="Search entities, runs, datasets..."
            className="w-full border-b border-border bg-transparent px-4 py-3.5 text-sm text-ink outline-none placeholder:text-ink-faint"
          />
          <Command.List className="max-h-80 overflow-y-auto p-2">
            <Command.Empty className="px-3 py-6 text-center text-sm text-ink-muted">
              No results found.
            </Command.Empty>

            <Command.Group heading="Navigate" className="text-[11px] uppercase tracking-wide text-ink-faint px-2 py-1.5">
              {[
                { label: "Open pipeline studio", path: "/workspace/pipeline" },
                { label: "Open entity explorer", path: "/workspace/entities" },
                { label: "Open training observatory", path: "/workspace/experiments" },
                { label: "Back to overview", path: "/workspace" },
              ].map((item) => (
                <Command.Item
                  key={item.path}
                  onSelect={() => go(item.path)}
                  className="cursor-pointer rounded-md px-3 py-2 text-sm text-ink data-[selected=true]:bg-surface-hover"
                >
                  {item.label}
                </Command.Item>
              ))}
            </Command.Group>

            <Command.Group heading="Entities" className="text-[11px] uppercase tracking-wide text-ink-faint px-2 py-1.5 mt-1">
              {ENTITIES.slice(0, 6).map((e) => (
                <Command.Item
                  key={e.id}
                  onSelect={() => go(`/workspace/entities/${e.id}`)}
                  className="cursor-pointer rounded-md px-3 py-2 text-sm text-ink data-[selected=true]:bg-surface-hover flex items-center justify-between"
                >
                  <span>{e.name}</span>
                  <span className="font-mono text-xs text-ink-muted">{e.id}</span>
                </Command.Item>
              ))}
            </Command.Group>
          </Command.List>
        </Command>
      </div>
    </div>
  );
}
