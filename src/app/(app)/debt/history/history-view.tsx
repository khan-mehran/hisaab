"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowLeftIcon, ChevronRightIcon, CircleCheckIcon, HistoryIcon, SearchIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PageHeader } from "@/components/app/page-header";
import { Money } from "@/components/app/amount";
import { TableEmpty, TableError, TableSkeleton } from "@/components/app/table-states";
import { summarizePeople, type DebtKind } from "@/lib/calc/debts";
import { shortMonthLabel } from "@/lib/dates";
import { cn } from "@/lib/utils";
import { DEBT_TEXT } from "../_components/debt-text";
import { useDebtData } from "../_components/use-debt-data";
import { SummaryFigure } from "../_components/summary-figure";

/** Everyone you've ever borrowed from or lent to, including cleared debts. */
export function DebtHistoryView() {
  const data = useDebtData();
  const [kind, setKind] = useState<DebtKind>("taken");
  const [query, setQuery] = useState("");

  return (
    <div className="grid gap-5">
      <div className="grid gap-2">
        <Link href="/debt" className="flex w-fit items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeftIcon className="size-4" /> Debt
        </Link>
        <PageHeader
          title="Debt history"
          description="Everyone, including people you've fully settled with, and every payment by month."
          actions={
            <div className="relative">
              <SearchIcon className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search name"
                aria-label="Search by name"
                className="h-9 w-48 pl-8"
              />
            </div>
          }
        />
      </div>

      <Tabs value={kind} onValueChange={(v) => setKind(v as DebtKind)}>
        <TabsList>
          <TabsTrigger value="taken" className="px-4">Taken</TabsTrigger>
          <TabsTrigger value="given" className="px-4">Given</TabsTrigger>
        </TabsList>
        {(["taken", "given"] as const).map((k) => (
          <TabsContent key={k} value={k} className="mt-4">
            <HistoryTable kind={k} data={data} query={query} />
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}

function HistoryTable({ kind, data, query }: { kind: DebtKind; data: ReturnType<typeof useDebtData>; query: string }) {
  const text = DEBT_TEXT[kind];
  const summary = summarizePeople(data.people, data.debts, data.payments, kind);
  const q = query.trim().toLowerCase();
  const rows = q ? summary.rows.filter((r) => r.person.name.toLowerCase().includes(q)) : summary.rows;
  const cleared = summary.rows.filter((r) => r.cleared).length;
  const cols = 6 + summary.months.length;

  // Sticky first column needs an opaque background that matches its row.
  const stickyBg = (isCleared: boolean) =>
    cn(
      "sticky left-0 z-10",
      isCleared ? "bg-[color-mix(in_oklch,var(--card),var(--muted)_40%)]" : "bg-card",
      "group-hover/row:bg-[color-mix(in_oklch,var(--card),var(--muted)_50%)]",
    );

  return (
    <div className="grid gap-4">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <SummaryFigure label={text.total} value={summary.totals.total} loading={data.loading} />
        <SummaryFigure label={`Total ${text.paid.toLowerCase()}`} value={summary.totals.paid} loading={data.loading} />
        <SummaryFigure label={text.owed} value={summary.totals.remaining} loading={data.loading} highlight />
        <Card className="gap-1 p-3 sm:p-4">
          <p className="text-xs text-muted-foreground">People</p>
          <p className="text-base font-semibold num sm:text-xl">
            {summary.rows.length}
            <span className="ml-1.5 text-xs font-normal text-muted-foreground">{cleared} cleared</span>
          </p>
        </Card>
      </div>

      <Card className="py-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="sticky left-0 z-10 bg-card">Name</TableHead>
              <TableHead className="text-right">Amount</TableHead>
              {summary.months.map((m) => (
                <TableHead key={m} className="text-right">{shortMonthLabel(m)} {text.paid}</TableHead>
              ))}
              <TableHead className="text-right">Total {text.paid}</TableHead>
              <TableHead className="text-right">Remaining</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.loading ? (
              <TableSkeleton columns={cols} />
            ) : data.error ? (
              <TableError columns={cols} message={data.error.message} />
            ) : !rows.length ? (
              <TableEmpty
                columns={cols}
                icon={HistoryIcon}
                title={q ? `No one matches "${query}"` : "No history yet"}
                description={q ? undefined : "Debts you add will appear here, even after they're paid off."}
              />
            ) : (
              <>
                {rows.map((r) => (
                  <TableRow key={r.person.id} className={cn("group/row", r.cleared && "bg-muted/40 text-muted-foreground")}>
                    <TableCell className={cn(stickyBg(r.cleared), "font-medium")}>
                      <Link href={`/debt/${r.person.id}`} className="hover:text-primary hover:underline">{r.person.name}</Link>
                      <p className="text-xs font-normal text-muted-foreground num">
                        {r.entries} {r.entries === 1 ? "entry" : "entries"} · since {shortMonthLabel(r.firstDate)}
                      </p>
                    </TableCell>
                    <TableCell className="text-right"><Money value={r.total} currency="PKR" /></TableCell>
                    {summary.months.map((m) => (
                      <TableCell key={m} className="text-right">
                        {r.byMonth[m] ? <Money value={r.byMonth[m]} currency="PKR" /> : <span className="text-muted-foreground/60">—</span>}
                      </TableCell>
                    ))}
                    <TableCell className="text-right font-medium"><Money value={r.paid} currency="PKR" /></TableCell>
                    <TableCell className={cn("text-right font-semibold", !r.cleared && "text-primary dark:text-[color-mix(in_oklch,var(--primary),white_40%)]")}>
                      <Money value={r.remaining} currency="PKR" />
                    </TableCell>
                    <TableCell>
                      {r.cleared ? (
                        <Badge variant="secondary" className="gap-1 bg-success/15 text-success">
                          <CircleCheckIcon className="size-3" /> Cleared
                        </Badge>
                      ) : (
                        <Badge variant="secondary" className="bg-primary/10 text-primary dark:text-[color-mix(in_oklch,var(--primary),white_40%)]">
                          Active
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button size="sm" variant="ghost" render={<Link href={`/debt/${r.person.id}`} />} nativeButton={false}>
                        Details <ChevronRightIcon />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
                {!q && (
                  <TableRow className="border-t-2 border-primary/30 bg-primary/10 font-semibold hover:bg-primary/10">
                    <TableCell className="sticky left-0 z-10 bg-[color-mix(in_oklch,var(--card),var(--primary)_10%)]">{text.total}</TableCell>
                    <TableCell className="text-right"><Money value={summary.totals.total} currency="PKR" /></TableCell>
                    {summary.months.map((m) => (
                      <TableCell key={m} className="text-right"><Money value={summary.totals.byMonth[m] ?? 0} currency="PKR" /></TableCell>
                    ))}
                    <TableCell className="text-right"><Money value={summary.totals.paid} currency="PKR" /></TableCell>
                    <TableCell className="text-right"><Money value={summary.totals.remaining} currency="PKR" /></TableCell>
                    <TableCell colSpan={2} />
                  </TableRow>
                )}
              </>
            )}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
