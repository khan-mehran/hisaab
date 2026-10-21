"use client";

import { useEffect } from "react";
import { useFieldArray, useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2Icon, PlusIcon, XIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Field } from "@/components/form/field";
import { MoneyInput } from "@/components/form/money-input";
import { PoolWarning } from "@/components/app/pool-warning";
import { useMoney } from "@/lib/queries";
import { otherBatchSchema, type OtherBatchInput } from "@/lib/validation/schemas";
import { parseAmount, round2 } from "@/lib/currency";
import { todayISO } from "@/lib/dates";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  remaining: number;
  onSubmit: (values: OtherBatchInput) => Promise<boolean>;
};

const emptyRow = { label: "", amount_pkr: "" };

/** Add several Label + Amount rows in one go; each becomes a table row. */
export function OthersBatchDialog({ open, onOpenChange, remaining, onSubmit }: Props) {
  const money = useMoney();
  const { register, control, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<OtherBatchInput>({
    resolver: zodResolver(otherBatchSchema, undefined, { raw: true }),
    defaultValues: { entry_date: todayISO(), items: [emptyRow] },
  });
  const { fields, append, remove } = useFieldArray({ control, name: "items" });
  const items = useWatch({ control, name: "items" });

  useEffect(() => {
    if (open) reset({ entry_date: todayISO(), items: [emptyRow] });
  }, [open, reset]);

  const total = round2(
    (items ?? []).reduce((s, i) => {
      const n = parseAmount(i?.amount_pkr as string);
      return s + (Number.isFinite(n) ? n : 0);
    }, 0),
  );

  return (
    <Dialog open={open} onOpenChange={(next) => !isSubmitting && onOpenChange(next)}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Add other expenses</DialogTitle>
          <DialogDescription>Add as many label and amount pairs as you need.</DialogDescription>
        </DialogHeader>

        <form
          noValidate
          className="grid gap-4"
          onSubmit={handleSubmit(async (values) => {
            if (await onSubmit(values)) onOpenChange(false);
          })}
        >
          <Field label="Date" htmlFor="entry_date" error={errors.entry_date?.message}>
            <Input id="entry_date" type="date" className="h-10" {...register("entry_date")} />
          </Field>

          <div className="grid gap-2">
            <div className="grid grid-cols-[1fr_9rem_2rem] gap-2 text-sm font-medium">
              <Label>Label</Label>
              <Label>Amount</Label>
              <span />
            </div>
            {fields.map((f, i) => {
              const err = errors.items?.[i];
              return (
                <div key={f.id} className="grid gap-1">
                  <div className="grid grid-cols-[1fr_9rem_2rem] items-start gap-2">
                    <Input
                      placeholder="e.g. Electricity bill"
                      aria-label={`Label ${i + 1}`}
                      aria-invalid={!!err?.label || undefined}
                      className="h-10"
                      autoFocus={i > 0 && i === fields.length - 1}
                      {...register(`items.${i}.label`)}
                    />
                    <MoneyInput currency="PKR" aria-label={`Amount ${i + 1}`} invalid={!!err?.amount_pkr} {...register(`items.${i}.amount_pkr`)} />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="mt-1"
                      aria-label={`Remove row ${i + 1}`}
                      disabled={fields.length === 1}
                      onClick={() => remove(i)}
                    >
                      <XIcon />
                    </Button>
                  </div>
                  {(err?.label || err?.amount_pkr) && (
                    <p role="alert" className="text-xs text-destructive">{err.label?.message ?? err.amount_pkr?.message}</p>
                  )}
                </div>
              );
            })}
            {errors.items?.root?.message && <p className="text-xs text-destructive">{errors.items.root.message}</p>}
            <Button type="button" variant="outline" size="sm" className="justify-self-start" onClick={() => append(emptyRow)} disabled={fields.length >= 30}>
              <PlusIcon /> Add field
            </Button>
          </div>

          <div className="flex items-baseline justify-between rounded-lg bg-muted px-3 py-2.5">
            <span className="text-sm text-muted-foreground">{fields.length} row{fields.length > 1 && "s"} · Total</span>
            <span className="text-lg font-semibold num">{money.pkr(total)}</span>
          </div>
          <PoolWarning label="others" remaining={remaining} amount={total} />

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && <Loader2Icon className="animate-spin" />} Save {fields.length > 1 ? `${fields.length} rows` : "row"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
