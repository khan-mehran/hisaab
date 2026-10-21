import type { Metadata } from "next";
import { DebtHistoryView } from "./history-view";

export const metadata: Metadata = { title: "Debt history · Hisaab" };

export default function DebtHistoryPage() {
  return <DebtHistoryView />;
}
