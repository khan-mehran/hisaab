"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeftIcon, ChevronRightIcon, HistoryIcon } from "lucide-react";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PageHeader } from "@/components/app/page-header";
import { AmountStack, Money } from "@/components/app/amount";
import { TableEmpty, TableError, TableSkeleton } from "@/components/app/table-states";
import {
  useAllExpenses,
  useCharity,
  useClearedAt,
  useFamilyTransfers,
  useInstallments,
  useOthers,
  useSavings,
  useSends,
} from "@/lib/queries";
import { validateAllocation } from "@/lib/calc/pools";
import { qarToPkr, round2, type Currency } from "@/lib/currency";
import { formatDate, formatDayMonth, ISO_MONTH, monthLabel } from "@/lib/dates";
import { HISTORY_SECTIONS, isCleared, isHistorySection, type HistorySection } from "@/lib/history";
import type { Tables } from "@/lib/database.types";

type Column<R> = { header: string; className?: string; cell: (row: R) => React.ReactNode };

/** One table of a section's history, already cut down to cleared entries. */
type HistoryTable = {
  title: string;
  currency: Currency;
  isLoading: boolean;
  error: Error | null;
  columns: { header: string; className?: string }[];
  rows: { id: string; month: string; amount: number; cells: React.ReactNode[] }[];
};

type Query<R> = { data?: R[]; isLoading: boolean; error: Error | null };

function buildTable<R extends { id: string; created_at: string }>(
  query: Query<R>,
  clearedAt: string | null,
  def: { title: string; currency: Currency; dateOf: (row: R) => string; amountOf: (row: R) => number; columns: Column<R>[] },
): HistoryTable {
  return {
    title: def.title,
    currency: def.currency,
    isLoading: query.isLoading,
    error: query.error,
    columns: def.columns.map(({ header, className }) => ({ header, className })),
    rows: (query.data ?? [])
      .filter((r) => isCleared(r.created_at, clearedAt))
      .map((r) => ({
        id: r.id,
        month: def.dateOf(r).slice(0, 7),
        amount: def.amountOf(r),
        cells: def.columns.map((c) => c.cell(r)),
      })),
  };
}

const sum = (rows: HistoryTable["rows"]) => round2(rows.reduce((s, r) => s + r.amount, 0));
const tag = (text: string) => (
  <span className="rounded-md bg-secondary px-2 py-0.5 text-xs font-medium text-secondary-foreground">{text}</span>
);
const pkrCell = (value: number) => <Money value={value} currency="PKR" />;
const dash = <span className="text-muted-foreground">—</span>;

type ViewProps = { section: HistorySection; month: string | null };

/** History for one section: the list of past months, or one month's entries. */
export function HistoryView() {
  const params = useParams<{ section: string; month?: string }>();
  const month = params.month ?? null;

  if (!isHistorySection(params.section) || (month != null && !ISO_MONTH.test(month))) {
    return (
      <div className="grid gap-2">
        <PageHeader title="History not found" description="This history page doesn't exist." />
        <Link href="/" className="w-fit text-sm text-primary hover:underline">Back to dashboard</Link>
      </div>
    );
  }

  const View = VIEWS[params.section];
  return <View section={params.section} month={month} />;
}

const VIEWS: Record<HistorySection, (props: ViewProps) => React.ReactNode> = {
  expenses: ExpensesHistory,
  sent: SentHistory,
  charity: CharityHistory,
  installments: InstallmentsHistory,
  others: OthersHistory,
  "personal-savings": (props) => <SavingsHistory {...props} kind="personal" />,
  "family-savings": (props) => <SavingsHistory {...props} kind="family" />,
};

function ExpensesHistory(props: ViewProps) {
  const table = buildTable(useAllExpenses(), useClearedAt(props.section), {
    title: "Expenses",
    currency: "QAR",
    dateOf: (r) => r.date_from,
    amountOf: (r) => Number(r.amount_qar),
    columns: [
      {
        header: "Date",
        className: "num",
        cell: (r) =>
          r.period === "monthly"
            ? monthLabel(r.date_from.slice(0, 7))
            : r.period === "weekly"
              ? `${formatDayMonth(r.date_from)} – ${formatDate(r.date_to ?? r.date_from)}`
              : formatDate(r.date_from),
      },
      { header: "Type", className: "capitalize text-muted-foreground", cell: (r) => r.period },
      { header: "Category", cell: (r) => tag(r.category) },
      { header: "Amount (QAR)", className: "text-right font-medium", cell: (r) => <Money value={Number(r.amount_qar)} currency="QAR" /> },
      { header: "Reason", className: "max-w-56 truncate text-muted-foreground", cell: (r) => r.reason || "—" },
    ],
  });
  return <HistoryLayout {...props} tables={[table]} />;
}

function SentHistory(props: ViewProps) {
  const pkrOf = (s: Tables<"sends">, qar: number) => qarToPkr(Number(qar), Number(s.rate_qar_pkr));
  const part = (key: "charity_qar" | "debt_qar" | "installments_qar" | "others_qar", header: string): Column<Tables<"sends">> => ({
    header,
    className: "text-right",
    cell: (s) => (Number(s[key]) > 0 ? pkrCell(pkrOf(s, s[key])) : dash),
  });
  const familyQar = (s: Tables<"sends">) =>
    validateAllocation({
      amount: Number(s.amount_qar),
      charity: Number(s.charity_qar),
      debt: Number(s.debt_qar),
      installments: Number(s.installments_qar),
      others: Number(s.others_qar),
    }).familyQar;

  const clearedAt = useClearedAt(props.section);
  const sends = buildTable(useSends(), clearedAt, {
    title: "Sends",
    currency: "PKR",
    dateOf: (s) => s.sent_date,
    amountOf: (s) => pkrOf(s, s.amount_qar),
    columns: [
      { header: "Date", className: "num", cell: (s) => formatDate(s.sent_date) },
      {
        header: "Amount",
        className: "text-right",
        cell: (s) => (
          <AmountStack size="sm" primary={pkrOf(s, s.amount_qar)} primaryCurrency="PKR" secondary={Number(s.amount_qar)} secondaryCurrency="QAR" className="items-end" />
        ),
      },
      part("charity_qar", "Charity"),
      part("debt_qar", "Debt"),
      part("installments_qar", "Installments"),
      part("others_qar", "Others"),
      { header: "Family", className: "text-right", cell: (s) => (familyQar(s) > 0 ? pkrCell(pkrOf(s, familyQar(s))) : dash) },
      { header: "Bank", cell: (s) => tag(s.bank) },
    ],
  });
  const family = buildTable(useFamilyTransfers(), clearedAt, {
    title: "Family",
    currency: "PKR",
    dateOf: (t) => t.transfer_date,
    amountOf: (t) => Number(t.amount_pkr),
    columns: [
      { header: "Date", className: "num", cell: (t) => formatDate(t.transfer_date) },
      { header: "Relation", cell: (t) => t.relation },
      { header: "Amount (PKR)", className: "text-right font-medium", cell: (t) => pkrCell(Number(t.amount_pkr)) },
    ],
  });
  return <HistoryLayout {...props} tables={[sends, family]} />;
}

function CharityHistory(props: ViewProps) {
  const table = buildTable(useCharity(), useClearedAt(props.section), {
    title: "Charity",
    currency: "PKR",
    dateOf: (r) => r.entry_date,
    amountOf: (r) => Number(r.amount_pkr),
    columns: [
      { header: "Date", className: "num", cell: (r) => formatDate(r.entry_date) },
      { header: "Name", className: "font-medium", cell: (r) => r.name },
      { header: "Amount (PKR)", className: "text-right font-medium", cell: (r) => pkrCell(Number(r.amount_pkr)) },
      { header: "Relationship", cell: (r) => tag(r.relationship) },
    ],
  });
  return <HistoryLayout {...props} tables={[table]} />;
}

function InstallmentsHistory(props: ViewProps) {
  const table = buildTable(useInstallments(), useClearedAt(props.section), {
    title: "Installments",
    currency: "PKR",
    dateOf: (r) => r.entry_date,
    amountOf: (r) => Number(r.amount_pkr),
    columns: [
      { header: "Date", className: "num", cell: (r) => formatDate(r.entry_date) },
      { header: "Title", className: "font-medium", cell: (r) => r.title },
      { header: "Amount (PKR)", className: "text-right font-medium", cell: (r) => pkrCell(Number(r.amount_pkr)) },
      { header: "Note", className: "max-w-56 truncate text-muted-foreground", cell: (r) => r.note || "—" },
    ],
  });
  return <HistoryLayout {...props} tables={[table]} />;
}

function OthersHistory(props: ViewProps) {
  const table = buildTable(useOthers(), useClearedAt(props.section), {
    title: "Others",
    currency: "PKR",
    dateOf: (r) => r.entry_date,
    amountOf: (r) => Number(r.amount_pkr),
    columns: [
      { header: "Date", className: "num", cell: (r) => formatDate(r.entry_date) },
      { header: "Label", className: "font-medium", cell: (r) => r.label },
      { header: "Amount (PKR)", className: "text-right font-medium", cell: (r) => pkrCell(Number(r.amount_pkr)) },
    ],
  });
  return <HistoryLayout {...props} tables={[table]} />;
}

function SavingsHistory({ kind, ...props }: ViewProps & { kind: Tables<"savings">["kind"] }) {
  const table = buildTable(useSavings(kind), useClearedAt(props.section), {
    title: "Savings",
    currency: "QAR",
    dateOf: (r) => r.saved_date,
    amountOf: (r) => Number(r.amount_qar),
    columns: [
      { header: "Date", className: "num", cell: (r) => formatDate(r.saved_date) },
      { header: "Amount (QAR)", className: "text-right font-medium", cell: (r) => <Money value={Number(r.amount_qar)} currency="QAR" /> },
      { header: "Bank", cell: (r) => tag(r.bank) },
    ],
  });
  return <HistoryLayout {...props} tables={[table]} />;
}

function BackLink({ href, label }: { href: string; label: string }) {
  return (
    <Link href={href} className="flex w-fit items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
      <ArrowLeftIcon className="size-4" /> {label}
    </Link>
  );
}

function HistoryLayout({ section, month, tables }: ViewProps & { tables: HistoryTable[] }) {
  const info = HISTORY_SECTIONS[section];
  const base = `/history/${section}`;

  if (month == null) {
    return (
      <div className="grid gap-5">
        <div className="grid gap-2">
          <BackLink href={info.href} label={info.title} />
          <PageHeader title={`${info.title} history`} description="Entries you cleared, by month. Tap a month to see its entries." />
        </div>
        <MonthList base={base} tables={tables} />
      </div>
    );
  }

  return (
    <div className="grid gap-5">
      <div className="grid gap-2">
        <BackLink href={base} label={`${info.title} history`} />
        <PageHeader title={`${info.title} · ${monthLabel(month)}`} description="Cleared entries dated in this month." />
      </div>
      {tables.map((t, i) => {
        const rows = t.rows.filter((r) => r.month === month);
        // Secondary tables (e.g. Family on Sent) only appear when they have entries.
        if (i > 0 && !rows.length) return null;
        return <MonthTable key={t.title} table={t} rows={rows} />;
      })}
    </div>
  );
}

/** Past months, newest first, with entry counts and totals. */
function MonthList({ base, tables }: { base: string; tables: HistoryTable[] }) {
  const router = useRouter();
  const months = [...new Set(tables.flatMap((t) => t.rows.map((r) => r.month)))].sort().reverse();
  const loading = tables.some((t) => t.isLoading);
  const error = tables.find((t) => t.error)?.error;
  const cols = tables.length + 3;

  return (
    <Card className="py-0">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Month</TableHead>
            <TableHead className="text-right">Entries</TableHead>
            {tables.map((t) => (
              <TableHead key={t.title} className="text-right">
                {tables.length > 1 ? t.title : "Total"} ({t.currency})
              </TableHead>
            ))}
            <TableHead className="w-10" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {loading ? (
            <TableSkeleton columns={cols} />
          ) : error ? (
            <TableError columns={cols} message={error.message} />
          ) : !months.length ? (
            <TableEmpty
              columns={cols}
              icon={HistoryIcon}
              title="No history yet"
              description="Entries move here when you press Clear month on the page."
            />
          ) : (
            months.map((m) => {
              const href = `${base}/${m}`;
              const perTable = tables.map((t) => t.rows.filter((r) => r.month === m));
              return (
                <TableRow key={m} className="cursor-pointer" onClick={() => router.push(href)}>
                  <TableCell className="font-medium">
                    <Link href={href} className="hover:text-primary hover:underline" onClick={(e) => e.stopPropagation()}>
                      {monthLabel(m)}
                    </Link>
                  </TableCell>
                  <TableCell className="text-right num">{perTable.reduce((n, rows) => n + rows.length, 0)}</TableCell>
                  {tables.map((t, i) => (
                    <TableCell key={t.title} className="text-right font-medium">
                      <Money value={sum(perTable[i])} currency={t.currency} />
                    </TableCell>
                  ))}
                  <TableCell>
                    <ChevronRightIcon className="size-4 text-muted-foreground" />
                  </TableCell>
                </TableRow>
              );
            })
          )}
        </TableBody>
      </Table>
    </Card>
  );
}

/** One month's entries for one table (read-only). */
function MonthTable({ table, rows }: { table: HistoryTable; rows: HistoryTable["rows"] }) {
  const cols = table.columns.length;
  return (
    <Card className="gap-0 py-0">
      <CardHeader className="flex flex-row items-center justify-between gap-3 border-b py-4">
        <div>
          <CardTitle>{table.title}</CardTitle>
          <CardDescription>
            {rows.length} {rows.length === 1 ? "entry" : "entries"}
          </CardDescription>
        </div>
        <div className="text-right">
          <p className="text-xs text-muted-foreground">Total</p>
          <p className="text-lg font-semibold tracking-tight">
            <Money value={sum(rows)} currency={table.currency} />
          </p>
        </div>
      </CardHeader>
      <Table>
        <TableHeader>
          <TableRow>
            {table.columns.map((c) => (
              <TableHead key={c.header} className={c.className?.includes("text-right") ? "text-right" : undefined}>
                {c.header}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {table.isLoading ? (
            <TableSkeleton columns={cols} />
          ) : table.error ? (
            <TableError columns={cols} message={table.error.message} />
          ) : !rows.length ? (
            <TableEmpty columns={cols} icon={HistoryIcon} title="Nothing recorded in this month" />
          ) : (
            rows.map((r) => (
              <TableRow key={r.id}>
                {r.cells.map((cell, i) => (
                  <TableCell key={table.columns[i].header} className={table.columns[i].className}>
                    {cell}
                  </TableCell>
                ))}
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </Card>
  );
}
