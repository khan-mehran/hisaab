import type { Metadata } from "next";
import { DebtView } from "./debt-view";

export const metadata: Metadata = { title: "Debt · Hisaab" };

export default function DebtPage() {
  return <DebtView />;
}
