import type { Metadata } from "next";
import { OthersView } from "./others-view";

export const metadata: Metadata = { title: "Others · Hisaab" };

export default function OthersPage() {
  return <OthersView />;
}
