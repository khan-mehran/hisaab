"use client";

import { Input } from "@/components/ui/input";
import type { Currency } from "@/lib/currency";
import { cn } from "@/lib/utils";

type Props = Omit<React.ComponentProps<"input">, "type"> & {
  currency: Currency;
  invalid?: boolean;
};

/** Decimal amount input with the currency shown inside the field. */
export function MoneyInput({ currency, invalid, className, onChange, ...props }: Props) {
  return (
    <div className="relative">
      <span className="pointer-events-none absolute inset-y-0 left-0 flex w-12 items-center justify-center text-xs font-semibold text-muted-foreground">
        {currency === "PKR" ? "Rs" : currency}
      </span>
      <Input
        type="text"
        inputMode="decimal"
        autoComplete="off"
        placeholder="0"
        aria-invalid={invalid || undefined}
        className={cn("h-10 pl-12 text-right num", className)}
        onChange={(e) => {
          // Allow digits, one dot and grouping commas only.
          e.target.value = e.target.value.replace(/[^\d.,]/g, "").replace(/(\..*)\./g, "$1");
          onChange?.(e);
        }}
        {...props}
      />
    </div>
  );
}
