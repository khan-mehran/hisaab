import type { Metadata } from "next";
import { SentView } from "./sent-view";

export const metadata: Metadata = { title: "Sent · Hisaab" };

export default function SentPage() {
  return <SentView />;
}
