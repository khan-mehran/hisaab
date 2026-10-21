import { round2 } from "@/lib/currency";

/** Totals for one month, all in QAR. */
export type MonthTotals = {
  expensesQar: number;
  sentQar: number;
  personalSavingsQar: number;
  familySavingsQar: number;
};

export type IncomeLike = { month: string; amount_qar: number };

/**
 * Balance = Salary - Expenses - Sent - Personal Savings - Family Savings.
 * Before any salary is saved the balance is 0 (business rule 2).
 */
export function computeBalance(salaryQar: number | null, totals: MonthTotals): number {
  if (salaryQar == null) return 0;
  return round2(
    salaryQar -
      totals.expensesQar -
      totals.sentQar -
      totals.personalSavingsQar -
      totals.familySavingsQar,
  );
}

/**
 * Salary for a month: the most recent income saved for that month or any
 * earlier month, so a salary keeps applying until it is changed.
 */
export function salaryForMonth<T extends IncomeLike>(incomes: T[], month: string): T | null {
  const target = `${month.slice(0, 7)}-01`;
  let best: T | null = null;
  for (const income of incomes) {
    if (income.month <= target && (!best || income.month > best.month)) best = income;
  }
  return best;
}

export const EMPTY_TOTALS: MonthTotals = {
  expensesQar: 0,
  sentQar: 0,
  personalSavingsQar: 0,
  familySavingsQar: 0,
};
