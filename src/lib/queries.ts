"use client";

import { useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import type { Tables, Views } from "@/lib/database.types";
import type { ActionResult } from "@/lib/action-result";
import type { RateInfo } from "@/lib/rates/get-rate";
import { formatMoney, type Currency, type NumberLocale } from "@/lib/currency";
import { monthStart, nextMonthStart } from "@/lib/dates";

/**
 * Read hooks. Reads go straight to Supabase from the browser; Row Level
 * Security limits every query to the signed-in user's rows. Writes go
 * through server actions (see useAction).
 */

let browserClient: ReturnType<typeof createClient> | undefined;
const db = () => (browserClient ??= createClient());

/**
 * Throw a safe error for TanStack Query; the raw message is only logged.
 * `empty` is returned when there's no data: [] for lists, null for single rows.
 */
function check<T>(
  result: { data: T | null; error: { message: string } | null },
  what: string,
  empty: unknown = [],
): T {
  if (result.error) {
    console.error(`[query] ${what}:`, result.error.message);
    throw new Error(`Couldn't load ${what}.`);
  }
  return (result.data ?? empty) as T;
}

// --- Exchange rate & profile ------------------------------------------------

export function useRate() {
  return useQuery<RateInfo>({
    queryKey: ["rate"],
    queryFn: async () => {
      const res = await fetch("/api/rate");
      const body = await res.json();
      if (!res.ok) throw new Error(body.error ?? "Exchange rate unavailable");
      return body as RateInfo;
    },
    staleTime: 30 * 60_000,
    retry: 2,
  });
}

export function useProfile() {
  return useQuery({
    queryKey: ["profiles"],
    queryFn: async () =>
      check(await db().from("profiles").select("*").maybeSingle(), "profile", null) as Tables<"profiles"> | null,
    staleTime: 5 * 60_000,
  });
}

/** Money formatter that follows the user's number format setting. */
export function useMoney() {
  const { data: profile } = useProfile();
  const locale: NumberLocale = profile?.number_locale ?? "en-US";
  return useMemo(
    () => ({
      locale,
      format: (amount: number, currency: Currency) => formatMoney(amount, currency, locale),
      qar: (amount: number) => formatMoney(amount, "QAR", locale),
      pkr: (amount: number) => formatMoney(amount, "PKR", locale),
    }),
    [locale],
  );
}

// --- Tables -----------------------------------------------------------------

export function useIncomes() {
  return useQuery({
    queryKey: ["incomes"],
    queryFn: async () =>
      check(await db().from("incomes").select("*").order("month", { ascending: false }), "salary") as Tables<"incomes">[],
  });
}

export function useMonthlyTotals(month: string) {
  return useQuery({
    queryKey: ["monthly_totals", month],
    queryFn: async () =>
      check(
        await db().from("monthly_totals").select("*").eq("month", monthStart(month)).maybeSingle(),
        "monthly totals",
        null,
      ) as Views<"monthly_totals"> | null,
  });
}

export function useExpenses(period: Tables<"expenses">["period"], month: string) {
  return useQuery({
    queryKey: ["expenses", period, month],
    queryFn: async () =>
      check(
        await db()
          .from("expenses")
          .select("*")
          .eq("period", period)
          .gte("date_from", monthStart(month))
          .lt("date_from", nextMonthStart(month))
          .order("date_from", { ascending: false })
          .order("created_at", { ascending: false }),
        "expenses",
      ) as Tables<"expenses">[],
  });
}

export function useSends() {
  return useQuery({
    queryKey: ["sends"],
    queryFn: async () =>
      check(
        await db().from("sends").select("*").order("sent_date", { ascending: false }).order("created_at", { ascending: false }),
        "sends",
      ) as Tables<"sends">[],
  });
}

export function usePoolTotals() {
  return useQuery({
    queryKey: ["pool_totals"],
    queryFn: async () => check(await db().from("pool_totals").select("*"), "pools") as Views<"pool_totals">[],
  });
}

export function useFamilyPortion() {
  return useQuery({
    queryKey: ["family_portion"],
    queryFn: async () =>
      check(await db().from("family_portion").select("*").maybeSingle(), "family portion", null) as Views<"family_portion"> | null,
  });
}

/** Rows of a simple dated table, newest first. */
function useDated<T extends "family_transfers" | "charity_entries" | "installments" | "other_entries">(
  table: T,
  dateColumn: string,
  label: string,
) {
  return useQuery({
    queryKey: [table],
    queryFn: async () =>
      check(
        await db()
          .from(table)
          .select("*")
          .order(dateColumn, { ascending: false })
          .order("created_at", { ascending: false }),
        label,
      ) as unknown as Tables<T>[],
  });
}

export const useFamilyTransfers = () => useDated("family_transfers", "transfer_date", "family transfers");
export const useCharity = () => useDated("charity_entries", "entry_date", "charity entries");
export const useInstallments = () => useDated("installments", "entry_date", "installments");
export const useOthers = () => useDated("other_entries", "entry_date", "entries");

export function useDebtPeople() {
  return useQuery({
    queryKey: ["debt_people"],
    queryFn: async () =>
      check(await db().from("debt_people").select("*").order("name"), "people") as Tables<"debt_people">[],
  });
}

/** Every debt entry (both kinds); pages filter by person and kind. */
export function useDebts() {
  return useQuery({
    queryKey: ["debts"],
    queryFn: async () =>
      check(await db().from("debts").select("*").order("debt_date").order("created_at"), "debts") as Tables<"debts">[],
  });
}

export function useDebtPayments() {
  return useQuery({
    queryKey: ["debt_payments"],
    queryFn: async () =>
      check(await db().from("debt_payments").select("*").order("paid_on").order("created_at"), "payments") as Tables<"debt_payments">[],
  });
}

export function useSavings(kind: Tables<"savings">["kind"]) {
  return useQuery({
    queryKey: ["savings", kind],
    queryFn: async () =>
      check(
        await db().from("savings").select("*").eq("kind", kind).order("saved_date", { ascending: false }).order("created_at", { ascending: false }),
        "savings",
      ) as Tables<"savings">[],
  });
}

// --- Writes -----------------------------------------------------------------

/**
 * Run a server action with toasts. Totals depend on many tables, so every
 * successful write refreshes all active queries (except the exchange rate).
 */
export function useAction<Args extends unknown[], R extends ActionResult<unknown>>(
  action: (...args: Args) => Promise<R>,
  successMessage?: string,
) {
  const queryClient = useQueryClient();
  return useMutation({
    // Resolves with the successful result (typed by the action); failures throw.
    mutationFn: async (args: Args) => {
      const result = await action(...args);
      if (!result.ok) throw Object.assign(new Error(result.error), { fieldErrors: result.fieldErrors });
      return result as Extract<R, { ok: true }>;
    },
    onSuccess: () => {
      if (successMessage) toast.success(successMessage);
      return queryClient.invalidateQueries({ predicate: (q) => q.queryKey[0] !== "rate" });
    },
    onError: (error) => toast.error(error.message || "Something went wrong"),
  });
}
