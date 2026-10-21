import type { Metadata } from "next";
import { ExpensesView } from "./expenses-view";

export const metadata: Metadata = { title: "Expenses · Hisaab" };

export default function ExpensesPage() {
  return <ExpensesView />;
}
