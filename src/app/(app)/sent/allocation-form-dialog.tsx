"use client";

import { useEffect } from "react";
import { Controller, useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2Icon, TriangleAlertIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Field } from "@/components/form/field";
import { MoneyInput } from "@/components/form/money-input";
import { SelectField } from "@/components/form/select-field";
import { num } from "./send-form-dialog";
import { useMoney } from "@/lib/queries";
import { allocationSchema, type AllocationInput } from "@/lib/validation/schemas";
import { validateAllocation } from "@/lib/calc/pools";
import { pkrToQar, qarToPkr } from "@/lib/currency";
import { formatDate } from "@/lib/dates";
import type { Tables } from "@/lib/database.types";

const PARTS = [
  { name: "charity_pkr", label: "Charity" },
  { name: "debt_pkr", label: "Debt" },
  { name: "installments_pkr", label: "Installments" },
  { name: "others_pkr", label: "Others" },
] as const;

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Newest first; the dialog opens on the newest. Must not be empty. */
  sends: Tables<"sends">[];
  onSubmit: (values: AllocationInput) => Promise<boolean>;
};

/** Whole rupees, matching how PKR is displayed; QAR's 2 decimals can't hold more. */
const toRupees = (qar: number, rate: number) => {
  const pkr = Math.round(qarToPkr(Number(qar), Number(rate)));
  return pkr ? String(pkr) : "";
};

const toForm = (s: Tables<"sends"> | undefined): AllocationInput => ({
  send_id: s?.id ?? "",
  charity_pkr: s ? toRupees(s.charity_qar, s.rate_qar_pkr) : "",
  debt_pkr: s ? toRupees(s.debt_qar, s.rate_qar_pkr) : "",
  installments_pkr: s ? toRupees(s.installments_qar, s.rate_qar_pkr) : "",
  others_pkr: s ? toRupees(s.others_qar, s.rate_qar_pkr) : "",
});

/** Split a send into pools; what is left of its amount is the family portion. */
export function AllocationFormDialog({ open, onOpenChange, sends, onSubmit }: Props) {
  const money = useMoney();

  const { register, control, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<AllocationInput>({
    resolver: zodResolver(allocationSchema, undefined, { raw: true }),
    defaultValues: toForm(sends[0]),
  });
  const v = useWatch({ control });

  useEffect(() => {
    if (open) reset(toForm(sends[0]));
    // eslint-disable-next-line react-hooks/exhaustive-deps -- reset only when opening
  }, [open]);

  const send = sends.find((s) => s.id === v.send_id);
  const rate = Number(send?.rate_qar_pkr ?? 0);
  const qar = (pkrValue: unknown) => (rate ? pkrToQar(num(pkrValue), rate) : 0);
  const check = validateAllocation({
    amount: Number(send?.amount_qar ?? 0),
    charity: qar(v.charity_pkr),
    debt: qar(v.debt_pkr),
    installments: qar(v.installments_pkr),
    others: qar(v.others_pkr),
  });
  const pkr = (qarValue: number) => (send ? money.pkr(qarToPkr(qarValue, rate)) : "—");

  return (
    <Dialog open={open} onOpenChange={(next) => !isSubmitting && onOpenChange(next)}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Add allocation</DialogTitle>
          <DialogDescription>Deducted from the amount of the send you choose. The rest stays with family.</DialogDescription>
        </DialogHeader>

        <form
          noValidate
          className="grid gap-4"
          onSubmit={handleSubmit(async (values) => {
            if (await onSubmit(values)) onOpenChange(false);
          })}
        >
          <Field label="Send" htmlFor="send_id" error={errors.send_id?.message}>
            <Controller
              control={control}
              name="send_id"
              render={({ field }) => (
                <SelectField
                  id="send_id"
                  value={field.value}
                  onChange={(id) => reset(toForm(sends.find((s) => s.id === id)))}
                  invalid={!!errors.send_id}
                  placeholder="Choose send"
                  options={sends.map((s) => ({
                    value: s.id,
                    label: `${formatDate(s.sent_date)} · ${money.pkr(qarToPkr(Number(s.amount_qar), Number(s.rate_qar_pkr)))}`,
                    hint: s.bank,
                  }))}
                />
              )}
            />
          </Field>

          <div className="grid grid-cols-2 gap-3">
            {PARTS.map((p) => (
              <Field key={p.name} label={p.label} htmlFor={p.name} error={errors[p.name]?.message}>
                <MoneyInput id={p.name} currency="PKR" invalid={!!errors[p.name]} {...register(p.name)} />
                {num(v[p.name]) > 0 && <p className="text-xs text-muted-foreground num">{money.qar(qar(v[p.name]))}</p>}
              </Field>
            ))}
          </div>

          <div className={check.ok ? "rounded-lg bg-muted px-3 py-2.5" : "rounded-lg bg-destructive/10 px-3 py-2.5 text-destructive"}>
            {check.ok ? (
              <div className="flex items-baseline justify-between gap-3">
                <span className="text-sm text-muted-foreground">Left for family</span>
                <span className="text-right">
                  <span className="block font-semibold num">{pkr(check.familyQar)}</span>
                  <span className="block text-xs text-muted-foreground num">{money.qar(check.familyQar)}</span>
                </span>
              </div>
            ) : (
              <p className="flex items-center gap-2 text-sm">
                <TriangleAlertIcon className="size-4 shrink-0" />
                Allocations are {pkr(check.excessQar)} more than the amount sent.
              </p>
            )}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting || !check.ok}>
              {isSubmitting && <Loader2Icon className="animate-spin" />}
              Save allocation
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
