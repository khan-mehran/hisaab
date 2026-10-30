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
import { nextPartQar, validateAllocation } from "@/lib/calc/pools";
import { qarToPkr } from "@/lib/currency";
import { formatDate } from "@/lib/dates";
import type { Tables } from "@/lib/database.types";

const PARTS = [
  { name: "charity_pkr", column: "charity_qar", label: "Charity" },
  { name: "debt_pkr", column: "debt_qar", label: "Debt" },
  { name: "installments_pkr", column: "installments_qar", label: "Installments" },
  { name: "others_pkr", column: "others_qar", label: "Others" },
] as const;

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Newest first; adding opens on the newest. Must not be empty. */
  sends: Tables<"sends">[];
  /** Send whose totals are being corrected; null when adding to a send. */
  correcting: Tables<"sends"> | null;
  onSubmit: (values: AllocationInput) => Promise<boolean>;
};

/** Whole rupees, matching how PKR is displayed; QAR's 2 decimals can't hold more. */
const toRupees = (qar: number, rate: number) => {
  const pkr = Math.round(qarToPkr(Number(qar), Number(rate)));
  return pkr ? String(pkr) : "";
};

const toForm = (sends: Tables<"sends">[], correcting: Tables<"sends"> | null): AllocationInput =>
  correcting
    ? {
        mode: "set",
        send_id: correcting.id,
        charity_pkr: toRupees(correcting.charity_qar, correcting.rate_qar_pkr),
        debt_pkr: toRupees(correcting.debt_qar, correcting.rate_qar_pkr),
        installments_pkr: toRupees(correcting.installments_qar, correcting.rate_qar_pkr),
        others_pkr: toRupees(correcting.others_qar, correcting.rate_qar_pkr),
      }
    : { mode: "add", send_id: sends[0]?.id ?? "", charity_pkr: "", debt_pkr: "", installments_pkr: "", others_pkr: "" };

/**
 * Add to a send's pools, or correct their totals. What is left of the send's
 * amount is the family portion.
 */
export function AllocationFormDialog({ open, onOpenChange, sends, correcting, onSubmit }: Props) {
  const money = useMoney();
  const mode = correcting ? "set" : "add";

  const { register, control, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<AllocationInput>({
    resolver: zodResolver(allocationSchema, undefined, { raw: true }),
    defaultValues: toForm(sends, correcting),
  });
  const v = useWatch({ control });

  useEffect(() => {
    if (open) reset(toForm(sends, correcting));
    // eslint-disable-next-line react-hooks/exhaustive-deps -- reset only when opening
  }, [open]);

  const send = sends.find((s) => s.id === v.send_id);
  const rate = Number(send?.rate_qar_pkr ?? 0);
  // The pool's QAR amount on this send once the form is saved.
  const next = (part: (typeof PARTS)[number]) =>
    send ? nextPartQar(mode, Number(send[part.column]), num(v[part.name]), rate) : 0;
  const [charity, debt, installments, others] = PARTS.map(next);
  const check = validateAllocation({ amount: Number(send?.amount_qar ?? 0), charity, debt, installments, others });
  const pkr = (qar: number) => (send ? money.pkr(qarToPkr(qar, rate)) : "—");
  const nothingToAdd = mode === "add" && PARTS.every((p) => num(v[p.name]) === 0);

  return (
    <Dialog open={open} onOpenChange={(next) => !isSubmitting && onOpenChange(next)}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{correcting ? "Edit allocations" : "Add allocation"}</DialogTitle>
          <DialogDescription>
            {correcting
              ? `These replace the totals for the ${formatDate(correcting.sent_date)} send (${pkr(Number(correcting.amount_qar))}).`
              : "Added to what the send already has and deducted from its amount. The rest stays with family."}
          </DialogDescription>
        </DialogHeader>

        <form
          noValidate
          className="grid gap-4"
          onSubmit={handleSubmit(async (values) => {
            if (await onSubmit(values)) onOpenChange(false);
          })}
        >
          {!correcting && (
            <Field label="Send" htmlFor="send_id" error={errors.send_id?.message}>
              <Controller
                control={control}
                name="send_id"
                render={({ field }) => (
                  <SelectField
                    id="send_id"
                    value={field.value}
                    onChange={field.onChange}
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
          )}

          <div className="grid grid-cols-2 gap-3">
            {PARTS.map((p) => {
              const qar = next(p);
              return (
                <Field key={p.name} label={p.label} htmlFor={p.name} error={errors[p.name]?.message}>
                  <MoneyInput id={p.name} currency="PKR" invalid={!!errors[p.name]} {...register(p.name)} />
                  {qar > 0 && (
                    <p className="text-xs text-muted-foreground num">
                      {correcting ? money.qar(qar) : `Total ${pkr(qar)} · ${money.qar(qar)}`}
                    </p>
                  )}
                </Field>
              );
            })}
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
            <Button type="submit" disabled={isSubmitting || !check.ok || nothingToAdd}>
              {isSubmitting && <Loader2Icon className="animate-spin" />}
              {correcting ? "Save changes" : "Add allocation"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
