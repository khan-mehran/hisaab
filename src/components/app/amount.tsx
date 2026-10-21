"use client";

import { cn } from "@/lib/utils";
import { useMoney } from "@/lib/queries";
import type { Currency } from "@/lib/currency";

type StackProps = {
  /** Shown large. */
  primary: number;
  primaryCurrency: Currency;
  /** Shown small underneath; omit to hide. */
  secondary?: number | null;
  secondaryCurrency?: Currency;
  size?: "sm" | "md" | "lg";
  className?: string;
};

const SIZES = {
  sm: "text-sm font-medium",
  md: "text-xl font-semibold",
  lg: "text-2xl sm:text-3xl font-semibold",
};

/**
 * Large amount with its converted value small below, e.g.
 * Rs 116,100 over QAR 1,500 (business rule 6).
 */
export function AmountStack({
  primary,
  primaryCurrency,
  secondary,
  secondaryCurrency,
  size = "md",
  className,
}: StackProps) {
  const money = useMoney();
  return (
    <div className={cn("flex flex-col", className)}>
      <span className={cn("tracking-tight num", SIZES[size])}>{money.format(primary, primaryCurrency)}</span>
      {secondary != null && secondaryCurrency && (
        <span className="text-xs text-muted-foreground num">{money.format(secondary, secondaryCurrency)}</span>
      )}
    </div>
  );
}

/** Inline formatted amount for table cells. */
export function Money({ value, currency, className }: { value: number; currency: Currency; className?: string }) {
  const money = useMoney();
  return <span className={cn("num", className)}>{money.format(value, currency)}</span>;
}
