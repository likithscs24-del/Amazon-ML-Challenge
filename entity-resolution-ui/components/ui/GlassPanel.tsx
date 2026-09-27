import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

export default function GlassPanel({
  children,
  className,
  title,
  action,
}: {
  children: ReactNode;
  className?: string;
  title?: string;
  action?: ReactNode;
}) {
  return (
    <div className={cn("rounded-xl border border-border bg-surface/70 backdrop-blur-sm", className)}>
      {title && (
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <h3 className="text-sm text-ink">{title}</h3>
          {action}
        </div>
      )}
      <div className={title ? "p-4" : ""}>{children}</div>
    </div>
  );
}
