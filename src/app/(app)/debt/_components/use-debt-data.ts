"use client";

import { useDebtPayments, useDebtPeople, useDebts } from "@/lib/queries";

/** People, debts and payments together, as every debt page needs all three. */
export function useDebtData() {
  const people = useDebtPeople();
  const debts = useDebts();
  const payments = useDebtPayments();
  return {
    people: people.data ?? [],
    debts: debts.data ?? [],
    payments: payments.data ?? [],
    loading: people.isLoading || debts.isLoading || payments.isLoading,
    error: people.error ?? debts.error ?? payments.error,
  };
}
