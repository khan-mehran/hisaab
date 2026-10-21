"use client";

import { TriangleAlertIcon } from "lucide-react";
import { useRate } from "@/lib/queries";
import { formatDate } from "@/lib/dates";
import { cn } from "@/lib/utils";

/** "1 QAR = Rs 77.40", or a note when the last known rate is in use. */
export function RateNote({ className }: { className?: string }) {
  const { data, isLoading, isError } = useRate();

  if (isLoading) return <span className={cn("text-xs text-muted-foreground", className)}>Loading rate…</span>;
  if (isError || !data) {
    return (
      <span className={cn("flex items-center gap-1 text-xs text-destructive", className)}>
        <TriangleAlertIcon className="size-3.5" /> Exchange rate unavailable
      </span>
    );
  }

  return (
    <span className={cn("flex items-center gap-1 text-xs text-muted-foreground num", className)}>
      {data.stale && <TriangleAlertIcon className="size-3.5 text-warning" />}
      1 QAR = Rs {data.qarPkr.toFixed(2)}
      {data.stale && <> · Using last known rate ({formatDate(data.fetchedAt.slice(0, 10))})</>}
    </span>
  );
}
