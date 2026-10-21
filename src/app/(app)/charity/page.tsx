import type { Metadata } from "next";
import { CharityView } from "./charity-view";

export const metadata: Metadata = { title: "Charity · Hisaab" };

export default function CharityPage() {
  return <CharityView />;
}
