"use client";

import { toast } from "sonner";
import { EntityFormDialog } from "@/components/form/entity-form-dialog";
import { PoolWarning } from "@/components/app/pool-warning";
import { useAction, useMoney } from "@/lib/queries";
import { saveEntity } from "../../actions";
import { debtPaymentSchema } from "@/lib/validation/schemas";
import { validatePayment, type DebtKind } from "@/lib/calc/debts";
import { parseAmount, round2 } from "@/lib/currency";
import { todayISO } from "@/lib/dates";
import type { Tables } from "@/lib/database.types";
import { DEBT_TEXT } from "./debt-text";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  person: { id: string; name: string };
  kind: DebtKind;
  /** What the person still owes / is owed, across all their debts. */
  remaining: number;
  /** Debt pool left (only used for "taken"). */
  poolRemaining: number;
  /** Payment being edited, if any. */
  editing?: Tables<"debt_payments"> | null;
};

/** Pay a person back (taken) or record money received (given), capped at what's remaining. */
export function PaymentDialog({ open, onOpenChange, person, kind, remaining, poolRemaining, editing }: Props) {
  const money = useMoney();
  const save = useAction(saveEntity);
  const text = DEBT_TEXT[kind];
  // When editing, the old amount is freed up again.
  const available = round2(remaining + Number(editing?.amount_pkr ?? 0));

  return (
    <EntityFormDialog
      open={open}
      onOpenChange={onOpenChange}
      title={`${editing ? "Edit" : text.payTitle} · ${person.name}`}
      description={`${money.pkr(available)} ${kind === "taken" ? "left to pay" : "left to receive"}`}
      schema={debtPaymentSchema}
      submitLabel={editing ? "Save changes" : `Save ${text.paid.toLowerCase()}`}
      fields={[
        { name: "paid_on", label: "Date", type: "date", half: true },
        { name: "amount_pkr", label: "Amount", type: "money", currency: "PKR", half: true },
      ]}
      defaultValues={{
        person_id: person.id,
        kind,
        paid_on: editing?.paid_on ?? todayISO(),
        amount_pkr: editing ? String(Number(editing.amount_pkr)) : "",
      }}
      renderExtra={(values) => {
        const amount = parseAmount(values.amount_pkr as string);
        const problem = values.amount_pkr ? validatePayment(available, amount) : null;
        if (problem) return <p role="alert" className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">{problem}</p>;
        if (!Number.isFinite(amount) || amount <= 0) return null;
        return (
          <div className="grid gap-3">
            {kind === "taken" && (
              <PoolWarning label="debt" remaining={poolRemaining} amount={amount} previousAmount={Number(editing?.amount_pkr ?? 0)} />
            )}
            <p className="text-sm text-muted-foreground num">
              Remaining after this: <span className="font-semibold text-foreground">{money.pkr(available - amount)}</span>
              {available - amount === 0 && " · fully cleared"}
            </p>
          </div>
        );
      }}
      onSubmit={async (values) => {
        const problem = validatePayment(available, parseAmount(values.amount_pkr as string));
        if (problem) {
          toast.error(problem);
          return false;
        }
        return save.mutateAsync(["debt_payments", values, editing?.id]).then(() => {
          toast.success(editing ? "Payment updated" : `${text.paid} recorded`);
          return true;
        }, () => false);
      }}
    />
  );
}
