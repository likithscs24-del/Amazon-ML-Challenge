"use client";

import { useState } from "react";
import Sidebar from "@/components/ui/Sidebar";
import TopStatusBar from "@/components/ui/TopStatusBar";
import CommandPalette from "@/components/ui/CommandPalette";

export default function WorkspaceLayout({ children }: { children: React.ReactNode }) {
  const [paletteOpen, setPaletteOpen] = useState(false);

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-base bg-grid-fade">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <TopStatusBar onOpenPalette={() => setPaletteOpen(true)} />
        <div className="flex-1 overflow-y-auto">{children}</div>
      </div>
      <CommandPalette open={paletteOpen} onOpenChange={setPaletteOpen} />
    </div>
  );
}
