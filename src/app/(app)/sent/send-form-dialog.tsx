"use client";

import { useEffect } from "react";
import { Controller, useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2Icon, TriangleAlertIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Field } from "@/components/form/field";
import { MoneyInput } from "@/components/form/money-input";
import { SelectField } from "@/components/form/select-field";
import { useMoney, useRate } from "@/lib/queries";
import { BANK_NAMES, BANKS, sendSchema, type SendInput } from "@/lib/validation/schemas";
import { validateAllocation } from "@/lib/calc/pools";
import { parseAmount, qarToPkr } from "@/lib/currency";
import { formatDate } from "@/lib/dates";
import type { Tables } from "@/lib/database.types";

const PARTS = [
  { name: "charity_qar", label: "Charity" },
  { name: "debt_qar", label: "Debt" },
  { name: "installments_qar", label: "Installments" },
  { name: "others_qar", label: "Others" },
] as const;

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Send being edited; it keeps its original exchange rate. */
  editing: Tables<"sends"> | null;
  defaultValues: SendInput;
  onSubmit: (values: SendInput) => Promise<boolean>;
};

const num = (v: unknown) => {
  const n = parseAmount(v as string);
  return Number.isFinite(n) ? n : 0;
};

/** Add/edit a send with live PKR conversion and the family remainder. */
export function SendFormDialog({ open, onOpenChange, editing, defaultValues, onSubmit }: Props) {
  const { data: liveRate } = useRate();
  const money = useMoney();
  const rate = editing ? Number(editing.rate_qar_pkr) : liveRate?.qarPkr;

  const { register, control, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<SendInput>({
    resolver: zodResolver(sendSchema, undefined, { raw: true }),
    defaultValues,
  });
  const v = useWatch({ control });

  useEffect(() => {
    if (open) reset(defaultValues);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- reset only when opening
  }, [open]);

  const amount = num(v.amount_qar);
  const check = validateAllocation({
    amount,
    charity: num(v.charity_qar),
    debt: num(v.debt_qar),
    installments: num(v.installments_qar),
    others: num(v.others_qar),
  });
  const pkr = (qar: number) => (rate ? money.pkr(qarToPkr(qar, rate)) : "—");

  return (
    <Dialog open={open} onOpenChange={(next) => !isSubmitting && onOpenChange(next)}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{editing ? "Edit send" : "Send money"}</DialogTitle>
          <DialogDescription>
            {editing
              ? `Locked at 1 QAR = Rs ${Number(editing.rate_qar_pkr).toFixed(2)} (sent ${formatDate(editing.sent_date)}).`
              : "The amount is deducted from your salary balance."}
          </DialogDescription>
        </DialogHeader>

        <form
          noValidate
          className="grid gap-4"
          onSubmit={handleSubmit(async (values) => {
            if (await onSubmit(values)) onOpenChange(false);
          })}
        >
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2 sm:col-span-1">
              <Field label="Date" htmlFor="sent_date" error={errors.sent_date?.message}>
                <Input id="sent_date" type="date" className="h-10" {...register("sent_date")} />
              </Field>
            </div>
            <div className="col-span-2 sm:col-span-1">
              <Field label="Bank" htmlFor="bank" error={errors.bank?.message}>
                <Controller
                  control={control}
                  name="bank"
                  render={({ field }) => (
                    <SelectField
                      id="bank"
                      value={field.value}
                      onChange={field.onChange}
                      invalid={!!errors.bank}
                      placeholder="Choose bank"
                      options={BANKS.map((b) => ({ value: b, label: b, hint: BANK_NAMES[b] }))}
                    />
                  )}
                />
              </Field>
            </div>
          </div>

          <Field label="Amount sent" htmlFor="amount_qar" error={errors.amount_qar?.message}>
            <MoneyInput id="amount_qar" currency="QAR" invalid={!!errors.amount_qar} {...register("amount_qar")} />
            {amount > 0 && (
              <p className="text-sm num">
                ≈ <span className="text-base font-semibold">{pkr(amount)}</span>
              </p>
            )}
          </Field>

          <fieldset className="grid gap-3 rounded-xl border p-3">
            <legend className="px-1 text-xs font-medium text-muted-foreground">Allocations (optional, QAR)</legend>
            <div className="grid grid-cols-2 gap-3">
              {PARTS.map((p) => (
                <Field key={p.name} label={p.label} htmlFor={p.name} error={errors[p.name]?.message}>
                  <MoneyInput id={p.name} currency="QAR" invalid={!!errors[p.name]} {...register(p.name)} />
                  {num(v[p.name]) > 0 && <p className="text-xs text-muted-foreground num">{pkr(num(v[p.name]))}</p>}
                </Field>
              ))}
            </div>
          </fieldset>

          {amount > 0 && (
            <div className={check.ok ? "rounded-lg bg-muted px-3 py-2.5" : "rounded-lg bg-destructive/10 px-3 py-2.5 text-destructive"}>
              {check.ok ? (
                <div className="flex items-baseline justify-between gap-3">
                  <span className="text-sm text-muted-foreground">Family portion</span>
                  <span className="text-right">
                    <span className="block font-semibold num">{pkr(check.familyQar)}</span>
                    <span className="block text-xs text-muted-foreground num">{money.qar(check.familyQar)}</span>
                  </span>
                </div>
              ) : (
                <p className="flex items-center gap-2 text-sm">
                  <TriangleAlertIcon className="size-4 shrink-0" />
                  Allocations are {money.qar(check.excessQar)} more than the amount sent.
                </p>
              )}
            </div>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting || !check.ok || (!editing && !rate)}>
              {isSubmitting && <Loader2Icon className="animate-spin" />}
              {editing ? "Save changes" : "Save send"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
