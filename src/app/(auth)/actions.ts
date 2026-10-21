"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { phoneToEmail, toE164 } from "@/lib/phone";
import {
  attemptDelay,
  lockRemaining,
  recordFailure,
  recordSuccess,
  sleep,
} from "@/lib/auth/rate-limit";
import {
  loginSchema,
  signupSchema,
  type LoginInput,
  type SignupInput,
} from "@/lib/validation/auth";

export type AuthResult = {
  error?: string;
  fieldErrors?: Partial<Record<string, string[]>>;
};

const GENERIC_LOGIN_ERROR = "Incorrect phone number or PIN.";
const GENERIC_ERROR = "Something went wrong. Please try again.";

/** In development, append the Supabase error code so setup problems are visible. */
function devDetail(message: string, error: { code?: string; message: string }) {
  return process.env.NODE_ENV === "development"
    ? `${message} (${error.code ?? "no code"}: ${error.message})`
    : message;
}

async function clientIp(): Promise<string> {
  const h = await headers();
  return h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip") || "unknown";
}

export async function signUpAction(input: SignupInput): Promise<AuthResult> {
  const parsed = signupSchema.safeParse(input);
  if (!parsed.success) {
    return { fieldErrors: z.flattenError(parsed.error).fieldErrors };
  }

  const { name, country, phone, pin } = parsed.data;
  const e164 = toE164(country, phone);
  const supabase = await createClient();

  const { data, error } = await supabase.auth.signUp({
    email: phoneToEmail(e164),
    password: pin,
    // Read by the handle_new_user trigger to create the profile row.
    options: { data: { name, phone: e164 } },
  });

  if (error) {
    if (error.code === "user_already_exists") {
      return { fieldErrors: { phone: ["An account with this number already exists."] } };
    }
    if (error.code === "weak_password") {
      return { fieldErrors: { pin: ["Choose a less predictable PIN."] } };
    }
    console.error("signUp failed", error.code, error.status, error.message);
    // Supabase tries to email the synthetic address when "Confirm email" is on.
    if (error.code === "email_provider_disabled" || error.code === "signup_disabled") {
      return {
        error:
          "Signup is blocked by a server setting. In Supabase, turn on Authentication > Email provider (keep Confirm email off).",
      };
    }
    if (
      error.code === "over_email_send_rate_limit" ||
      error.code === "email_address_invalid" ||
      /confirmation email/i.test(error.message)
    ) {
      return {
        error:
          "Signup is blocked by a server setting. In Supabase, turn off Authentication > Email > Confirm email.",
      };
    }
    return { error: devDetail(GENERIC_ERROR, error) };
  }

  // With email confirmation on, Supabase hides duplicates by returning a user
  // with no identities. The app requires confirmation to be off.
  if (data.user && data.user.identities?.length === 0) {
    return { fieldErrors: { phone: ["An account with this number already exists."] } };
  }

  // The spec wants users to sign in explicitly after registering.
  if (data.session) await supabase.auth.signOut();

  redirect(`/login?registered=1&country=${country}&phone=${e164.slice(country.length + 1)}`);
}

export async function signInAction(input: LoginInput): Promise<AuthResult> {
  const parsed = loginSchema.safeParse(input);
  if (!parsed.success) {
    return { fieldErrors: z.flattenError(parsed.error).fieldErrors };
  }

  const e164 = toE164(parsed.data.country, parsed.data.phone);
  const keys = [`phone:${e164}`, `ip:${await clientIp()}`];

  const locked = lockRemaining(keys);
  if (locked > 0) {
    const minutes = Math.ceil(locked / 60_000);
    return { error: `Too many attempts. Try again in ${minutes} minute${minutes > 1 ? "s" : ""}.` };
  }
  await sleep(attemptDelay(keys));

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({
    email: phoneToEmail(e164),
    password: parsed.data.pin,
  });

  if (error) {
    if (error.code === "email_not_confirmed") {
      // Setup problem, not a wrong PIN, so don't count it as a failure.
      console.error("Login blocked: turn off 'Confirm email' in Supabase Auth settings.");
      return { error: "Your account isn't active yet. Ask the app owner to check the auth settings." };
    }
    if (error.code === "over_request_rate_limit") {
      return { error: "Too many attempts. Please wait a minute and try again." };
    }
    recordFailure(keys);
    return { error: GENERIC_LOGIN_ERROR };
  }

  recordSuccess(keys);
  redirect("/");
}

export async function signOutAction(): Promise<void> {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
