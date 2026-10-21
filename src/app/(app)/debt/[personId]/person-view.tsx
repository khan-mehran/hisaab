"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import { z } from "zod";
import { toast } from "sonner";
import {
  ArrowDownLeftIcon,
  ArrowLeftIcon,
  ArrowUpRightIcon,
  CircleCheckIcon,
  MoreVerticalIcon,
  PencilIcon,
  PlusIcon,
  UserXIcon,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { usePool } from "@/components/app/pool-warning";
import { RowActions } from "@/components/app/row-actions";
import { ConfirmDialog } from "@/components/app/confirm-dialog";
import { EntityFormDialog } from "@/components/form/entity-form-dialog";
import { useAction, useMoney } from "@/lib/queries";
import { deleteEntity, renamePerson, updateDebt } from "../../actions";
import { debtUpdateSchema, personName } from "@/lib/validation/schemas";
import { personLedger, summarizePeople, type DebtKind, type PersonRow } from "@/lib/calc/debts";
import { formatDate, shortMonthLabel } from "@/lib/dates";
import type { Tables } from "@/lib/database.types";
import { cn } from "@/lib/utils";
import { DEBT_KINDS, DEBT_TEXT } from "../_components/debt-text";
import { useDebtData } from "../_components/use-debt-data";
import { AddDebtDialog } from "../_components/add-debt-dialog";
import { PaymentDialog } from "../_components/payment-dialog";
import { SummaryFigure } from "../_components/summary-figure";

type Person = Tables<"debt_people">;

/** Complete history with one person: every debt and payment, both directions. */
export function PersonView() {
  const { personId } = useParams<{ personId: string }>();
  const router = useRouter();
  const data = useDebtData();
  const [renaming, setRenaming] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [adding, setAdding] = useState<DebtKind | null>(null);
  const rename = useAction(renamePerson, "Name updated");
  const remove = useAction(deleteEntity);

  const person = data.people.find((p) => p.id === personId);

  if (data.loading) {
    return (
      <div className="grid gap-5">
        <Skeleton className="h-5 w-20" />
        <Skeleton className="h-9 w-56" />
        <Skeleton className="h-72" />
      </div>
    );
  }

  if (!person) {
    return (
      <div className="grid justify-items-start gap-3">
        <BackLink />
        <h1 className="font-heading text-2xl font-semibold">Person not found</h1>
        <p className="text-muted-foreground">They may have been deleted.</p>
      </div>
    );
  }

  const sides = DEBT_KINDS.map((kind) => ({
    kind,
    row: summarizePeople([person], data.debts, data.payments, kind).rows[0] as PersonRow<Person> | undefined,
  }));
  const withHistory = sides.filter((s) => s.row);

  return (
    <div className="grid gap-5">
      <div className="grid gap-2">
        <BackLink />
        <div className="flex items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-primary text-lg font-semibold text-primary-foreground">
              {person.name.charAt(0).toUpperCase()}
            </span>
            <div className="min-w-0">
              <h1 className="truncate font-heading text-2xl font-semibold tracking-tight">{person.name}</h1>
              <p className="text-sm text-muted-foreground">Complete debt history</p>
            </div>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger render={<Button variant="outline" size="icon" aria-label="Person options" />}>
              <MoreVerticalIcon />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="min-w-44">
              <DropdownMenuItem onClick={() => setRenaming(true)}>
                <PencilIcon /> Rename
              </DropdownMenuItem>
              {DEBT_KINDS.map((k) => (
                <DropdownMenuItem key={k} onClick={() => setAdding(k)}>
                  <PlusIcon /> {DEBT_TEXT[k].startOther} {person.name.split(" ")[0]}
                </DropdownMenuItem>
              ))}
              <DropdownMenuSeparator />
              <DropdownMenuItem variant="destructive" onClick={() => setDeleting(true)}>
                <UserXIcon /> Delete person
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {withHistory.length === 0 && (
        <Card className="items-center gap-3 p-8 text-center">
          <p className="font-medium">No debts with {person.name} yet</p>
          <div className="flex gap-2">
            {DEBT_KINDS.map((k) => (
              <Button key={k} variant="outline" onClick={() => setAdding(k)}>
                <PlusIcon /> {DEBT_TEXT[k].startOther} {person.name.split(" ")[0]}
              </Button>
            ))}
          </div>
        </Card>
      )}

      {withHistory.map(({ kind, row }) => (
        <PersonSide key={kind} kind={kind} person={person} row={row!} data={data} onAddMore={() => setAdding(kind)} />
      ))}

      <AddDebtDialog open={!!adding} onOpenChange={(o) => !o && setAdding(null)} kind={adding ?? "taken"} person={person} />

      <EntityFormDialog
        open={renaming}
        onOpenChange={setRenaming}
        title="Rename person"
        schema={z.object({ name: personName })}
        fields={[{ name: "name", label: "Name", type: "text" }]}
        defaultValues={{ name: person.name }}
        onSubmit={(v) => rename.mutateAsync([person.id, v.name]).then(() => true, () => false)}
      />

      <ConfirmDialog
        open={deleting}
        onOpenChange={setDeleting}
        title={`Delete ${person.name}?`}
        description="All of their debts and payments will be permanently deleted from your history."
        confirmLabel="Delete person"
        onConfirm={() =>
          remove.mutateAsync(["debt_people", person.id]).then(() => {
            toast.success(`${person.name} deleted`);
            router.push("/debt");
            return true;
          }, () => false)
        }
      />
    </div>
  );
}

function BackLink() {
  return (
    <Link href="/debt" className="flex w-fit items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
      <ArrowLeftIcon className="size-4" /> Debt
    </Link>
  );
}

/** One direction (borrowed from / lent to) with totals, actions and the ledger. */
function PersonSide({
  kind,
  person,
  row,
  data,
  onAddMore,
}: {
  kind: DebtKind;
  person: Person;
  row: PersonRow<Person>;
  data: ReturnType<typeof useDebtData>;
  onAddMore: () => void;
}) {
  const text = DEBT_TEXT[kind];
  const money = useMoney();
  const { status: pool } = usePool("debt");
  const remove = useAction(deleteEntity, "Entry deleted");
  const [paying, setPaying] = useState(false);
  const [editingPayment, setEditingPayment] = useState<Tables<"debt_payments"> | null>(null);
  const [editingDebt, setEditingDebt] = useState<Tables<"debts"> | null>(null);
  const update = useAction(updateDebt, "Entry updated");

  const ledger = personLedger(data.debts, data.payments, person.id, kind);
  const months = Object.keys(row.byMonth).sort();

  return (
    <Card className="gap-0 py-0">
      <CardHeader className="flex flex-col gap-3 border-b py-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <CardTitle className="flex items-center gap-2">
            {text.section(person.name)}
            {row.cleared ? (
              <Badge variant="secondary" className="gap-1 bg-success/15 text-success">
                <CircleCheckIcon className="size-3" /> Cleared
              </Badge>
            ) : (
              <Badge variant="secondary" className="bg-primary/10 text-primary dark:text-[color-mix(in_oklch,var(--primary),white_40%)]">Active</Badge>
            )}
          </CardTitle>
          <CardDescription className="num">
            {row.entries} {row.entries === 1 ? "entry" : "entries"} since {formatDate(row.firstDate)}
          </CardDescription>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={onAddMore}>
            <PlusIcon /> {text.addMore}
          </Button>
          <Button onClick={() => setPaying(true)} disabled={row.cleared}>
            {text.action}
          </Button>
        </div>
      </CardHeader>

      <div className="grid gap-3 border-b p-4">
        <div className="grid grid-cols-3 gap-3">
          <SummaryFigure label={kind === "taken" ? "Total borrowed" : "Total lent"} value={row.total} loading={false} />
          <SummaryFigure label={`Total ${text.paid.toLowerCase()}`} value={row.paid} loading={false} />
          <SummaryFigure label="Remaining" value={row.remaining} loading={false} highlight />
        </div>
        {months.length > 0 && (
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span className="text-muted-foreground">{text.paid} by month:</span>
            {months.map((m) => (
              <span key={m} className="rounded-md bg-muted px-2 py-1 num">
                {shortMonthLabel(m)} <b className="font-semibold">{money.pkr(row.byMonth[m])}</b>
              </span>
            ))}
          </div>
        )}
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Date</TableHead>
            <TableHead>Entry</TableHead>
            <TableHead className="text-right">Amount</TableHead>
            <TableHead className="text-right">Balance</TableHead>
            <TableHead className="w-10" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {ledger.map((e) => {
            const isDebt = e.type === "debt";
            return (
              <TableRow key={`${e.type}-${e.id}`}>
                <TableCell className="num">{formatDate(e.date)}</TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <span
                      className={cn(
                        "flex size-6 shrink-0 items-center justify-center rounded-full",
                        isDebt ? "bg-primary/10 text-primary dark:text-[color-mix(in_oklch,var(--primary),white_40%)]" : "bg-success/15 text-success",
                      )}
                    >
                      {isDebt ? <ArrowDownLeftIcon className="size-3.5" /> : <ArrowUpRightIcon className="size-3.5" />}
                    </span>
                    <div className="min-w-0">
                      <p className="font-medium">{isDebt ? text.debtEntry : text.paymentEntry}</p>
                      {isDebt && e.note && <p className="max-w-56 truncate text-xs text-muted-foreground">{e.note}</p>}
                    </div>
                  </div>
                </TableCell>
                <TableCell className={cn("text-right font-medium num", isDebt ? "" : "text-success")}>
                  {isDebt ? "+" : "−"} {money.pkr(e.amount)}
                </TableCell>
                <TableCell className={cn("text-right font-semibold num", e.balance === 0 && "text-success")}>{money.pkr(e.balance)}</TableCell>
                <TableCell>
                  <RowActions
                    onEdit={() => {
                      if (isDebt) setEditingDebt(data.debts.find((d) => d.id === e.id) ?? null);
                      else setEditingPayment(data.payments.find((p) => p.id === e.id) ?? null);
                    }}
                    deleteTitle={isDebt ? "Delete this debt entry?" : "Delete this payment?"}
                    deleteDescription={isDebt ? "If payments would then be more than the debt, remove a payment first." : "The remaining balance will go back up."}
                    onDelete={() => remove.mutateAsync([isDebt ? "debts" : "debt_payments", e.id]).then(() => true, () => false)}
                  />
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>

      <PaymentDialog
        open={paying || !!editingPayment}
        onOpenChange={(o) => {
          if (!o) {
            setPaying(false);
            setEditingPayment(null);
          }
        }}
        person={person}
        kind={kind}
        remaining={row.remaining}
        poolRemaining={pool.remaining}
        editing={editingPayment}
      />

      <EntityFormDialog
        open={!!editingDebt}
        onOpenChange={(o) => !o && setEditingDebt(null)}
        title={`Edit ${text.debtEntry.toLowerCase()} amount`}
        schema={debtUpdateSchema}
        fields={[
          { name: "debt_date", label: "Date", type: "date", half: true },
          { name: "amount_pkr", label: "Amount", type: "money", currency: "PKR", half: true },
          { name: "note", label: "Note", type: "text", placeholder: "Optional" },
        ]}
        defaultValues={{
          debt_date: editingDebt?.debt_date ?? "",
          amount_pkr: editingDebt ? String(Number(editingDebt.amount_pkr)) : "",
          note: editingDebt?.note ?? "",
        }}
        onSubmit={(v) => update.mutateAsync([editingDebt!.id, v]).then(() => true, () => false)}
      />
    </Card>
  );
}

