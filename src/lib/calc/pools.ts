import { qarToPkr, round2 } from "@/lib/currency";

export type PoolKey = "charity" | "debt" | "installments" | "others";
export const POOL_KEYS: PoolKey[] = ["charity", "debt", "installments", "others"];

export type AllocationInput = {
  amount: number;
  charity?: number;
  debt?: number;
  installments?: number;
  others?: number;
};

/**
 * Check a send's optional parts against its amount (business rule 4).
 * The remainder is the family portion.
 */
export function validateAllocation(input: AllocationInput) {
  const parts = round2(
    (input.charity ?? 0) + (input.debt ?? 0) + (input.installments ?? 0) + (input.others ?? 0),
  );
  const familyQar = round2(input.amount - parts);
  return { ok: familyQar >= 0, partsQar: parts, familyQar, excessQar: familyQar < 0 ? -familyQar : 0 };
}

export type SendLike = {
  amount_qar: number;
  charity_qar: number;
  debt_qar: number;
  installments_qar: number;
  others_qar: number;
  rate_qar_pkr: number;
};

type Money = { qar: number; pkr: number };
export type SendTotals = Record<PoolKey | "total" | "family", Money>;

/**
 * Totals across sends in QAR and PKR. Each send converts at its own locked
 * rate (business rule 7), rounded per send to match the database views.
 */
export function sendTotals(sends: SendLike[]): SendTotals {
  const totals: SendTotals = {
    total: { qar: 0, pkr: 0 },
    family: { qar: 0, pkr: 0 },
    charity: { qar: 0, pkr: 0 },
    debt: { qar: 0, pkr: 0 },
    installments: { qar: 0, pkr: 0 },
    others: { qar: 0, pkr: 0 },
  };
  const add = (key: keyof SendTotals, qar: number, rate: number) => {
    totals[key].qar = round2(totals[key].qar + qar);
    totals[key].pkr = round2(totals[key].pkr + qarToPkr(qar, rate));
  };

  for (const s of sends) {
    const rate = Number(s.rate_qar_pkr);
    const parts = {
      charity: Number(s.charity_qar),
      debt: Number(s.debt_qar),
      installments: Number(s.installments_qar),
      others: Number(s.others_qar),
    };
    add("total", Number(s.amount_qar), rate);
    for (const key of POOL_KEYS) add(key, parts[key], rate);
    add("family", validateAllocation({ amount: Number(s.amount_qar), ...parts }).familyQar, rate);
  }
  return totals;
}

export type PoolStatus = {
  allocated: number;
  used: number;
  remaining: number;
  /** 0-100, capped, for progress bars. */
  percentUsed: number;
  over: boolean;
};

/** Allocated / Used / Remaining for a pool card (business rule 5). */
export function poolStatus(allocatedPkr: number, usedPkr: number): PoolStatus {
  const remaining = round2(allocatedPkr - usedPkr);
  return {
    allocated: round2(allocatedPkr),
    used: round2(usedPkr),
    remaining,
    percentUsed: allocatedPkr > 0 ? Math.min(100, Math.round((usedPkr / allocatedPkr) * 100)) : usedPkr > 0 ? 100 : 0,
    over: remaining < 0,
  };
}

/**
 * Whether a new entry would take the pool below zero. Used for a warning
 * only, never to block the entry. When editing, pass the entry's previous
 * amount so it isn't counted twice.
 */
export function exceedsPool(remainingPkr: number, amountPkr: number, previousAmountPkr = 0): boolean {
  return round2(amountPkr - previousAmountPkr) > round2(remainingPkr);
}
