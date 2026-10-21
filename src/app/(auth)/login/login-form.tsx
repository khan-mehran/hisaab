"use client";

import Link from "next/link";
import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { CircleCheckIcon, Loader2Icon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/form/field";
import { PhoneField } from "@/components/auth/phone-field";
import { PinField } from "@/components/auth/pin-field";
import { applyServerErrors } from "@/components/auth/use-server-errors";
import { COUNTRY_CODES, DEFAULT_COUNTRY, sanitizeLocalInput, type CountryCode } from "@/lib/phone";
import { loginSchema, type LoginInput } from "@/lib/validation/auth";
import { signInAction } from "../actions";

export function LoginForm() {
  const params = useSearchParams();
  const registered = params.get("registered") === "1";
  const countryParam = params.get("country") as CountryCode | null;

  const [formError, setFormError] = useState<string>();
  const {
    register,
    handleSubmit,
    setValue,
    getValues,
    control,
    setError,
    resetField,
    formState: { errors, isSubmitting },
  } = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      // Prefilled after signup so the user only has to type their PIN.
      country: countryParam && COUNTRY_CODES.includes(countryParam) ? countryParam : DEFAULT_COUNTRY,
      phone: params.get("phone") ?? "",
      pin: "",
    },
  });
  const country = useWatch({ control, name: "country" });

  const onSubmit = handleSubmit(async (values) => {
    setFormError(undefined);
    // Redirects to the dashboard on success, so a result only comes back on failure.
    const result = await signInAction(values);
    if (result?.error) {
      setFormError(result.error);
      resetField("pin");
    }
    if (result) applyServerErrors(result, setError);
  });

  return (
    <form onSubmit={onSubmit} noValidate className="grid gap-4">
      {registered && !formError && (
        <p className="flex items-center gap-2 rounded-lg bg-success/10 px-3 py-2 text-sm text-success">
          <CircleCheckIcon className="size-4 shrink-0" />
          Account created. Sign in with your PIN.
        </p>
      )}

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

      <Field label="PIN" htmlFor="pin" error={errors.pin?.message}>
        <PinField
          id="pin"
          autoComplete="current-password"
          autoFocus={registered}
          invalid={!!errors.pin}
          {...register("pin")}
        />
      </Field>

      {formError && (
        <p role="alert" className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {formError}
        </p>
      )}

      <Button type="submit" size="lg" className="h-10 w-full" disabled={isSubmitting}>
        {isSubmitting && <Loader2Icon className="animate-spin" />}
        Sign in
      </Button>

      <p className="text-center text-sm text-muted-foreground">
        New here?{" "}
        <Link href="/signup" className="font-medium text-primary hover:underline">
          Create an account
        </Link>
      </p>
    </form>
  );
}
