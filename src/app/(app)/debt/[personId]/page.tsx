import type { Metadata } from "next";
import { PersonView } from "./person-view";

export const metadata: Metadata = { title: "Debt details · Hisaab" };

/** The person id is read on the client (useParams); data loads under RLS. */
export default function DebtPersonPage() {
  return <PersonView />;
}
