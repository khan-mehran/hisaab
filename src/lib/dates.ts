/**
 * Date helpers working on plain "YYYY-MM-DD" / "YYYY-MM" strings.
 * Strings are parsed by hand so a date never shifts across time zones.
 */

const MONTHS_SHORT = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const MONTHS_LONG = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

const pad = (n: number) => String(n).padStart(2, "0");

/** Today in the user's local time zone, as YYYY-MM-DD. */
export function todayISO(): string {
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** Current month as YYYY-MM. */
export function currentMonth(): string {
  return todayISO().slice(0, 7);
}

/** "2026-10" -> "2026-10-01". */
export function monthStart(month: string): string {
  return `${month.slice(0, 7)}-01`;
}

/** First day of the following month, for exclusive range filters. */
export function nextMonthStart(month: string): string {
  return monthStart(addMonths(month, 1));
}

export function addMonths(month: string, delta: number): string {
  const [y, m] = month.split("-").map(Number);
  const index = y * 12 + (m - 1) + delta;
  return `${Math.floor(index / 12)}-${pad((index % 12) + 1)}`;
}

/** "2026-10" -> "October 2026". */
export function monthLabel(month: string): string {
  const [y, m] = month.split("-").map(Number);
  return `${MONTHS_LONG[m - 1]} ${y}`;
}

/** "2026-11" or "2026-11-03" -> "Nov 26". */
export function shortMonthLabel(dateOrMonth: string): string {
  const [y, m] = dateOrMonth.split("-").map(Number);
  return `${MONTHS_SHORT[m - 1]} ${String(y).slice(2)}`;
}

/** "2026-10-05" -> "5 Oct 2026". */
export function formatDate(date: string): string {
  const [y, m, d] = date.split("-").map(Number);
  return `${d} ${MONTHS_SHORT[m - 1]} ${y}`;
}

/** "2026-10-05" -> "5 Oct". */
export function formatDayMonth(date: string): string {
  const [, m, d] = date.split("-").map(Number);
  return `${d} ${MONTHS_SHORT[m - 1]}`;
}

/** Monday-to-Sunday week containing the given date. */
export function weekRange(date: string): { from: string; to: string } {
  const [y, m, d] = date.split("-").map(Number);
  const base = new Date(Date.UTC(y, m - 1, d));
  const offset = (base.getUTCDay() + 6) % 7; // 0 = Monday
  const from = new Date(base.getTime() - offset * 86_400_000);
  const to = new Date(from.getTime() + 6 * 86_400_000);
  const iso = (x: Date) => x.toISOString().slice(0, 10);
  return { from: iso(from), to: iso(to) };
}

export const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
export const ISO_MONTH = /^\d{4}-\d{2}$/;
