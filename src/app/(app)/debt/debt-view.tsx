"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ChevronRightIcon, HandCoinsIcon, HistoryIcon, PartyPopperIcon, PlusIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PageHeader } from "@/components/app/page-header";
import { PoolCard } from "@/components/app/pool-card";
import { usePool } from "@/components/app/pool-warning";
import { Money } from "@/components/app/amount";
import { TableEmpty, TableError, TableSkeleton } from "@/components/app/table-states";
import { summarizePeople, type DebtKind } from "@/lib/calc/debts";
import { formatDate, shortMonthLabel } from "@/lib/dates";
import { AddDebtDialog } from "./_components/add-debt-dialog";
import { DEBT_TEXT } from "./_components/debt-text";
import { useDebtData } from "./_components/use-debt-data";
import { SummaryFigure } from "./_components/summary-figure";

export function DebtView() {
  const router = useRouter();
  const [kind, setKind] = useState<DebtKind>("taken");
  const [adding, setAdding] = useState(false);
  const { status, allocatedQar, loading } = usePool("debt");
  const data = useDebtData();

  return (
    <div className="grid gap-5">
      <PageHeader
        title="Debt"
        description="Who you owe and who owes you. Open a person for their full history."
        actions={
          <>
            <Button variant="outline" render={<Link href="/debt/history" />} nativeButton={false}>
              <HistoryIcon /> History
            </Button>
            <Button onClick={() => setAdding(true)}>
              <PlusIcon /> {DEBT_TEXT[kind].add}
            </Button>
          </>
        }
      />

      <PoolCard
        title="Debt"
        icon={HandCoinsIcon}
        status={status}
        allocatedQar={allocatedQar}
        loading={loading}
        labels={{ allocated: "From Sent page", used: "Used for repayments", remaining: "Left in pool" }}
        hint="Money set aside in the Debt field when you add a send. Repayments of debts you took are taken from this pool."
      />

      <Tabs value={kind} onValueChange={(v) => setKind(v as DebtKind)}>
        <TabsList>
          <TabsTrigger value="taken" className="px-4">Taken</TabsTrigger>
          <TabsTrigger value="given" className="px-4">Given</TabsTrigger>
        </TabsList>
        {(["taken", "given"] as const).map((k) => (
          <TabsContent key={k} value={k} className="mt-4">
            <ActivePeople kind={k} data={data} />
          </TabsContent>
        ))}
      </Tabs>

      <AddDebtDialog
        open={adding}
        onOpenChange={setAdding}
        kind={kind}
        names={data.people.map((p) => p.name)}
        onSaved={(personId) => router.push(`/debt/${personId}`)}
      />
    </div>
  );
}

/** Only people with money still owed; cleared people live on the History page. */
function ActivePeople({ kind, data }: { kind: DebtKind; data: ReturnType<typeof useDebtData> }) {
  const text = DEBT_TEXT[kind];
  const summary = summarizePeople(data.people, data.debts, data.payments, kind);
  const active = summary.rows.filter((r) => !r.cleared);
  const clearedCount = summary.rows.length - active.length;
  const activeTotals = active.reduce(
    (t, r) => ({ total: t.total + r.total, paid: t.paid + r.paid, remaining: t.remaining + r.remaining }),
    { total: 0, paid: 0, remaining: 0 },
  );
  const COLS = 6;

  return (
    <div className="grid gap-4">
      <div className="grid grid-cols-3 gap-3">
        <SummaryFigure label={text.total} value={summary.totals.total} loading={data.loading} />
        <SummaryFigure label={`Total ${text.paid.toLowerCase()}`} value={summary.totals.paid} loading={data.loading} />
        <SummaryFigure label={text.owed} value={summary.totals.remaining} loading={data.loading} highlight />
      </div>

      <Card className="py-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead className="text-right">Amount</TableHead>
              <TableHead className="text-right">{text.paid}</TableHead>
              <TableHead className="text-right">Remaining</TableHead>
              <TableHead className="hidden md:table-cell">Last activity</TableHead>
              <TableHead className="text-right">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.loading ? (
              <TableSkeleton columns={COLS} />
            ) : data.error ? (
              <TableError columns={COLS} message={data.error.message} />
            ) : !active.length ? (
              <TableEmpty
                columns={COLS}
                icon={clearedCount ? PartyPopperIcon : HandCoinsIcon}
                title={clearedCount ? "All settled" : text.empty}
                description={
                  clearedCount
                    ? `${clearedCount} cleared ${clearedCount === 1 ? "person is" : "people are"} in History.`
                    : "Tap Add to record one."
                }
              />
            ) : (
              active.map((r) => (
                <TableRow key={r.person.id}>
                  <TableCell>
                    <Link href={`/debt/${r.person.id}`} className="font-medium hover:text-primary hover:underline">
                      {r.person.name}
                    </Link>
                    <p className="text-xs text-muted-foreground num">
                      {r.entries > 1 ? `${r.entries} entries · ` : ""}since {shortMonthLabel(r.firstDate)}
                    </p>
                  </TableCell>
                  <TableCell className="text-right"><Money value={r.total} currency="PKR" /></TableCell>
                  <TableCell className="text-right"><Money value={r.paid} currency="PKR" /></TableCell>
                  <TableCell className="text-right font-semibold text-primary dark:text-[color-mix(in_oklch,var(--primary),white_40%)]">
                    <Money value={r.remaining} currency="PKR" />
                  </TableCell>
                  <TableCell className="hidden text-muted-foreground md:table-cell num">{formatDate(r.lastActivity)}</TableCell>
                  <TableCell className="text-right">
                    <Button size="sm" variant="outline" render={<Link href={`/debt/${r.person.id}`} />} nativeButton={false}>
                      Details <ChevronRightIcon />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
          {active.length > 0 && (
            <TableFooter>
              <TableRow className="bg-primary/10 hover:bg-primary/10">
                <TableCell className="font-semibold">Total outstanding</TableCell>
                <TableCell className="text-right font-semibold"><Money value={activeTotals.total} currency="PKR" /></TableCell>
                <TableCell className="text-right font-semibold"><Money value={activeTotals.paid} currency="PKR" /></TableCell>
                <TableCell className="text-right font-semibold"><Money value={activeTotals.remaining} currency="PKR" /></TableCell>
                <TableCell colSpan={2} className="text-right text-xs font-normal text-muted-foreground">
                  {clearedCount > 0 && (
                    <Link href="/debt/history" className="hover:underline">
                      + {clearedCount} cleared in History
                    </Link>
                  )}
                </TableCell>
              </TableRow>
            </TableFooter>
          )}
        </Table>
      </Card>
    </div>
  );
}
