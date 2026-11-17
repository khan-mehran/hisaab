"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowRightIcon,
  BanknoteIcon,
  EyeIcon,
  EyeOffIcon,
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
import { useIncomes, useMoney, useMonthlyTotalsRange, useProfile, useRate } from "@/lib/queries";
import { computeBalance, computeZakat, salaryForMonth, sumTotals, type MonthTotals } from "@/lib/calc/balance";
import { qarToPkr } from "@/lib/currency";
import { monthLabel, shortMonthLabel } from "@/lib/dates";

const SALARY_VISIBLE_KEY = "salary-visible";

export function DashboardView() {
  const [month] = useSelectedMonth();
  // Salary is hidden until revealed; the choice is remembered on this device.
  const [salaryVisible, setSalaryVisible] = useState(false);
  useEffect(() => {
    try {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- one-time restore after hydration
      if (localStorage.getItem(SALARY_VISIBLE_KEY) === "1") setSalaryVisible(true);
    } catch {}
  }, []);
  const toggleSalary = () => {
    setSalaryVisible((v) => {
      try {
        localStorage.setItem(SALARY_VISIBLE_KEY, v ? "0" : "1");
      } catch {}
      return !v;
    });
  };
  const { data: profile } = useProfile();
  const { data: rate } = useRate();
  const incomes = useIncomes();
  const money = useMoney();

  const income = salaryForMonth(incomes.data ?? [], month);
  const salaryQar = income ? Number(income.amount_qar) : null;
  const salaryMonth = income ? income.month.slice(0, 7) : null;
  const carriedOver = salaryMonth != null && salaryMonth !== month;
  // A carried-over salary pays for every month since it was saved, so the
  // cards and balance cover that whole span. Without a salary: just this month.
  const sinceSalaryQuery = useMonthlyTotalsRange(salaryMonth ?? month, month);
  const loading = incomes.isLoading || sinceSalaryQuery.isLoading;

  const sinceSalary = sumTotals(sinceSalaryQuery.data ?? []);
  const balance = computeBalance(salaryQar, sinceSalary);
  const zakatQar = computeZakat(salaryQar ?? 0);

  // Live rate for PKR equivalents; fall back to the rate saved with the salary.
  const qarPkr = rate?.qarPkr ?? (income ? Number(income.rate_qar_pkr) : null);
  const pkr = (qar: number) => (qarPkr ? qarToPkr(qar, qarPkr) : null);
  const firstName = profile?.name?.split(" ")[0];

  const cards = [
    { title: "Total Expenses", icon: ReceiptIcon, qar: sinceSalary.expensesQar, href: "/expenses" },
    { title: "Total Sent", icon: SendIcon, qar: sinceSalary.sentQar, href: "/sent" },
    { title: "Personal Savings", icon: VaultIcon, qar: sinceSalary.personalSavingsQar, href: "/savings/personal" },
    { title: "Family Savings", icon: UsersIcon, qar: sinceSalary.familySavingsQar, href: "/savings/family" },
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
          action={
            <button
              type="button"
              onClick={toggleSalary}
              aria-label={salaryVisible ? "Hide salary" : "Show salary"}
              aria-pressed={salaryVisible}
              className="flex size-8 items-center justify-center rounded-lg text-primary-foreground/85 outline-none transition-colors hover:bg-white/15 focus-visible:ring-2 focus-visible:ring-white/60"
            >
              {salaryVisible ? <EyeOffIcon className="size-4" /> : <EyeIcon className="size-4" />}
            </button>
          }
          footer={
            carriedOver
              ? `Carried over from ${shortMonthLabel(income!.month)}`
              : salaryVisible && income && income.currency !== "QAR"
                ? `Saved as ${money.format(Number(income.amount), income.currency)}`
                : undefined
          }
        >
          <div className="flex flex-wrap items-center justify-between gap-3">
            {salaryVisible ? (
              <AmountStack size="lg" primary={salaryQar ?? 0} primaryCurrency="QAR" secondary={pkr(salaryQar ?? 0)} secondaryCurrency="PKR" />
            ) : (
              <div className="flex flex-col" aria-label="Salary hidden">
                <span className="text-2xl font-semibold tracking-tight sm:text-3xl">QAR ******</span>
                <span className="text-xs text-muted-foreground">Rs ******</span>
              </div>
            )}
            {salaryVisible && zakatQar > 0 && (
              <div className="rounded-lg bg-white/10 px-4 py-2 ring-1 ring-white/15">
                <p className="mb-1 text-xs text-primary-foreground/75">Zakat (2.5%)</p>
                <AmountStack size="sm" primary={zakatQar} primaryCurrency="QAR" secondary={pkr(zakatQar)} secondaryCurrency="PKR" />
              </div>
            )}
          </div>
        </StatCard>
        <StatCard
          title="Balance"
          icon={ScaleIcon}
          loading={loading}
          footer={
            salaryQar == null
              ? "Shows 0 until a salary is saved"
              : carriedOver
                ? `Salary − everything spent since ${shortMonthLabel(income!.month)}`
                : "Salary − expenses − sent − savings"
          }
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

      {salaryQar != null && salaryQar > 0 && !loading && <SpendingBar salary={salaryQar} totals={sinceSalary} balance={balance} />}

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
