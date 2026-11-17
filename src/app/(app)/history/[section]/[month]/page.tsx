import type { Metadata } from "next";
import { HistoryView } from "../../history-view";

export const metadata: Metadata = { title: "History · Hisaab" };

/** The section and month are read on the client (useParams); data loads under RLS. */
export default function HistoryMonthPage() {
  return <HistoryView />;
}
