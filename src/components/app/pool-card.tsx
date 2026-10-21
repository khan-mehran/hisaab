"use client";

import type { LucideIcon } from "lucide-react";
import { TriangleAlertIcon } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useMoney } from "@/lib/queries";
import type { PoolStatus } from "@/lib/calc/pools";
import { cn } from "@/lib/utils";

type Props = {
  title: string;
  icon: LucideIcon;
  status: PoolStatus;
  /** QAR value of the allocation, shown small under the allocated PKR. */
  allocatedQar?: number;
  loading?: boolean;
  /** Override the default Allocated / Used / Remaining labels. */
  labels?: { allocated?: string; used?: string; remaining?: string };
  /** Short explanation shown under the figures. */
  hint?: React.ReactNode;
};

/** Allocated / Used / Remaining card for a pool fed from the Sent page. */
export function PoolCard({ title, icon: Icon, status, allocatedQar, loading, labels, hint }: Props) {
  const money = useMoney();
  const l = { allocated: "Allocated", used: "Used", remaining: "Remaining", ...labels };

  return (
    <Card className="gap-4 p-4">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="flex size-8 items-center justify-center rounded-lg bg-primary/10 text-primary dark:bg-primary/20 dark:text-[color-mix(in_oklch,var(--primary),white_35%)]">
            <Icon className="size-4" />
          </span>
          <span className="text-sm font-medium text-muted-foreground">{title} pool</span>
        </div>
        {status.over && !loading && (
          <span className="flex items-center gap-1 rounded-full bg-warning/15 px-2 py-0.5 text-xs font-medium text-[color-mix(in_oklch,var(--warning),black_35%)] dark:text-warning">
            <TriangleAlertIcon className="size-3" /> Over by {money.pkr(-status.remaining)}
          </span>
        )}
      </div>

      {loading ? (
        <div className="grid grid-cols-3 gap-3">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-12" />
          ))}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-3 gap-3">
            <Figure label={l.allocated} value={money.pkr(status.allocated)} sub={allocatedQar != null ? money.qar(allocatedQar) : undefined} />
            <Figure label={l.used} value={money.pkr(status.used)} />
            <Figure
              label={l.remaining}
              // Never show a negative pool; the "Over by" badge shows the overspend.
              value={money.pkr(Math.max(0, status.remaining))}
              className={status.over ? "text-destructive" : "text-success"}
            />
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-muted" role="progressbar" aria-valuenow={status.percentUsed} aria-valuemin={0} aria-valuemax={100} aria-label={`${status.percentUsed}% used`}>
            <div
              className={cn("h-full rounded-full transition-all", status.over ? "bg-destructive" : "bg-primary")}
              style={{ width: `${status.percentUsed}%` }}
            />
          </div>
          {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
        </>
      )}
    </Card>
  );
}

function Figure({ label, value, sub, className }: { label: string; value: string; sub?: string; className?: string }) {
  return (
    <div className="min-w-0">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={cn("truncate text-base font-semibold tracking-tight num sm:text-lg", className)}>{value}</p>
      {sub && <p className="truncate text-xs text-muted-foreground num">{sub}</p>}
    </div>
  );
}
