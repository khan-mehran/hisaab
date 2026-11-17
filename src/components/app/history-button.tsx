"use client";

import { useState } from "react";
import Link from "next/link";
import { ArchiveIcon, HistoryIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "./confirm-dialog";
import { useAction } from "@/lib/queries";
import { clearSection } from "@/app/(app)/actions";
import { HISTORY_SECTIONS, type HistorySection } from "@/lib/history";

/**
 * "Clear month" and "History" buttons; they sit left of a page's Add button.
 * Clearing moves the page's current entries to History (nothing is deleted).
 */
export function HistoryButtons({ section, canClear = true }: { section: HistorySection; canClear?: boolean }) {
  const clear = useAction(clearSection, "Moved to History");
  const [confirming, setConfirming] = useState(false);
  const title = HISTORY_SECTIONS[section].title;

  return (
    <>
      <Button variant="outline" disabled={!canClear} onClick={() => setConfirming(true)}>
        <ArchiveIcon /> Clear month
      </Button>
      {/* Rendered as a link, so tell Base UI it isn't a native <button>. */}
      <Button variant="outline" render={<Link href={`/history/${section}`} />} nativeButton={false}>
        <HistoryIcon /> History
      </Button>
      <ConfirmDialog
        open={confirming}
        onOpenChange={setConfirming}
        title={`Clear ${title}?`}
        description={`Every entry currently on the ${title} page moves to History, grouped by month, and the page starts empty. Nothing is deleted and your balances don't change.`}
        confirmLabel="Clear month"
        onConfirm={() => clear.mutateAsync([section]).then(() => true, () => false)}
      />
    </>
  );
}
