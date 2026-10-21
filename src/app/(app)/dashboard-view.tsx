"use client";

import Link from "next/link";
import {
  ArrowRightIcon,
  BanknoteIcon,
  VaultIcon,
  ReceiptIcon,
  ScaleIcon,
  SendIcon,
  UsersIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/app/page-header";
import { StatCard } from "@/components/app/stat-card";
import { AmountStack } from "@/components/app/amount";
import { MonthPicker, useSelectedMonth } from "@/components/app/month-context";
import { RateNote } from "@/components/app/rate-note";
import { useIncomes, useMoney, useMonthlyTotals, useProfile, useRate } from "@/lib/queries";
import { computeBalance, EMPTY_TOTALS, salaryForMonth, type MonthTotals } from "@/lib/calc/balance";
import { qarToPkr } from "@/lib/currency";
import { monthLabel, shortMonthLabel } from "@/lib/dates";

export function DashboardView() {
  const [month] = useSelectedMonth();
  const { data: profile } = useProfile();
  const { data: rate } = useRate();
  const incomes = useIncomes();
  const totalsQuery = useMonthlyTotals(month);
  const money = useMoney();

  const loading = incomes.isLoading || totalsQuery.isLoading;
  const income = salaryForMonth(incomes.data ?? [], month);
  const salaryQar = income ? Number(income.amount_qar) : null;

  const row = totalsQuery.data;
  const totals: MonthTotals = row
    ? {
        expensesQar: Number(row.expenses_qar),
        sentQar: Number(row.sent_qar),
        personalSavingsQar: Number(row.personal_savings_qar),
        familySavingsQar: Number(row.family_savings_qar),
      }
    : EMPTY_TOTALS;
  const balance = computeBalance(salaryQar, totals);

  // Live rate for PKR equivalents; fall back to the rate saved with the salary.
  const qarPkr = rate?.qarPkr ?? (income ? Number(income.rate_qar_pkr) : null);
  const pkr = (qar: number) => (qarPkr ? qarToPkr(qar, qarPkr) : null);
  const firstName = profile?.name?.split(" ")[0];

  const cards = [
    { title: "Total Expenses", icon: ReceiptIcon, qar: totals.expensesQar, href: "/expenses" },
    { title: "Total Sent", icon: SendIcon, qar: totals.sentQar, href: "/sent" },
    { title: "Personal Savings", icon: VaultIcon, qar: totals.personalSavingsQar, href: "/savings/personal" },
    { title: "Family Savings", icon: UsersIcon, qar: totals.familySavingsQar, href: "/savings/family" },
  ];

  return (
    <div className="grid gap-5">
      <PageHeader
        title={firstName ? `Hi, ${firstName}` : "Dashboard"}
        description={`Your money for ${monthLabel(month)}`}
        actions={<MonthPicker />}
      />

      {!loading && salaryQar == null && (
        <Card className="flex-row items-center gap-4 border-dashed bg-primary/5 p-4 ring-primary/20">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary/15 text-primary">
            <BanknoteIcon className="size-5" />
          </span>
          <div className="flex-1">
            <p className="font-medium">Add your salary to get started</p>
            <p className="text-sm text-muted-foreground">Your balance stays at 0 until a salary is saved.</p>
          </div>
          {/* Rendered as a link, so tell Base UI it isn't a native <button>. */}
          <Button render={<Link href="/profile#income" />} nativeButton={false} size="sm">
            Add salary <ArrowRightIcon />
          </Button>
        </Card>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <StatCard
          title="Salary"
          icon={BanknoteIcon}
          tone="primary"
          loading={loading}
          footer={
            income && income.month.slice(0, 7) !== month
              ? `Carried over from ${shortMonthLabel(income.month)}`
              : income && income.currency !== "QAR"
                ? `Saved as ${money.format(Number(income.amount), income.currency)}`
                : undefined
          }
        >
          <AmountStack size="lg" primary={salaryQar ?? 0} primaryCurrency="QAR" secondary={pkr(salaryQar ?? 0)} secondaryCurrency="PKR" />
        </StatCard>
        <StatCard
          title="Balance"
          icon={ScaleIcon}
          loading={loading}
          footer={salaryQar != null ? "Salary − expenses − sent − savings" : "Shows 0 until a salary is saved"}
        >
          <AmountStack size="lg" primary={balance} primaryCurrency="QAR" secondary={pkr(balance)} secondaryCurrency="PKR" />
        </StatCard>
      </div>

      <div className="grid grid-cols-1 gap-4 min-[420px]:grid-cols-2 lg:grid-cols-4">
        {cards.map((c) => (
          <Link key={c.title} href={c.href} className="rounded-xl outline-none focus-visible:ring-3 focus-visible:ring-ring/50">
            <StatCard title={c.title} icon={c.icon} loading={loading} className="h-full transition-colors hover:ring-primary/30">
              <AmountStack primary={c.qar} primaryCurrency="QAR" secondary={pkr(c.qar)} secondaryCurrency="PKR" />
            </StatCard>
          </Link>
        ))}
      </div>

      {salaryQar != null && salaryQar > 0 && !loading && <SpendingBar salary={salaryQar} totals={totals} balance={balance} />}

      <RateNote />
    </div>
  );
}

/** Stacked bar showing where the month's salary went. */
function SpendingBar({ salary, totals, balance }: { salary: number; totals: MonthTotals; balance: number }) {
  const money = useMoney();
  const parts = [
    { label: "Expenses", value: totals.expensesQar, className: "bg-chart-1" },
    { label: "Sent", value: totals.sentQar, className: "bg-chart-2" },
    { label: "Personal savings", value: totals.personalSavingsQar, className: "bg-chart-3" },
    { label: "Family savings", value: totals.familySavingsQar, className: "bg-chart-4" },
    { label: "Left", value: Math.max(0, balance), className: "bg-muted-foreground/25" },
  ];
  const base = Math.max(salary, parts.reduce((s, p) => s + p.value, 0));

  return (
    <Card className="gap-3 p-4">
      <div className="flex items-baseline justify-between">
        <p className="text-sm font-medium">Where your salary went</p>
        {balance < 0 && <p className="text-xs font-medium text-destructive num">Over by {money.qar(-balance)}</p>}
      </div>
      <div className="flex h-3 overflow-hidden rounded-full bg-muted">
        {parts.map((p) =>
          p.value > 0 ? (
            <div key={p.label} className={p.className} style={{ width: `${(p.value / base) * 100}%` }} title={`${p.label}: ${money.qar(p.value)}`} />
          ) : null,
        )}
      </div>
      <ul className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs sm:grid-cols-5">
        {parts.map((p) => (
          <li key={p.label} className="flex items-center gap-1.5">
            <span className={`size-2.5 shrink-0 rounded-full ${p.className}`} />
            <span className="text-muted-foreground">{p.label}</span>
            <span className="ml-auto font-medium num sm:ml-0">{Math.round((p.value / base) * 100)}%</span>
          </li>
        ))}
      </ul>
    </Card>
  );
}
