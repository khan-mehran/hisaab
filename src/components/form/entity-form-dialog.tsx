"use client";

import { useEffect } from "react";
import { Controller, useForm, useWatch, type FieldValues } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import type { z } from "zod";
import { Loader2Icon } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Field } from "./field";
import { MoneyInput } from "./money-input";
import { SelectField, type Option } from "./select-field";
import { CategoryField } from "./category-field";
import { useMoney, useRate } from "@/lib/queries";
import { parseAmount, qarToPkr, type Currency } from "@/lib/currency";
import { cn } from "@/lib/utils";

/** Declarative description of one form control. */
export type FieldDef = {
  name: string;
  label: string;
  /** Lay out two "half" fields side by side on wider screens. */
  half?: boolean;
  hint?: string;
  placeholder?: string;
} & (
  | { type: "text" | "date" | "month" }
  | { type: "money"; currency: Currency; /** Show "≈ Rs …" under a QAR amount. */ convert?: boolean }
  | { type: "select"; options: Option[] }
  | { type: "category"; presets: readonly string[] }
);

type Props<V extends FieldValues> = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  schema: z.ZodType;
  fields: FieldDef[];
  defaultValues: V;
  /** Receives the raw form values (the server re-validates). Resolve true to close. */
  onSubmit: (values: V) => Promise<boolean>;
  /** Extra live content under the fields, e.g. a pool warning. */
  renderExtra?: (values: V) => React.ReactNode;
  submitLabel?: string;
};

/**
 * Modal form generated from field definitions. Used by every page with a
 * simple "one form, one row" entry so validation, layout and pending states
 * stay consistent.
 */
export function EntityFormDialog<V extends FieldValues>({
  open,
  onOpenChange,
  title,
  description,
  schema,
  fields,
  defaultValues,
  onSubmit,
  renderExtra,
  submitLabel = "Save",
}: Props<V>) {
  const form = useForm<V>({
    // raw: hand the untransformed values to onSubmit; the server action parses them.
    resolver: zodResolver(schema as never, undefined, { raw: true }) as never,
    defaultValues: defaultValues as never,
  });
  const {
    register,
    control,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = form;
  const values = useWatch({ control }) as V;

  // Load fresh values each time the dialog opens (add vs edit).
  useEffect(() => {
    if (open) reset(defaultValues as never);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- reset only when opening
  }, [open]);

  const submit = handleSubmit(async (v) => {
    if (await onSubmit(v as V)) onOpenChange(false);
  });

  return (
    <Dialog open={open} onOpenChange={(next) => !isSubmitting && onOpenChange(next)}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description && <DialogDescription>{description}</DialogDescription>}
        </DialogHeader>

        <form onSubmit={submit} noValidate className="grid gap-4">
          <div className="grid grid-cols-2 gap-4">
            {fields.map((f) => {
              const error = (errors[f.name]?.message as string | undefined) ?? undefined;
              const id = `f-${f.name}`;
              return (
                <div key={f.name} className={cn(f.half ? "col-span-2 sm:col-span-1" : "col-span-2")}>
                  <Field label={f.label} htmlFor={id} error={error} hint={f.hint}>
                    {f.type === "text" && (
                      <Input id={id} placeholder={f.placeholder} aria-invalid={!!error || undefined} className="h-10" {...register(f.name as never)} />
                    )}
                    {(f.type === "date" || f.type === "month") && (
                      <Input id={id} type={f.type} aria-invalid={!!error || undefined} className="h-10" {...register(f.name as never)} />
                    )}
                    {f.type === "money" && (
                      <>
                        <MoneyInput id={id} currency={f.currency} invalid={!!error} {...register(f.name as never)} />
                        {f.convert && f.currency === "QAR" && <PkrHint qar={values?.[f.name]} />}
                      </>
                    )}
                    {f.type === "select" && (
                      <Controller
                        control={control}
                        name={f.name as never}
                        render={({ field }) => (
                          <SelectField id={id} value={field.value} onChange={field.onChange} options={f.options} invalid={!!error} placeholder={f.placeholder} />
                        )}
                      />
                    )}
                    {f.type === "category" && (
                      <Controller
                        control={control}
                        name={f.name as never}
                        render={({ field }) => (
                          // Remount per dialog open so the custom toggle matches the row being edited.
                          <CategoryField key={String(open)} id={id} value={field.value ?? ""} onChange={field.onChange} presets={f.presets} invalid={!!error} />
                        )}
                      />
                    )}
                  </Field>
                </div>
              );
            })}
          </div>

          {renderExtra?.(values)}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && <Loader2Icon className="animate-spin" />}
              {submitLabel}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/** Live PKR equivalent under a QAR input. */
export function PkrHint({ qar }: { qar: unknown }) {
  const { data: rate } = useRate();
  const money = useMoney();
  const value = parseAmount(qar as string);
  if (!rate || !Number.isFinite(value) || value <= 0) return null;
  return (
    <p className="text-xs text-muted-foreground num">
      ≈ <span className="font-medium text-foreground">{money.pkr(qarToPkr(value, rate.qarPkr))}</span>
    </p>
  );
}
