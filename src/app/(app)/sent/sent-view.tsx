"use client";

import { useState } from "react";
import { toast } from "sonner";
import {
  CreditCardIcon,
  HandCoinsIcon,
  HandHeartIcon,
  HeartHandshakeIcon,
  PlusIcon,
  SendIcon,
  ShapesIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PageHeader } from "@/components/app/page-header";
import { StatCard } from "@/components/app/stat-card";
import { AmountStack, Money } from "@/components/app/amount";
import { RowActions } from "@/components/app/row-actions";
import { RateNote } from "@/components/app/rate-note";
import { TableEmpty, TableError, TableSkeleton } from "@/components/app/table-states";
import { EntityFormDialog } from "@/components/form/entity-form-dialog";
import { SendFormDialog } from "./send-form-dialog";
import { useAction, useFamilyPortion, useFamilyTransfers, useMoney, useSends } from "@/lib/queries";
import { deleteEntity, saveEntity, saveSend } from "../actions";
import { familyTransferSchema, RELATIONS, type SendInput } from "@/lib/validation/schemas";
import { sendTotals, validateAllocation } from "@/lib/calc/pools";
import { qarToPkr, round2 } from "@/lib/currency";
import { formatDate, todayISO } from "@/lib/dates";
import type { Tables } from "@/lib/database.types";
import { cn } from "@/lib/utils";

const EMPTY_SEND: SendInput = {
  sent_date: "",
  amount_qar: "",
  charity_qar: "",
  debt_qar: "",
  installments_qar: "",
  others_qar: "",
  bank: undefined as unknown as SendInput["bank"],
};

const blank = (n: number) => (Number(n) ? String(Number(n)) : "");

export function SentView() {
  const sends = useSends();
  const save = useAction(saveSend);
  const remove = useAction(deleteEntity, "Send deleted");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Tables<"sends"> | null>(null);

  const totals = sendTotals(sends.data ?? []);
  const loading = sends.isLoading;

  const cards = [
    { title: "Total Sent", icon: SendIcon, value: totals.total, tone: "primary" as const },
    { title: "Charity", icon: HandHeartIcon, value: totals.charity },
    { title: "Debt", icon: HandCoinsIcon, value: totals.debt },
    { title: "Installments", icon: CreditCardIcon, value: totals.installments },
    { title: "Others", icon: ShapesIcon, value: totals.others },
  ];

  const COLS = 9;

  return (
    <div className="grid gap-5">
      <PageHeader
        title="Sent"
        description="Money sent home, split into charity, debt, installments, others and family."
        actions={
          <Button
            onClick={() => {
              setEditing(null);
              setOpen(true);
            }}
          >
            <PlusIcon /> Add send
          </Button>
        }
      />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
        {cards.map((c, i) => (
          <StatCard key={c.title} title={c.title} icon={c.icon} tone={c.tone} loading={loading} className={cn(i === 0 && "col-span-2 lg:col-span-1")}>
            <AmountStack primary={c.value.pkr} primaryCurrency="PKR" secondary={c.value.qar} secondaryCurrency="QAR" />
          </StatCard>
        ))}
      </div>

      <Card className="gap-0 py-0">
        <CardHeader className="border-b py-4">
          <CardTitle>All sends</CardTitle>
          <CardDescription>Each send converts at the rate on the day it was sent.</CardDescription>
        </CardHeader>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead className="text-right">Amount</TableHead>
              <TableHead className="text-right">Charity</TableHead>
              <TableHead className="text-right">Debt</TableHead>
              <TableHead className="text-right">Installments</TableHead>
              <TableHead className="text-right">Others</TableHead>
              <TableHead className="text-right">Family</TableHead>
              <TableHead>Bank</TableHead>
              <TableHead className="w-10" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableSkeleton columns={COLS} />
            ) : sends.error ? (
              <TableError columns={COLS} message={sends.error.message} />
            ) : !sends.data?.length ? (
              <TableEmpty columns={COLS} icon={SendIcon} title="No sends yet" description="Tap Add send to record money you sent home." />
            ) : (
              sends.data.map((s) => {
                const rate = Number(s.rate_qar_pkr);
                const family = validateAllocation({
                  amount: Number(s.amount_qar),
                  charity: Number(s.charity_qar),
                  debt: Number(s.debt_qar),
                  installments: Number(s.installments_qar),
                  others: Number(s.others_qar),
                }).familyQar;
                return (
                  <TableRow key={s.id}>
                    <TableCell className="num">{formatDate(s.sent_date)}</TableCell>
                    <TableCell className="text-right">
                      <AmountStack size="sm" primary={qarToPkr(Number(s.amount_qar), rate)} primaryCurrency="PKR" secondary={Number(s.amount_qar)} secondaryCurrency="QAR" className="items-end" />
                    </TableCell>
                    {[s.charity_qar, s.debt_qar, s.installments_qar, s.others_qar, family].map((qar, i) => (
                      <TableCell key={i} className="text-right">
                        {Number(qar) > 0 ? <Money value={qarToPkr(Number(qar), rate)} currency="PKR" /> : <span className="text-muted-foreground">—</span>}
                      </TableCell>
                    ))}
                    <TableCell>
                      <span className="rounded-md bg-secondary px-2 py-0.5 text-xs font-semibold text-secondary-foreground">{s.bank}</span>
                    </TableCell>
                    <TableCell>
                      <RowActions
                        onEdit={() => {
                          setEditing(s);
                          setOpen(true);
                        }}
                        deleteTitle="Delete this send?"
                        deleteDescription="Its allocations will be removed from the pools and the balance."
                        onDelete={() => remove.mutateAsync(["sends", s.id]).then(() => true, () => false)}
                      />
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
          {!!sends.data?.length && (
            <TableFooter>
              <TableRow>
                <TableCell className="font-semibold">Total</TableCell>
                <TableCell className="text-right font-semibold"><Money value={totals.total.pkr} currency="PKR" /></TableCell>
                {(["charity", "debt", "installments", "others", "family"] as const).map((k) => (
                  <TableCell key={k} className="text-right font-semibold"><Money value={totals[k].pkr} currency="PKR" /></TableCell>
                ))}
                <TableCell colSpan={2} />
              </TableRow>
            </TableFooter>
          )}
        </Table>
      </Card>

      <FamilySection />
      <RateNote />

      <SendFormDialog
        open={open}
        onOpenChange={setOpen}
        editing={editing}
        defaultValues={
          editing
            ? {
                sent_date: editing.sent_date,
                amount_qar: String(Number(editing.amount_qar)),
                charity_qar: blank(editing.charity_qar),
                debt_qar: blank(editing.debt_qar),
                installments_qar: blank(editing.installments_qar),
                others_qar: blank(editing.others_qar),
                bank: editing.bank,
              }
            : { ...EMPTY_SEND, sent_date: todayISO() }
        }
        onSubmit={(values) =>
          save.mutateAsync([values, editing?.id]).then(() => {
            toast.success(editing ? "Send updated" : "Send saved");
            return true;
          }, () => false)
        }
      />
    </div>
  );
}

/** Family table (PKR): how the family portion of all sends was split. */
function FamilySection() {
  const transfers = useFamilyTransfers();
  const portion = useFamilyPortion();
  const money = useMoney();
  const save = useAction(saveEntity);
  const remove = useAction(deleteEntity, "Entry deleted");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Tables<"family_transfers"> | null>(null);

  const rows = transfers.data ?? [];
  const byRelation = Object.fromEntries(RELATIONS.map((r) => [r, 0])) as Record<(typeof RELATIONS)[number], number>;
  for (const t of rows) byRelation[t.relation] = round2(byRelation[t.relation] + Number(t.amount_pkr));
  const allocated = round2(rows.reduce((s, t) => s + Number(t.amount_pkr), 0));
  const portionPkr = Number(portion.data?.portion_pkr ?? 0);
  const unallocated = round2(portionPkr - allocated);
  const COLS = 4;

  return (
    <Card className="gap-0 py-0">
      <CardHeader className="flex flex-col gap-3 border-b py-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <CardTitle className="flex items-center gap-2"><HeartHandshakeIcon className="size-4 text-primary" /> Family</CardTitle>
          <CardDescription>Split the family portion between Father, Mother, My Family and Brother.</CardDescription>
        </div>
        <Button
          variant="outline"
          onClick={() => {
            setEditing(null);
            setOpen(true);
          }}
        >
          <PlusIcon /> Add
        </Button>
      </CardHeader>

      <div className="grid gap-4 border-b p-4">
        <div className="grid grid-cols-3 gap-3">
          <Figure label="Family portion" value={money.pkr(portionPkr)} />
          <Figure label="Allocated" value={money.pkr(allocated)} />
          <Figure
            label={unallocated < 0 ? "Over-allocated" : "Unallocated"}
            value={money.pkr(Math.abs(unallocated))}
            className={unallocated < 0 ? "text-destructive" : unallocated > 0 ? "text-[color-mix(in_oklch,var(--warning),black_30%)] dark:text-warning" : "text-success"}
          />
        </div>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {RELATIONS.map((r) => (
            <div key={r} className="rounded-lg bg-muted px-3 py-2">
              <p className="text-xs text-muted-foreground">{r}{r === "Brother" && " (optional)"}</p>
              <p className="font-semibold num">{money.pkr(byRelation[r])}</p>
            </div>
          ))}
        </div>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Date</TableHead>
            <TableHead>Relation</TableHead>
            <TableHead className="text-right">Amount (PKR)</TableHead>
            <TableHead className="w-10" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {transfers.isLoading ? (
            <TableSkeleton columns={COLS} rows={3} />
          ) : transfers.error ? (
            <TableError columns={COLS} message={transfers.error.message} />
          ) : !rows.length ? (
            <TableEmpty columns={COLS} icon={HeartHandshakeIcon} title="No family entries yet" description="Add how much each family member received." />
          ) : (
            rows.map((t) => (
              <TableRow key={t.id}>
                <TableCell className="num">{formatDate(t.transfer_date)}</TableCell>
                <TableCell>{t.relation}</TableCell>
                <TableCell className="text-right font-medium"><Money value={Number(t.amount_pkr)} currency="PKR" /></TableCell>
                <TableCell>
                  <RowActions
                    onEdit={() => {
                      setEditing(t);
                      setOpen(true);
                    }}
                    onDelete={() => remove.mutateAsync(["family_transfers", t.id]).then(() => true, () => false)}
                  />
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
        {!!rows.length && (
          <TableFooter>
            <TableRow>
              <TableCell colSpan={2} className="font-semibold">Total</TableCell>
              <TableCell className="text-right font-semibold"><Money value={allocated} currency="PKR" /></TableCell>
              <TableCell />
            </TableRow>
          </TableFooter>
        )}
      </Table>

      <EntityFormDialog
        open={open}
        onOpenChange={setOpen}
        title={editing ? "Edit family entry" : "Add family entry"}
        description={`Unallocated family portion: ${money.pkr(Math.max(0, unallocated))}`}
        schema={familyTransferSchema}
        fields={[
          { name: "transfer_date", label: "Date", type: "date", half: true },
          { name: "relation", label: "Relation", type: "select", half: true, placeholder: "Choose", options: RELATIONS.map((r) => ({ value: r, label: r })) },
          { name: "amount_pkr", label: "Amount", type: "money", currency: "PKR" },
        ]}
        defaultValues={
          editing
            ? { transfer_date: editing.transfer_date, relation: editing.relation, amount_pkr: String(Number(editing.amount_pkr)) }
            : { transfer_date: todayISO(), relation: undefined, amount_pkr: "" }
        }
        onSubmit={(values) =>
          save.mutateAsync(["family_transfers", values as never, editing?.id]).then(() => {
            toast.success(editing ? "Entry updated" : "Entry added");
            return true;
          }, () => false)
        }
      />
    </Card>
  );
}

function Figure({ label, value, className }: { label: string; value: string; className?: string }) {
  return (
    <div className="min-w-0">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={cn("truncate text-base font-semibold tracking-tight num sm:text-lg", className)}>{value}</p>
    </div>
  );
}
