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

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Send being edited; it keeps its original exchange rate. */
  editing: Tables<"sends"> | null;
  defaultValues: SendInput;
  onSubmit: (values: SendInput) => Promise<boolean>;
};

export const num = (v: unknown) => {
  const n = parseAmount(v as string);
  return Number.isFinite(n) ? n : 0;
};

/** Add/edit a send with live PKR conversion. Allocations have their own dialog. */
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
  // An edited send can't go below what is already allocated from it.
  const check = validateAllocation({
    amount,
    charity: Number(editing?.charity_qar ?? 0),
    debt: Number(editing?.debt_qar ?? 0),
    installments: Number(editing?.installments_qar ?? 0),
    others: Number(editing?.others_qar ?? 0),
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

          {!check.ok && (
            <p className="flex items-center gap-2 rounded-lg bg-destructive/10 px-3 py-2.5 text-sm text-destructive">
              <TriangleAlertIcon className="size-4 shrink-0" />
              {money.qar(check.partsQar)} is already allocated from this send. Lower the allocations first.
            </p>
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
