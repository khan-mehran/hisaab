"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { addMonths, currentMonth, monthLabel } from "@/lib/dates";

/** Selected month (YYYY-MM) shared by the dashboard and expenses pages. */
const MonthContext = createContext<[string, (month: string) => void] | null>(null);

const STORAGE_KEY = "selected-month";

export function MonthProvider({ children }: { children: React.ReactNode }) {
  const [month, setMonth] = useState(currentMonth);

  // Restore the last viewed month for this tab (per-viewer convenience only).
  useEffect(() => {
    try {
      const saved = sessionStorage.getItem(STORAGE_KEY);
      // eslint-disable-next-line react-hooks/set-state-in-effect -- one-time restore after hydration
      if (saved && /^\d{4}-\d{2}$/.test(saved) && saved <= currentMonth()) setMonth(saved);
    } catch {}
  }, []);

  const update = (next: string) => {
    setMonth(next);
    try {
      sessionStorage.setItem(STORAGE_KEY, next);
    } catch {}
  };

  return <MonthContext.Provider value={[month, update]}>{children}</MonthContext.Provider>;
}

export function useSelectedMonth() {
  const ctx = useContext(MonthContext);
  if (!ctx) throw new Error("useSelectedMonth must be used inside MonthProvider");
  return ctx;
}

/** Previous / next month switcher. Future months are disabled. */
export function MonthPicker() {
  const [month, setMonth] = useSelectedMonth();
  const isCurrent = month >= currentMonth();

  return (
    <div className="flex items-center gap-1 rounded-lg border bg-card p-0.5">
      <Button variant="ghost" size="icon-sm" aria-label="Previous month" onClick={() => setMonth(addMonths(month, -1))}>
        <ChevronLeftIcon />
      </Button>
      <span className="min-w-[8.5rem] text-center text-sm font-medium num">{monthLabel(month)}</span>
      <Button
        variant="ghost"
        size="icon-sm"
        aria-label="Next month"
        disabled={isCurrent}
        onClick={() => setMonth(addMonths(month, 1))}
      >
        <ChevronRightIcon />
      </Button>
    </div>
  );
}
