"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import {
  LayoutGrid,
  Workflow,
  Database,
  FlaskConical,
  ChevronsLeft,
  ChevronsRight,
  CircleDot,
} from "lucide-react";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/workspace", label: "Overview", icon: LayoutGrid },
  { href: "/workspace/pipeline", label: "Pipeline", icon: Workflow },
  { href: "/workspace/entities", label: "Entities", icon: Database },
  { href: "/workspace/experiments", label: "Experiments", icon: FlaskConical },
];

export default function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const pathname = usePathname();

  return (
    <aside
      className={cn(
        "flex h-screen flex-col border-r border-border bg-surface/60 backdrop-blur-sm transition-all duration-200",
        collapsed ? "w-[64px]" : "w-[220px]"
      )}
    >
      <div className="flex items-center gap-2 px-4 py-5">
        <CircleDot className="h-4 w-4 text-signal shrink-0" />
        {!collapsed && (
          <span className="font-mono text-[13px] tracking-tight text-ink">ENTITY</span>
        )}
      </div>

      <nav className="flex-1 space-y-0.5 px-2">
        {NAV.map((item) => {
          const active = pathname === item.href;
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-md px-2.5 py-2 text-sm transition-colors",
                active
                  ? "bg-surface-hover text-ink"
                  : "text-ink-muted hover:bg-surface-hover hover:text-ink"
              )}
            >
              <Icon className="h-4 w-4 shrink-0" />
              {!collapsed && <span>{item.label}</span>}
              {active && !collapsed && (
                <span className="ml-auto h-1.5 w-1.5 rounded-full bg-signal" />
              )}
            </Link>
          );
        })}
      </nav>

      <button
        onClick={() => setCollapsed((v) => !v)}
        className="mx-2 mb-4 flex items-center justify-center gap-2 rounded-md border border-border py-1.5 text-ink-muted hover:text-ink hover:border-border-strong transition-colors"
      >
        {collapsed ? <ChevronsRight className="h-3.5 w-3.5" /> : <ChevronsLeft className="h-3.5 w-3.5" />}
      </button>
    </aside>
  );
}
