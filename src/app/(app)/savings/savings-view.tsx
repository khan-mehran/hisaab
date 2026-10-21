"use client";

import { useState } from "react";
import { toast } from "sonner";
import { VaultIcon, PlusIcon, UsersIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PageHeader } from "@/components/app/page-header";
import { StatCard } from "@/components/app/stat-card";
import { AmountStack } from "@/components/app/amount";
import { RowActions } from "@/components/app/row-actions";
import { RateNote } from "@/components/app/rate-note";
import { TableEmpty, TableError, TableSkeleton } from "@/components/app/table-states";
import { EntityFormDialog } from "@/components/form/entity-form-dialog";
import { useAction, useRate, useSavings } from "@/lib/queries";
import { deleteEntity, saveEntity } from "../actions";
import { BANK_NAMES, BANKS, savingsSchema } from "@/lib/validation/schemas";
import { qarToPkr, round2 } from "@/lib/currency";
import { formatDate, todayISO } from "@/lib/dates";
import type { Tables } from "@/lib/database.types";

type Kind = Tables<"savings">["kind"];

const TEXT = {
  personal: { title: "Personal Savings", noun: "saving", icon: VaultIcon, description: "Money you put aside for yourself." },
  family: { title: "Family Savings", noun: "family saving", icon: UsersIcon, description: "Money saved for your family." },
} as const;

/** Shared page for personal and family savings (QAR, deducted from the balance). */
export function SavingsView({ kind }: { kind: Kind }) {
  const query = useSavings(kind);
  const { data: rate } = useRate();
  const save = useAction(saveEntity);
  const remove = useAction(deleteEntity, "Saving deleted");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Tables<"savings"> | null>(null);
  const t = TEXT[kind];

  const rows = query.data ?? [];
  const total = round2(rows.reduce((s, r) => s + Number(r.amount_qar), 0));
  const pkr = (qar: number) => (rate ? qarToPkr(qar, rate.qarPkr) : null);
  const COLS = 4;

  return (
    <div className="grid gap-5">
      <PageHeader
        title={t.title}
        description={`${t.description} Saved amounts are deducted from your balance.`}
        actions={
          <Button
            onClick={() => {
              setEditing(null);
              setOpen(true);
            }}
          >
            <PlusIcon /> Add
          </Button>
        }
      />

      <StatCard title={`Total ${t.title.toLowerCase()}`} icon={t.icon} tone="primary" loading={query.isLoading} className="sm:max-w-sm">
        <AmountStack size="lg" primary={total} primaryCurrency="QAR" secondary={pkr(total)} secondaryCurrency="PKR" />
      </StatCard>

      <Card className="py-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead className="text-right">Amount</TableHead>
              <TableHead>Bank</TableHead>
              <TableHead className="w-10" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {query.isLoading ? (
              <TableSkeleton columns={COLS} />
            ) : query.error ? (
              <TableError columns={COLS} message={query.error.message} />
            ) : !rows.length ? (
              <TableEmpty columns={COLS} icon={t.icon} title={`No ${t.noun}s yet`} description="Tap Add to record money you saved." />
            ) : (
              rows.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="num">{formatDate(r.saved_date)}</TableCell>
                  <TableCell className="text-right">
                    <AmountStack size="sm" primary={Number(r.amount_qar)} primaryCurrency="QAR" secondary={pkr(Number(r.amount_qar))} secondaryCurrency="PKR" className="items-end" />
                  </TableCell>
                  <TableCell>
                    <span className="rounded-md bg-secondary px-2 py-0.5 text-xs font-semibold text-secondary-foreground">{r.bank}</span>
                    <span className="ml-2 hidden text-xs text-muted-foreground sm:inline">{BANK_NAMES[r.bank]}</span>
                  </TableCell>
                  <TableCell>
                    <RowActions
                      onEdit={() => {
                        setEditing(r);
                        setOpen(true);
                      }}
                      onDelete={() => remove.mutateAsync(["savings", r.id]).then(() => true, () => false)}
                    />
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
          {!!rows.length && (
            <TableFooter>
              <TableRow>
                <TableCell className="font-semibold">Total</TableCell>
                <TableCell className="text-right font-semibold">
                  <AmountStack size="sm" primary={total} primaryCurrency="QAR" secondary={pkr(total)} secondaryCurrency="PKR" className="items-end" />
                </TableCell>
                <TableCell colSpan={2} />
              </TableRow>
            </TableFooter>
          )}
        </Table>
      </Card>

      <RateNote />

      <EntityFormDialog
        open={open}
        onOpenChange={setOpen}
        title={editing ? `Edit ${t.noun}` : `Add ${t.noun}`}
        schema={savingsSchema}
        fields={[
          { name: "saved_date", label: "Date", type: "date", half: true },
          {
            name: "bank",
            label: "Bank",
            type: "select",
            half: true,
            placeholder: "Choose bank",
            options: BANKS.map((b) => ({ value: b, label: b, hint: BANK_NAMES[b] })),
          },
          { name: "amount_qar", label: "Amount", type: "money", currency: "QAR", convert: true },
        ]}
        defaultValues={
          editing
            ? { kind, saved_date: editing.saved_date, amount_qar: String(Number(editing.amount_qar)), bank: editing.bank as string | undefined }
            : { kind, saved_date: todayISO(), amount_qar: "", bank: undefined as string | undefined }
        }
        onSubmit={(values) =>
          save.mutateAsync(["savings", { ...values, kind } as never, editing?.id]).then(() => {
            toast.success(editing ? "Saving updated" : "Saving added");
            return true;
          }, () => false)
        }
      />
    </div>
  );
}
