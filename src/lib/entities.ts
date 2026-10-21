import type { z } from "zod";
import {
  charitySchema,
  debtPaymentSchema,
  expenseSchema,
  familyTransferSchema,
  installmentSchema,
  otherEntrySchema,
  savingsSchema,
} from "@/lib/validation/schemas";

/**
 * Simple entities saved through the generic saveEntity / deleteEntity server
 * actions: one form, one table row. Sends, the Others batch, income, the
 * profile and debts (which find or create a person) have their own actions.
 */
export const ENTITIES = {
  expenses: expenseSchema,
  family_transfers: familyTransferSchema,
  charity_entries: charitySchema,
  debt_payments: debtPaymentSchema,
  installments: installmentSchema,
  other_entries: otherEntrySchema,
  savings: savingsSchema,
} as const;

export type EntityName = keyof typeof ENTITIES;
export type EntityInput<E extends EntityName> = z.input<(typeof ENTITIES)[E]>;

/** Tables whose rows can be deleted by id. */
export const DELETABLE = [...(Object.keys(ENTITIES) as EntityName[]), "sends", "incomes", "debts", "debt_people"] as const;
export type DeletableTable = (typeof DELETABLE)[number];
