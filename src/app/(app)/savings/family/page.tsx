import type { Metadata } from "next";
import { SavingsView } from "../savings-view";

export const metadata: Metadata = { title: "Family Savings · Hisaab" };

export default function FamilySavingsPage() {
  return <SavingsView kind="family" />;
}
