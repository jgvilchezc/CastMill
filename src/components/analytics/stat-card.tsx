"use client";

import { cn } from "@/lib/utils";

function formatNumber(n: number | undefined): string {
  if (n === undefined || n === null) return "—";
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toLocaleString();
}

interface StatCardProps {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: number | undefined;
  accentClass?: string;
}

export function StatCard({ icon: Icon, label, value, accentClass }: StatCardProps) {
  return (
    <div className={cn(
      "relative rounded-xl border border-border bg-card p-4 overflow-hidden transition-shadow hover:shadow-md",
    )}>
      <div className={cn("absolute inset-x-0 top-0 h-0.5", accentClass ?? "bg-primary/50")} />
      <div className="flex items-center gap-2 mb-2">
        <Icon className="h-4 w-4 text-muted-foreground" />
        <span className="text-xs text-muted-foreground">{label}</span>
      </div>
      <p className="text-2xl font-bold tracking-tight tabular-nums">{formatNumber(value)}</p>
    </div>
  );
}

export { formatNumber };
