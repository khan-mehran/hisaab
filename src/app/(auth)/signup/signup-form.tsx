"use client";

import Link from "next/link";
import { useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2Icon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field } from "@/components/form/field";
import { PhoneField } from "@/components/auth/phone-field";
import { PinField } from "@/components/auth/pin-field";
import { applyServerErrors } from "@/components/auth/use-server-errors";
import { DEFAULT_COUNTRY, sanitizeLocalInput } from "@/lib/phone";
import { signupSchema, type SignupInput } from "@/lib/validation/auth";
import { signUpAction } from "../actions";

export function SignupForm() {
  const [formError, setFormError] = useState<string>();
  const {
    register,
    handleSubmit,
    setValue,
    getValues,
    control,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<SignupInput>({
    resolver: zodResolver(signupSchema),
    defaultValues: { name: "", country: DEFAULT_COUNTRY, phone: "", pin: "", confirmPin: "" },
  });
  const country = useWatch({ control, name: "country" });

  const onSubmit = handleSubmit(async (values) => {
    setFormError(undefined);
    // Redirects to /login on success, so a result only comes back on failure.
    const result = await signUpAction(values);
    if (result?.error) setFormError(result.error);
    if (result) applyServerErrors(result, setError);
  });

  return (
    <form onSubmit={onSubmit} noValidate className="grid gap-4">
      <Field label="Full name" htmlFor="name" error={errors.name?.message}>
        <Input
          id="name"
          autoComplete="name"
          placeholder="Muhammad Ali"
          aria-invalid={!!errors.name || undefined}
          className="h-10"
          {...register("name")}
        />
      </Field>

      <Field label="Phone number" htmlFor="phone" error={errors.phone?.message}>
        <PhoneField
          country={country}
          onCountryChange={(c) => {
            setValue("country", c);
            // Trim the number if switching to a country with fewer digits.
            setValue("phone", sanitizeLocalInput(c, getValues("phone")), {
              shouldValidate: !!errors.phone,
            });
          }}
          invalid={!!errors.phone}
          inputProps={{ id: "phone", ...register("phone") }}
        />
      </Field>

      <Field
        label="PIN"
        htmlFor="pin"
        error={errors.pin?.message}
        hint="6 digits. You'll use it to sign in."
      >
        <PinField id="pin" autoComplete="new-password" invalid={!!errors.pin} {...register("pin")} />
      </Field>

      <Field label="Confirm PIN" htmlFor="confirmPin" error={errors.confirmPin?.message}>
        <PinField
          id="confirmPin"
          autoComplete="new-password"
          invalid={!!errors.confirmPin}
          {...register("confirmPin")}
        />
      </Field>

      {formError && (
        <p role="alert" className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {formError}
        </p>
      )}

      <Button type="submit" size="lg" className="h-10 w-full" disabled={isSubmitting}>
        {isSubmitting && <Loader2Icon className="animate-spin" />}
        Create account
      </Button>

      <p className="text-center text-sm text-muted-foreground">
        Already have an account?{" "}
        <Link href="/login" className="font-medium text-primary hover:underline">
          Sign in
        </Link>
      </p>
    </form>
  );
}
