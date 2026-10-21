import type { Metadata } from "next";
import { SavingsView } from "../savings-view";

export const metadata: Metadata = { title: "Personal Savings · Hisaab" };

export default function PersonalSavingsPage() {
  return <SavingsView kind="personal" />;
}
