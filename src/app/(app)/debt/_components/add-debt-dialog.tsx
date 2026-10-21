"use client";

import { useEffect, useId, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Loader2Icon, UserCheckIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogMedia,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Field } from "@/components/form/field";
import { MoneyInput } from "@/components/form/money-input";
import { useAction } from "@/lib/queries";
import { saveDebt } from "../../actions";
import { debtCreateSchema, type DebtCreateInput } from "@/lib/validation/schemas";
import type { DebtKind } from "@/lib/calc/debts";
import { todayISO } from "@/lib/dates";
import { DEBT_TEXT } from "./debt-text";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  kind: DebtKind;
  /** Adding more for a known person (person page): the name field is hidden. */
  person?: { id: string; name: string };
  /** Existing names, offered as suggestions while typing. */
  names?: string[];
  onSaved?: (personId: string) => void;
};

/**
 * Add a debt by name. If the name already exists the user is asked whether
 * it's the same person: Yes adds to that person, No asks for another name.
 */
export function AddDebtDialog({ open, onOpenChange, kind, person, names = [], onSaved }: Props) {
  const text = DEBT_TEXT[kind];
  const listId = useId();
  const save = useAction(saveDebt);
  const [confirm, setConfirm] = useState<{ personId: string; name: string; values: DebtCreateInput } | null>(null);
  const [saving, setSaving] = useState(false);

  const blank = (): DebtCreateInput => ({ kind, debt_date: todayISO(), person_name: "", amount_pkr: "", note: "" });
  const { register, handleSubmit, reset, setError, setFocus, formState: { errors, isSubmitting } } = useForm<DebtCreateInput>({
    resolver: zodResolver(debtCreateSchema, undefined, { raw: true }),
    defaultValues: blank(),
  });

  useEffect(() => {
    if (open) reset({ ...blank(), person_id: person?.id });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- reset only when opening
  }, [open]);

  const finish = (personId: string) => {
    toast.success(`${text.debtEntry} amount saved`);
    onOpenChange(false);
    onSaved?.(personId);
  };

  const submit = handleSubmit(async (values) => {
    const result = await save.mutateAsync([{ ...values, kind, person_id: person?.id }]).catch(() => null);
    if (!result?.ok) return;
    if (result.data?.confirm) setConfirm({ ...result.data.confirm, values });
    else if (result.data?.personId) finish(result.data.personId);
  });

  const samePerson = async () => {
    if (!confirm) return;
    setSaving(true);
    try {
      const result = await save.mutateAsync([{ ...confirm.values, kind, person_id: confirm.personId, person_name: undefined }]);
      if (result.ok) {
        setConfirm(null);
        finish(confirm.personId);
      }
    } catch {
      // useAction already showed the error
    } finally {
      setSaving(false);
    }
  };

  const differentPerson = () => {
    const name = confirm?.name ?? "";
    setConfirm(null);
    setError("person_name", { message: `Use a different name to tell them apart, e.g. "${name.split(" ")[0]} Cousin".` });
    setTimeout(() => setFocus("person_name", { shouldSelect: true }), 50);
  };

  return (
    <>
      <Dialog open={open} onOpenChange={(next) => !isSubmitting && !confirm && onOpenChange(next)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{person ? `${text.addMore} · ${person.name}` : text.add}</DialogTitle>
            <DialogDescription>
              {kind === "taken" ? "Money you borrowed." : "Money you lent."} Adding to an existing name keeps all their history together.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={submit} noValidate className="grid gap-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2 sm:col-span-1">
                <Field label="Date" htmlFor="debt_date" error={errors.debt_date?.message}>
                  <Input id="debt_date" type="date" className="h-10" {...register("debt_date")} />
                </Field>
              </div>
              <div className="col-span-2 sm:col-span-1">
                <Field label="Amount" htmlFor="amount_pkr" error={errors.amount_pkr?.message}>
                  <MoneyInput id="amount_pkr" currency="PKR" invalid={!!errors.amount_pkr} {...register("amount_pkr")} />
                </Field>
              </div>
            </div>
            {!person && (
              <Field label="Name" htmlFor="person_name" error={errors.person_name?.message} hint="Pick an existing name to add to that person.">
                <Input
                  id="person_name"
                  list={listId}
                  autoComplete="off"
                  placeholder="e.g. Hamza"
                  aria-invalid={!!errors.person_name || undefined}
                  className="h-10"
                  {...register("person_name")}
                />
                <datalist id={listId}>
                  {names.map((n) => (
                    <option key={n} value={n} />
                  ))}
                </datalist>
              </Field>
            )}
            <Field label="Note" htmlFor="note" error={errors.note?.message}>
              <Input id="note" placeholder="Optional, e.g. for bike repair" className="h-10" {...register("note")} />
            </Field>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && <Loader2Icon className="animate-spin" />} Save
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!confirm} onOpenChange={(o) => !o && !saving && differentPerson()}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogMedia className="bg-primary/10 text-primary">
              <UserCheckIcon />
            </AlertDialogMedia>
            <AlertDialogTitle>Is this the same person?</AlertDialogTitle>
            <AlertDialogDescription>
              <b>{confirm?.name}</b> is already in your list. Add this amount to their history?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <Button variant="outline" onClick={differentPerson} disabled={saving}>
              No, someone else
            </Button>
            <Button onClick={samePerson} disabled={saving}>
              {saving && <Loader2Icon className="animate-spin" />} Yes, same person
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
