"use client";

import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useMoney } from "@/lib/queries";
import { cn } from "@/lib/utils";

/** One summary figure (Total, Paid, Still owed) with a loading state. */
export function SummaryFigure({ label, value, loading, highlight }: { label: string; value: number; loading: boolean; highlight?: boolean }) {
  const money = useMoney();
  return (
    <Card className={cn("gap-1 p-3 sm:p-4", highlight && "ring-primary/30")}>
      <p className="text-xs text-muted-foreground">{label}</p>
      {loading ? (
        <Skeleton className="h-6 w-24" />
      ) : (
        <p className={cn("truncate text-base font-semibold tracking-tight num sm:text-xl", highlight && value > 0 && "text-primary dark:text-[color-mix(in_oklch,var(--primary),white_40%)]")}>
          {money.pkr(value)}
        </p>
      )}
    </Card>
  );
}
