import type { Metadata } from "next";
import { HistoryView } from "../history-view";

export const metadata: Metadata = { title: "History · Hisaab" };

/** The section is read on the client (useParams); data loads under RLS. */
export default function HistoryPage() {
  return <HistoryView />;
}
