"use client";

import { TriangleAlertIcon } from "lucide-react";
import { useMoney, usePoolTotals } from "@/lib/queries";
import { exceedsPool, poolStatus, type PoolKey } from "@/lib/calc/pools";
import { round2 } from "@/lib/currency";

/** Allocated / used / remaining for one pool, from the pool_totals view. */
export function usePool(pool: PoolKey) {
  const query = usePoolTotals();
  const row = query.data?.find((r) => r.pool === pool);
  return {
    loading: query.isLoading,
    status: poolStatus(Number(row?.allocated_pkr ?? 0), Number(row?.used_pkr ?? 0)),
    allocatedQar: Number(row?.allocated_qar ?? 0),
  };
}

/**
 * Amber warning shown in an entry form when the amount is more than what's
 * left in the pool. It never blocks saving (business rule 5).
 */
export function PoolWarning({
  remaining,
  amount,
  previousAmount = 0,
  label,
}: {
  remaining: number;
  amount: number;
  previousAmount?: number;
  label: string;
}) {
  const money = useMoney();
  if (!Number.isFinite(amount) || amount <= 0 || !exceedsPool(remaining, amount, previousAmount)) return null;
  const over = round2(amount - previousAmount - remaining);
  return (
    <p className="flex items-start gap-2 rounded-lg bg-warning/15 px-3 py-2 text-sm text-[color-mix(in_oklch,var(--warning),black_45%)] dark:text-warning">
      <TriangleAlertIcon className="mt-0.5 size-4 shrink-0" />
      <span>
        This is {money.pkr(over)} more than what&apos;s left in the {label} pool ({money.pkr(Math.max(0, remaining))}). You can still save it.
      </span>
    </p>
  );
}
