import { z } from "zod";
import { CURRENCIES, parseAmount } from "@/lib/currency";
import { ISO_DATE, ISO_MONTH } from "@/lib/dates";
import { validateAllocation } from "@/lib/calc/pools";

/**
 * Entity schemas shared by client forms and server actions. Form inputs are
 * strings; each schema accepts strings or numbers and outputs clean values.
 */

const MAX_AMOUNT = 999_999_999_999;

const amountInput = z.union([z.string(), z.number()]);

/** Required amount greater than 0, e.g. "1,500.50" -> 1500.5. */
export const amount = amountInput
  .transform((v) => parseAmount(v))
  .pipe(
    z
      .number({ error: "Enter a valid amount" })
      .positive({ error: "Must be more than 0" })
      .max(MAX_AMOUNT, { error: "Amount is too large" }),
  );

/** Optional amount; empty means 0. */
export const optionalAmount = amountInput
  .optional()
  .transform((v) => (v === undefined || v === "" ? 0 : parseAmount(v)))
  .pipe(
    z
      .number({ error: "Enter a valid amount" })
      .min(0, { error: "Can't be negative" })
      .max(MAX_AMOUNT, { error: "Amount is too large" }),
  );

export const isoDate = z.string().regex(ISO_DATE, { error: "Pick a date" });

/** Accepts "YYYY-MM" (month input) or a full date and returns the 1st of the month. */
export const monthDate = z
  .string()
  .refine((v) => ISO_MONTH.test(v) || ISO_DATE.test(v), { error: "Pick a month" })
  .transform((v) => `${v.slice(0, 7)}-01`);

const text = (label: string, max: number) =>
  z.string().trim().min(1, { error: `Enter ${label}` }).max(max, { error: `${label} is too long` });

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max, { error: "Too long" })
    .optional()
    .transform((v) => (v ? v : null));

export const BANKS = ["BAHL", "HBL", "ABL"] as const;
export const BANK_NAMES: Record<(typeof BANKS)[number], string> = {
  BAHL: "Bank AL Habib",
  HBL: "Habib Bank",
  ABL: "Allied Bank",
};
export const bank = z.enum(BANKS, { error: "Choose a bank" });

export const RELATIONS = ["Father", "Mother", "My Family", "Brother"] as const;
export const RELATIONSHIPS = ["Relative", "Neighbour", "Other"] as const;
export const EXPENSE_CATEGORIES = ["Room rent", "Transport", "Food", "Other"] as const;

// ---------------------------------------------------------------------------

export const expenseSchema = z
  .object({
    period: z.enum(["daily", "weekly", "monthly"]),
    date_from: z.string().refine((v) => ISO_DATE.test(v) || ISO_MONTH.test(v), { error: "Pick a date" }),
    date_to: z.string().optional(),
    category: text("a category", 60),
    amount_qar: amount,
    reason: optionalText(500),
  })
  .superRefine((d, ctx) => {
    if (d.period === "weekly") {
      if (!d.date_to || !ISO_DATE.test(d.date_to)) {
        ctx.addIssue({ code: "custom", path: ["date_to"], message: "Pick the end date" });
      } else if (d.date_to < d.date_from) {
        ctx.addIssue({ code: "custom", path: ["date_to"], message: "End date is before start date" });
      }
    }
  })
  .transform((d) => ({
    ...d,
    // Monthly rows store the 1st of the month; only weekly rows keep date_to.
    date_from: d.period === "monthly" ? `${d.date_from.slice(0, 7)}-01` : d.date_from,
    date_to: d.period === "weekly" ? d.date_to! : null,
  }));

export const sendSchema = z
  .object({
    sent_date: isoDate,
    amount_qar: amount,
    charity_qar: optionalAmount,
    debt_qar: optionalAmount,
    installments_qar: optionalAmount,
    others_qar: optionalAmount,
    bank,
  })
  .superRefine((d, ctx) => {
    const check = validateAllocation({
      amount: d.amount_qar,
      charity: d.charity_qar,
      debt: d.debt_qar,
      installments: d.installments_qar,
      others: d.others_qar,
    });
    if (!check.ok) {
      ctx.addIssue({
        code: "custom",
        path: ["amount_qar"],
        message: `Parts are QAR ${check.excessQar} more than the amount sent`,
      });
    }
  });

export const familyTransferSchema = z.object({
  transfer_date: isoDate,
  relation: z.enum(RELATIONS, { error: "Choose a relation" }),
  amount_pkr: amount,
});

export const charitySchema = z.object({
  entry_date: isoDate,
  name: text("a name", 100),
  amount_pkr: amount,
  relationship: z.enum(RELATIONSHIPS, { error: "Choose a relationship" }),
});

export const personName = text("a name", 100);

/**
 * New debt. Either an existing person (person_id, e.g. "Add more" on the
 * person page or after confirming "same person") or a name to look up/create.
 */
export const debtCreateSchema = z
  .object({
    kind: z.enum(["taken", "given"]),
    debt_date: isoDate,
    amount_pkr: amount,
    note: optionalText(500),
    person_id: z.uuid().optional(),
    person_name: z.string().trim().max(100, { error: "Name is too long" }).optional(),
  })
  .refine((d) => d.person_id || d.person_name, { path: ["person_name"], error: "Enter a name" });

/** Editing one debt entry (the person and kind stay the same). */
export const debtUpdateSchema = z.object({
  debt_date: isoDate,
  amount_pkr: amount,
  note: optionalText(500),
});

/** A payment to (taken) or from (given) a person, across all their debts. */
export const debtPaymentSchema = z.object({
  person_id: z.uuid(),
  kind: z.enum(["taken", "given"]),
  paid_on: isoDate,
  amount_pkr: amount,
});

export const installmentSchema = z.object({
  entry_date: isoDate,
  title: text("a title", 100),
  amount_pkr: amount,
  note: optionalText(500),
});

export const otherEntrySchema = z.object({
  entry_date: isoDate,
  label: text("a label", 100),
  amount_pkr: amount,
});

export const otherBatchSchema = z.object({
  entry_date: isoDate,
  items: z
    .array(z.object({ label: text("a label", 100), amount_pkr: amount }))
    .min(1, { error: "Add at least one row" })
    .max(30, { error: "Too many rows" }),
});

export const savingsSchema = z.object({
  kind: z.enum(["personal", "family"]),
  saved_date: isoDate,
  amount_qar: amount,
  bank,
});

export const incomeSchema = z.object({
  month: monthDate,
  amount,
  currency: z.enum(CURRENCIES as ["QAR", "PKR", "USD"]),
});

export const settingsSchema = z.object({
  salary_currency: z.enum(CURRENCIES as ["QAR", "PKR", "USD"]),
  number_locale: z.enum(["en-US", "en-IN"]),
});

export type ExpenseInput = z.input<typeof expenseSchema>;
export type DebtCreateInput = z.input<typeof debtCreateSchema>;
export type DebtUpdateInput = z.input<typeof debtUpdateSchema>;
export type SendInput = z.input<typeof sendSchema>;
export type OtherBatchInput = z.input<typeof otherBatchSchema>;
export type IncomeInput = z.input<typeof incomeSchema>;
export type SettingsInput = z.input<typeof settingsSchema>;
