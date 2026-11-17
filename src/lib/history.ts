/** Sections that keep a month-by-month history, keyed by their /history/<slug> URL. */
export const HISTORY_SECTIONS = {
  expenses: { title: "Expenses", href: "/expenses" },
  sent: { title: "Sent", href: "/sent" },
  charity: { title: "Charity", href: "/charity" },
  installments: { title: "Installments", href: "/installments" },
  others: { title: "Others", href: "/others" },
  "personal-savings": { title: "Personal Savings", href: "/savings/personal" },
  "family-savings": { title: "Family Savings", href: "/savings/family" },
} as const;

export type HistorySection = keyof typeof HISTORY_SECTIONS;

/**
 * Whether an entry has been moved to History: it was recorded at or before the
 * last time the user pressed "Clear month" on its page (`clearedAt`, ISO time).
 */
export function isCleared(createdAt: string, clearedAt: string | null | undefined): boolean {
  return clearedAt != null && Date.parse(createdAt) <= Date.parse(clearedAt);
}

export function isHistorySection(value: unknown): value is HistorySection {
  return typeof value === "string" && Object.hasOwn(HISTORY_SECTIONS, value);
}
