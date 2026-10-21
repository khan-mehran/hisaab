"use client";

import { useEffect } from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { BanknoteIcon, KeyRoundIcon, Loader2Icon, UserIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PageHeader } from "@/components/app/page-header";
import { RowActions } from "@/components/app/row-actions";
import { RateNote } from "@/components/app/rate-note";
import { Field } from "@/components/form/field";
import { MoneyInput } from "@/components/form/money-input";
import { SelectField } from "@/components/form/select-field";
import { PhoneField } from "@/components/auth/phone-field";
import { PinField } from "@/components/auth/pin-field";
import { useAction, useIncomes, useMoney, useProfile, useRate } from "@/lib/queries";
import { changePin, deleteEntity, saveIncome, updateProfile } from "../actions";
import { changePinSchema, profileSchema, type ChangePinInput, type ProfileInput } from "@/lib/validation/auth";
import { incomeSchema, type IncomeInput } from "@/lib/validation/schemas";
import { DEFAULT_COUNTRY, sanitizeLocalInput, splitE164 } from "@/lib/phone";
import { CURRENCIES, parseAmount, toPkr, toQar, type Currency } from "@/lib/currency";
import { currentMonth, monthLabel } from "@/lib/dates";

export function ProfileView() {
  return (
    <div className="grid gap-5">
      <PageHeader title="Profile" description="Your details, PIN and salary." />
      <div className="grid gap-5 lg:grid-cols-2">
        <div className="grid content-start gap-5">
          <DetailsCard />
          <PinCard />
        </div>
        <IncomeCard />
      </div>
    </div>
  );
}

function SectionTitle({ icon: Icon, children }: { icon: typeof UserIcon; children: React.ReactNode }) {
  return (
    <CardTitle className="flex items-center gap-2">
      <Icon className="size-4 text-primary" /> {children}
    </CardTitle>
  );
}

// --- Name and phone ---------------------------------------------------------

function DetailsCard() {
  const { data: profile, isLoading } = useProfile();
  const save = useAction(updateProfile, "Profile updated");
  const { register, handleSubmit, reset, setValue, getValues, control, formState: { errors, isSubmitting, isDirty } } =
    useForm<ProfileInput>({
      resolver: zodResolver(profileSchema),
      defaultValues: { name: "", country: DEFAULT_COUNTRY, phone: "" },
    });
  const country = useWatch({ control, name: "country" });

  // Fill the form once the profile loads.
  useEffect(() => {
    if (!profile) return;
    const { country, local } = profile.phone ? splitE164(profile.phone) : { country: DEFAULT_COUNTRY, local: "" };
    reset({ name: profile.name, country, phone: local });
  }, [profile, reset]);

  return (
    <Card>
      <CardHeader>
        <SectionTitle icon={UserIcon}>Personal details</SectionTitle>
        <CardDescription>Your phone number is also your login.</CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="grid gap-4"><Skeleton className="h-16" /><Skeleton className="h-16" /></div>
        ) : (
          <form
            noValidate
            className="grid gap-4"
            onSubmit={handleSubmit(async (values) => {
              await save.mutateAsync([values]).catch(() => {});
            })}
          >
            <Field label="Full name" htmlFor="name" error={errors.name?.message}>
              <Input id="name" autoComplete="name" className="h-10" aria-invalid={!!errors.name || undefined} {...register("name")} />
            </Field>
            <Field label="Phone number" htmlFor="phone" error={errors.phone?.message}>
              <PhoneField
                country={country}
                onCountryChange={(c) => {
                  setValue("country", c, { shouldDirty: true });
                  setValue("phone", sanitizeLocalInput(c, getValues("phone")), { shouldDirty: true });
                }}
                invalid={!!errors.phone}
                inputProps={{ id: "phone", ...register("phone") }}
              />
            </Field>
            <Button type="submit" className="h-10 justify-self-start" disabled={isSubmitting || !isDirty}>
              {isSubmitting && <Loader2Icon className="animate-spin" />} Save details
            </Button>
          </form>
        )}
      </CardContent>
    </Card>
  );
}

// --- PIN --------------------------------------------------------------------

function PinCard() {
  const save = useAction(changePin, "PIN changed");
  const { register, handleSubmit, reset, setError, formState: { errors, isSubmitting } } = useForm<ChangePinInput>({
    resolver: zodResolver(changePinSchema),
    defaultValues: { currentPin: "", newPin: "", confirmPin: "" },
  });

  return (
    <Card>
      <CardHeader>
        <SectionTitle icon={KeyRoundIcon}>Change PIN</SectionTitle>
        <CardDescription>Enter your current PIN to set a new 6-digit PIN.</CardDescription>
      </CardHeader>
      <CardContent>
        <form
          noValidate
          className="grid gap-4"
          onSubmit={handleSubmit(async (values) => {
            try {
              await save.mutateAsync([values]);
              reset();
            } catch (e) {
              const fe = (e as { fieldErrors?: Record<string, string[]> }).fieldErrors;
              if (fe?.currentPin) setError("currentPin", { message: fe.currentPin[0] });
            }
          })}
        >
          <Field label="Current PIN" htmlFor="currentPin" error={errors.currentPin?.message}>
            <PinField id="currentPin" autoComplete="current-password" invalid={!!errors.currentPin} {...register("currentPin")} />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="New PIN" htmlFor="newPin" error={errors.newPin?.message}>
              <PinField id="newPin" autoComplete="new-password" invalid={!!errors.newPin} {...register("newPin")} />
            </Field>
            <Field label="Confirm new PIN" htmlFor="confirmPin" error={errors.confirmPin?.message}>
              <PinField id="confirmPin" autoComplete="new-password" invalid={!!errors.confirmPin} {...register("confirmPin")} />
            </Field>
          </div>
          <Button type="submit" variant="outline" className="h-10 justify-self-start" disabled={isSubmitting}>
            {isSubmitting && <Loader2Icon className="animate-spin" />} Change PIN
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

// --- Income -----------------------------------------------------------------

function IncomeCard() {
  const { data: profile } = useProfile();
  const { data: rate } = useRate();
  const incomes = useIncomes();
  const money = useMoney();
  const save = useAction(saveIncome, "Salary saved");
  const remove = useAction(deleteEntity, "Salary removed");

  const { register, handleSubmit, setValue, control, formState: { errors, isSubmitting } } = useForm<IncomeInput>({
    resolver: zodResolver(incomeSchema, undefined, { raw: true }),
    defaultValues: { month: currentMonth(), amount: "", currency: "QAR" },
  });
  const [amount, currency, month] = useWatch({ control, name: ["amount", "currency", "month"] });

  // Default the currency to the user's preference, then prefill a saved salary for the chosen month.
  useEffect(() => {
    if (profile) setValue("currency", profile.salary_currency);
  }, [profile, setValue]);
  useEffect(() => {
    const existing = incomes.data?.find((i) => i.month.slice(0, 7) === month);
    if (existing) {
      setValue("amount", String(Number(existing.amount)));
      setValue("currency", existing.currency);
    }
  }, [incomes.data, month, setValue]);

  const value = parseAmount(amount as string);
  const cur = currency as Currency;
  const valid = rate && Number.isFinite(value) && value > 0;

  return (
    <Card id="income" className="scroll-mt-20">
      <CardHeader>
        <SectionTitle icon={BanknoteIcon}>Income</SectionTitle>
        <CardDescription>Your salary applies from the chosen month until you change it.</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-6">
        <form
          noValidate
          className="grid gap-4"
          onSubmit={handleSubmit(async (values) => {
            await save.mutateAsync([values]).catch(() => {});
          })}
        >
          <Field label="Applies from" htmlFor="month" error={errors.month?.message}>
            <Input id="month" type="month" max={currentMonth()} className="h-10" {...register("month")} />
          </Field>
          <Field label="Salary" htmlFor="amount" error={errors.amount?.message}>
            <div className="flex gap-2">
              <div className="flex-1">
                <MoneyInput id="amount" currency={cur} invalid={!!errors.amount} {...register("amount")} />
              </div>
              <SelectField
                value={cur}
                onChange={(v) => setValue("currency", v as Currency)}
                options={CURRENCIES.map((c) => ({ value: c, label: c }))}
                className="w-24"
              />
            </div>
          </Field>

          {/* Live conversion shown alongside the salary input. */}
          <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1 rounded-lg bg-muted px-3 py-2.5">
            <span className="text-xs text-muted-foreground">Equals</span>
            <span className="text-lg font-semibold tracking-tight num">
              {valid ? money.pkr(toPkr(value, cur, rate)) : "Rs 0"}
            </span>
            {valid && cur !== "QAR" && (
              <span className="text-sm text-muted-foreground num">{money.qar(toQar(value, cur, rate))}</span>
            )}
            <RateNote className="w-full" />
          </div>

          <Button type="submit" className="h-10 justify-self-start" disabled={isSubmitting}>
            {isSubmitting && <Loader2Icon className="animate-spin" />} Save salary
          </Button>
        </form>

        <div className="grid gap-2">
          <p className="text-sm font-medium">Salary history</p>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>From</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead className="text-right">In QAR</TableHead>
                <TableHead className="w-10" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {incomes.isLoading ? (
                <TableRow><TableCell colSpan={4}><Skeleton className="h-4" /></TableCell></TableRow>
              ) : incomes.data?.length ? (
                incomes.data.map((i) => (
                  <TableRow key={i.id}>
                    <TableCell>{monthLabel(i.month.slice(0, 7))}</TableCell>
                    <TableCell className="text-right num">{money.format(Number(i.amount), i.currency)}</TableCell>
                    <TableCell className="text-right num">{money.qar(Number(i.amount_qar))}</TableCell>
                    <TableCell>
                      <RowActions
                        deleteTitle="Remove this salary?"
                        deleteDescription="Months from here on will use the previous salary, if any."
                        onDelete={() => remove.mutateAsync(["incomes", i.id]).then(() => true, () => false)}
                      />
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow className="hover:bg-transparent">
                  <TableCell colSpan={4} className="py-6 text-center text-sm text-muted-foreground">No salary saved yet.</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
