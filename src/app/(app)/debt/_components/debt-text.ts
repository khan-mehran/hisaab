import type { DebtKind } from "@/lib/calc/debts";

/** Wording for each side of a debt, so pages read naturally for taken vs given. */
export const DEBT_TEXT = {
  taken: {
    tab: "Taken",
    debtEntry: "Borrowed",
    paymentEntry: "Paid back",
    paid: "Paid",
    total: "Total taken",
    owed: "Still to pay",
    action: "Pay",
    payTitle: "Pay back",
    add: "Add debt taken",
    addMore: "Borrow more",
    startOther: "Borrow from",
    section: (name: string) => `You borrowed from ${name}`,
    empty: "You don't owe anyone",
  },
  given: {
    tab: "Given",
    debtEntry: "Lent",
    paymentEntry: "Received back",
    paid: "Received",
    total: "Total given",
    owed: "Still to receive",
    action: "Receive",
    payTitle: "Receive money back",
    add: "Add debt given",
    addMore: "Lend more",
    startOther: "Lend to",
    section: (name: string) => `You lent to ${name}`,
    empty: "Nobody owes you",
  },
} satisfies Record<DebtKind, unknown>;

export const DEBT_KINDS: DebtKind[] = ["taken", "given"];
