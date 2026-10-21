import type { PostgrestError } from "@supabase/supabase-js";
import { z } from "zod";

/** What every data server action returns. Never contains raw database errors. */
export type ActionResult<T = undefined> =
  | { ok: true; data?: T }
  | { ok: false; error: string; fieldErrors?: Partial<Record<string, string[]>> };

export function fail(error: string, fieldErrors?: Partial<Record<string, string[]>>): ActionResult<never> {
  return { ok: false, error, fieldErrors };
}

export function validationFail(error: z.ZodError): ActionResult<never> {
  const flat = z.flattenError(error);
  const first = flat.formErrors[0] ?? Object.values(flat.fieldErrors).flat()[0];
  return fail(first ?? "Please check the form", flat.fieldErrors as Partial<Record<string, string[]>>);
}

/** Map a Postgres error to a safe, friendly message and log the details server-side. */
export function dbFail(error: PostgrestError, context: string): ActionResult<never> {
  console.error(`[db] ${context}:`, error.code, error.message);
  switch (error.code) {
    case "P0001": // raised by our own triggers/functions with user-facing text
      return fail(error.message);
    case "23505":
      return fail("This entry already exists.");
    case "23503":
      return fail("The linked record no longer exists.");
    case "23514":
    case "22P02":
    case "22003":
      return fail("Some values aren't allowed. Please check the form.");
    case "42501":
      return fail("You don't have permission to do that.");
    default:
      return fail("Couldn't save. Please try again.");
  }
}
