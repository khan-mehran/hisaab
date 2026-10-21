"use client";

import { useState } from "react";
import { toast } from "sonner";
import { PlusIcon, ReceiptIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PageHeader } from "@/components/app/page-header";
import { MonthPicker, useSelectedMonth } from "@/components/app/month-context";
import { Money } from "@/components/app/amount";
import { RowActions } from "@/components/app/row-actions";
import { TableEmpty, TableError, TableSkeleton } from "@/components/app/table-states";
import { EntityFormDialog, type FieldDef } from "@/components/form/entity-form-dialog";
import { useAction, useExpenses, useMoney, useRate } from "@/lib/queries";
import { deleteEntity, saveEntity } from "../actions";
import { EXPENSE_CATEGORIES, expenseSchema, type ExpenseInput } from "@/lib/validation/schemas";
import type { Tables } from "@/lib/database.types";
import { qarToPkr, round2 } from "@/lib/currency";
import { currentMonth, formatDate, formatDayMonth, monthLabel, todayISO, weekRange } from "@/lib/dates";

type Period = Tables<"expenses">["period"];
type Expense = Tables<"expenses">;

const TABS: { value: Period; label: string }[] = [
  { value: "daily", label: "Daily" },
  { value: "weekly", label: "Weekly" },
  { value: "monthly", label: "Monthly" },
];

export function ExpensesView() {
  const [tab, setTab] = useState<Period>("daily");

  return (
    <div className="grid gap-5">
      <PageHeader title="Expenses" description="Daily, weekly and monthly spending in QAR." actions={<MonthPicker />} />
      <Tabs value={tab} onValueChange={(v) => setTab(v as Period)}>
        <TabsList className="w-full sm:w-auto">
          {TABS.map((t) => (
            <TabsTrigger key={t.value} value={t.value} className="px-4">
              {t.label}
            </TabsTrigger>
          ))}
        </TabsList>
        {TABS.map((t) => (
          <TabsContent key={t.value} value={t.value} className="mt-4">
            <ExpenseTab period={t.value} />
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}

function fieldsFor(period: Period): FieldDef[] {
  const dates: FieldDef[] =
    period === "monthly"
      ? [{ name: "date_from", label: "Month", type: "month" }]
      : period === "weekly"
        ? [
            { name: "date_from", label: "Week from", type: "date", half: true },
            { name: "date_to", label: "Week to", type: "date", half: true },
          ]
        : [{ name: "date_from", label: "Date", type: "date" }];

  return [
    ...dates,
    { name: "category", label: "Category", type: "category", presets: EXPENSE_CATEGORIES },
    { name: "amount_qar", label: "Amount", type: "money", currency: "QAR", convert: true },
    { name: "reason", label: "Reason", type: "text", placeholder: "Optional note" },
  ];
}

/** Sensible default dates inside the selected month. */
function defaultsFor(period: Period, month: string): ExpenseInput {
  const inMonth = month === currentMonth() ? todayISO() : `${month}-01`;
  const week = weekRange(inMonth);
  return {
    period,
    date_from: period === "monthly" ? month : period === "weekly" ? week.from : inMonth,
    date_to: period === "weekly" ? week.to : "",
    category: "",
    amount_qar: "",
    reason: "",
  };
}

function toForm(e: Expense): ExpenseInput {
  return {
    period: e.period,
    date_from: e.period === "monthly" ? e.date_from.slice(0, 7) : e.date_from,
    date_to: e.date_to ?? "",
    category: e.category,
    amount_qar: String(Number(e.amount_qar)),
    reason: e.reason ?? "",
  };
}

function ExpenseTab({ period }: { period: Period }) {
  const [month] = useSelectedMonth();
  const { data: rows, isLoading, error } = useExpenses(period, month);
  const { data: rate } = useRate();
  const money = useMoney();
  const save = useAction(saveEntity);
  const remove = useAction(deleteEntity, "Expense deleted");

  const [editing, setEditing] = useState<Expense | null>(null);
  const [open, setOpen] = useState(false);

  const total = round2((rows ?? []).reduce((s, r) => s + Number(r.amount_qar), 0));
  const label = TABS.find((t) => t.value === period)!.label.toLowerCase();
  const dateHeader = period === "monthly" ? "Month" : period === "weekly" ? "Week" : "Date";
  const COLS = 5;

  const openAdd = () => {
    setEditing(null);
    setOpen(true);
  };

  return (
    <div className="grid gap-3">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm text-muted-foreground">Total {label} · {monthLabel(month)}</p>
          <p className="text-xl font-semibold tracking-tight num">
            {money.qar(total)}
            {rate && total > 0 && (
              <span className="ml-2 text-sm font-normal text-muted-foreground">{money.pkr(qarToPkr(total, rate.qarPkr))}</span>
            )}
          </p>
        </div>
        <Button onClick={openAdd}>
          <PlusIcon /> Add
        </Button>
      </div>

      <Card className="py-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{dateHeader}</TableHead>
              <TableHead>Category</TableHead>
              <TableHead className="text-right">Amount (QAR)</TableHead>
              <TableHead>Reason</TableHead>
              <TableHead className="w-10" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableSkeleton columns={COLS} />
            ) : error ? (
              <TableError columns={COLS} message={error.message} />
            ) : !rows?.length ? (
              <TableEmpty
                columns={COLS}
                icon={ReceiptIcon}
                title={`No ${label} expenses in ${monthLabel(month)}`}
                description="Tap Add to record one."
              />
            ) : (
              rows.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="num">
                    {period === "monthly"
                      ? monthLabel(r.date_from.slice(0, 7))
                      : period === "weekly"
                        ? `${formatDayMonth(r.date_from)} – ${formatDate(r.date_to ?? r.date_from)}`
                        : formatDate(r.date_from)}
                  </TableCell>
                  <TableCell>
                    <span className="rounded-md bg-secondary px-2 py-0.5 text-xs font-medium text-secondary-foreground">{r.category}</span>
                  </TableCell>
                  <TableCell className="text-right font-medium">
                    <Money value={Number(r.amount_qar)} currency="QAR" />
                  </TableCell>
                  <TableCell className="max-w-56 truncate text-muted-foreground">{r.reason || "—"}</TableCell>
                  <TableCell>
                    <RowActions
                      onEdit={() => {
                        setEditing(r);
                        setOpen(true);
                      }}
                      onDelete={() => remove.mutateAsync(["expenses", r.id]).then(() => true, () => false)}
                    />
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
          {!!rows?.length && (
            <TableFooter>
              <TableRow>
                <TableCell colSpan={2} className="font-semibold">Total</TableCell>
                <TableCell className="text-right font-semibold">
                  <Money value={total} currency="QAR" />
                </TableCell>
                <TableCell colSpan={2} />
              </TableRow>
            </TableFooter>
          )}
        </Table>
      </Card>

      <EntityFormDialog
        open={open}
        onOpenChange={setOpen}
        title={editing ? "Edit expense" : `Add ${label} expense`}
        schema={expenseSchema}
        fields={fieldsFor(period)}
        defaultValues={editing ? toForm(editing) : defaultsFor(period, month)}
        onSubmit={(values) =>
          save
            .mutateAsync(["expenses", { ...values, period }, editing?.id])
            .then(() => {
              toast.success(editing ? "Expense updated" : "Expense added");
              return true;
            }, () => false)
        }
      />
    </div>
  );
}

