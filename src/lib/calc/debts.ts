import { round2 } from "@/lib/currency";

export type DebtKind = "taken" | "given";

export type PersonLike = { id: string; name: string };

export type DebtLike = {
  id: string;
  person_id: string;
  kind: DebtKind;
  amount_pkr: number;
  debt_date: string;
  created_at?: string;
};

export type PaymentLike = {
  id: string;
  person_id: string;
  kind: DebtKind;
  amount_pkr: number;
  paid_on: string;
  created_at?: string;
};

export type PersonRow<P extends PersonLike> = {
  person: P;
  /** Sum of every debt with this person (they may lend/borrow many times). */
  total: number;
  paid: number;
  remaining: number;
  cleared: boolean;
  /** Number of separate debt entries. */
  entries: number;
  firstDate: string;
  lastActivity: string;
  /** Paid per month, keyed YYYY-MM. */
  byMonth: Record<string, number>;
};

export type PeopleSummary<P extends PersonLike> = {
  /** Months that have at least one payment, oldest first (YYYY-MM). */
  months: string[];
  rows: PersonRow<P>[];
  totals: { total: number; paid: number; remaining: number; byMonth: Record<string, number> };
};

/**
 * One row per person for a kind (taken or given): all their debts added up,
 * all payments added up, and payments per month for the Excel-style view.
 * People with no debt of this kind are left out. Rows are ordered by when
 * the first debt started.
 */
export function summarizePeople<P extends PersonLike>(
  people: P[],
  debts: DebtLike[],
  payments: PaymentLike[],
  kind: DebtKind,
): PeopleSummary<P> {
  const acc = new Map<string, { total: number; paid: number; entries: number; first: string; last: string; byMonth: Record<string, number> }>();
  const months = new Set<string>();
  const totals = { total: 0, paid: 0, remaining: 0, byMonth: {} as Record<string, number> };

  for (const d of debts) {
    if (d.kind !== kind) continue;
    const a = acc.get(d.person_id) ?? { total: 0, paid: 0, entries: 0, first: d.debt_date, last: d.debt_date, byMonth: {} };
    a.total = round2(a.total + Number(d.amount_pkr));
    a.entries += 1;
    if (d.debt_date < a.first) a.first = d.debt_date;
    if (d.debt_date > a.last) a.last = d.debt_date;
    acc.set(d.person_id, a);
  }

  for (const p of payments) {
    const a = acc.get(p.person_id);
    if (p.kind !== kind || !a) continue;
    const month = p.paid_on.slice(0, 7);
    const amount = Number(p.amount_pkr);
    a.paid = round2(a.paid + amount);
    a.byMonth[month] = round2((a.byMonth[month] ?? 0) + amount);
    totals.byMonth[month] = round2((totals.byMonth[month] ?? 0) + amount);
    if (p.paid_on > a.last) a.last = p.paid_on;
    months.add(month);
  }

  const rows: PersonRow<P>[] = [];
  for (const person of people) {
    const a = acc.get(person.id);
    if (!a) continue;
    const remaining = round2(a.total - a.paid);
    totals.total = round2(totals.total + a.total);
    totals.paid = round2(totals.paid + a.paid);
    totals.remaining = round2(totals.remaining + remaining);
    rows.push({
      person,
      total: a.total,
      paid: a.paid,
      remaining,
      cleared: remaining <= 0,
      entries: a.entries,
      firstDate: a.first,
      lastActivity: a.last,
      byMonth: a.byMonth,
    });
  }
  rows.sort((x, y) => x.firstDate.localeCompare(y.firstDate) || x.person.name.localeCompare(y.person.name));

  return { months: [...months].sort(), rows, totals };
}

export type LedgerEntry =
  | { type: "debt"; id: string; date: string; amount: number; balance: number; note?: string | null }
  | { type: "payment"; id: string; date: string; amount: number; balance: number };

/**
 * Chronological history with one person for a kind: every debt (+) and
 * every payment (−) with the balance after each. On the same day a debt is
 * listed before a payment.
 */
export function personLedger(
  debts: (DebtLike & { note?: string | null })[],
  payments: PaymentLike[],
  personId: string,
  kind: DebtKind,
): LedgerEntry[] {
  type Item = { type: "debt" | "payment"; id: string; date: string; amount: number; created: string; note?: string | null };
  const items: Item[] = [
    ...debts
      .filter((d) => d.person_id === personId && d.kind === kind)
      .map((d) => ({ type: "debt" as const, id: d.id, date: d.debt_date, amount: Number(d.amount_pkr), created: d.created_at ?? "", note: d.note })),
    ...payments
      .filter((p) => p.person_id === personId && p.kind === kind)
      .map((p) => ({ type: "payment" as const, id: p.id, date: p.paid_on, amount: Number(p.amount_pkr), created: p.created_at ?? "" })),
  ];

  items.sort(
    (a, b) =>
      a.date.localeCompare(b.date) ||
      (a.type === b.type ? 0 : a.type === "debt" ? -1 : 1) ||
      a.created.localeCompare(b.created),
  );

  let balance = 0;
  return items.map((i) => {
    balance = round2(balance + (i.type === "debt" ? i.amount : -i.amount));
    return i.type === "debt"
      ? { type: "debt", id: i.id, date: i.date, amount: i.amount, balance, note: i.note }
      : { type: "payment", id: i.id, date: i.date, amount: i.amount, balance };
  });
}

/** Existing person with the same name, ignoring case and extra spaces. */
export function findPersonByName<P extends PersonLike>(people: P[], name: string): P | undefined {
  const key = name.replace(/\s+/g, " ").trim().toLowerCase();
  return key ? people.find((p) => p.name.replace(/\s+/g, " ").trim().toLowerCase() === key) : undefined;
}

/**
 * Validate a payment against what is still owed. Returns an error message,
 * or null when the payment is allowed.
 */
export function validatePayment(remainingPkr: number, amountPkr: number): string | null {
  if (!Number.isFinite(amountPkr) || amountPkr <= 0) return "Enter an amount greater than 0";
  if (remainingPkr <= 0) return "This debt is already cleared";
  if (round2(amountPkr) > round2(remainingPkr)) return "Payment is more than the remaining amount";
  return null;
}
