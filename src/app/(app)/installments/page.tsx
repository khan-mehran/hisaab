import type { Metadata } from "next";
import { InstallmentsView } from "./installments-view";

export const metadata: Metadata = { title: "Installments · Hisaab" };

export default function InstallmentsPage() {
  return <InstallmentsView />;
}
