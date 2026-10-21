import { z } from "zod";
import { COUNTRIES, COUNTRY_CODES, isValidLocalNumber } from "@/lib/phone";

/** Shared by client forms and server actions so both validate identically. */

const country = z.enum(COUNTRY_CODES as [keyof typeof COUNTRIES, ...(keyof typeof COUNTRIES)[]]);

export const pinSchema = z
  .string()
  .regex(/^\d{6}$/, { error: "PIN must be exactly 6 digits" });

const phoneFields = {
  country,
  phone: z.string().trim().min(1, { error: "Enter your phone number" }),
};

function checkPhone(
  data: { country: keyof typeof COUNTRIES; phone: string },
  ctx: z.RefinementCtx,
) {
  if (data.phone && !isValidLocalNumber(data.country, data.phone)) {
    ctx.addIssue({
      code: "custom",
      path: ["phone"],
      message: `Enter a valid ${COUNTRIES[data.country].name} number (${COUNTRIES[data.country].localLength} digits)`,
    });
  }
}

export const loginSchema = z
  .object({ ...phoneFields, pin: pinSchema })
  .superRefine(checkPhone);

export const signupSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(2, { error: "Enter your full name" })
      .max(80, { error: "Name is too long" }),
    ...phoneFields,
    pin: pinSchema,
    confirmPin: z.string(),
  })
  .superRefine(checkPhone)
  .refine((d) => d.pin === d.confirmPin, {
    path: ["confirmPin"],
    error: "PINs do not match",
  });

export type LoginInput = z.infer<typeof loginSchema>;
export type SignupInput = z.infer<typeof signupSchema>;

export const profileSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(2, { error: "Enter your full name" })
      .max(80, { error: "Name is too long" }),
    ...phoneFields,
  })
  .superRefine(checkPhone);

export const changePinSchema = z
  .object({
    currentPin: pinSchema,
    newPin: pinSchema,
    confirmPin: z.string(),
  })
  .refine((d) => d.newPin === d.confirmPin, { path: ["confirmPin"], error: "PINs do not match" })
  .refine((d) => d.newPin !== d.currentPin, { path: ["newPin"], error: "New PIN must be different" });

export type ProfileInput = z.infer<typeof profileSchema>;
export type ChangePinInput = z.infer<typeof changePinSchema>;
