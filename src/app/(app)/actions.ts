"use server";

import { updateTag } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { getRate, RATE_CACHE_TAG } from "@/lib/rates/get-rate";
import { toQar } from "@/lib/currency";
import { phoneToEmail, toE164 } from "@/lib/phone";
import { DELETABLE, ENTITIES, type DeletableTable, type EntityInput, type EntityName } from "@/lib/entities";
import { dbFail, fail, validationFail, type ActionResult } from "@/lib/action-result";
import {
  debtCreateSchema,
  debtUpdateSchema,
  incomeSchema,
  otherBatchSchema,
  personName,
  sendSchema,
  settingsSchema,
  type DebtCreateInput,
  type DebtUpdateInput,
  type IncomeInput,
  type OtherBatchInput,
  type SendInput,
  type SettingsInput,
} from "@/lib/validation/schemas";
import {
  changePinSchema,
  profileSchema,
  type ChangePinInput,
  type ProfileInput,
} from "@/lib/validation/auth";
import { attemptDelay, lockRemaining, recordFailure, recordSuccess, sleep } from "@/lib/auth/rate-limit";

/**
 * All writes go through these server actions: input is validated with zod
 * on the server, Row Level Security scopes every query to the caller, and
 * errors are mapped to friendly messages.
 */

const SESSION_EXPIRED = "Your session has expired. Please sign in again.";

/** Supabase client plus the signed-in user's id, or null when signed out. */
async function session() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const userId = data?.claims?.sub;
  return userId ? { supabase, userId, email: data.claims.email as string | undefined } : null;
}

const uuid = z.uuid();

// The generic actions work across tables whose types differ, so the typed
// client is narrowed to a loose shape here. Inputs are still zod-validated.
type LooseTable = {
  insert(values: unknown): PromiseLike<{ error: import("@supabase/supabase-js").PostgrestError | null }>;
  update(values: unknown): {
    eq(column: string, value: string): PromiseLike<{ error: import("@supabase/supabase-js").PostgrestError | null; count: number | null }>;
  };
  delete(options?: { count: "exact" }): {
    eq(column: string, value: string): PromiseLike<{ error: import("@supabase/supabase-js").PostgrestError | null; count: number | null }>;
  };
};

// ---------------------------------------------------------------------------
// Generic create / update / delete
// ---------------------------------------------------------------------------

export async function saveEntity<E extends EntityName>(
  entity: E,
  input: EntityInput<E>,
  id?: string,
): Promise<ActionResult> {
  if (!(entity in ENTITIES)) return fail("Unknown record type.");
  if (id !== undefined && !uuid.safeParse(id).success) return fail("Invalid record.");

  const parsed = ENTITIES[entity].safeParse(input);
  if (!parsed.success) return validationFail(parsed.error);

  const s = await session();
  if (!s) return fail(SESSION_EXPIRED);

  const table = s.supabase.from(entity) as unknown as LooseTable;
  const { error } = id ? await table.update(parsed.data).eq("id", id) : await table.insert(parsed.data);
  return error ? dbFail(error, `save ${entity}`) : { ok: true };
}

export async function deleteEntity(table: DeletableTable, id: string): Promise<ActionResult> {
  if (!(DELETABLE as readonly string[]).includes(table)) return fail("Unknown record type.");
  if (!uuid.safeParse(id).success) return fail("Invalid record.");

  const s = await session();
  if (!s) return fail(SESSION_EXPIRED);

  const { error, count } = await (s.supabase.from(table) as unknown as LooseTable)
    .delete({ count: "exact" })
    .eq("id", id);
  if (error) return dbFail(error, `delete ${table}`);
  return count === 0 ? fail("That entry no longer exists.") : { ok: true };
}

// ---------------------------------------------------------------------------
// Sends: the exchange rate is locked server-side when the send is created
// ---------------------------------------------------------------------------

export async function saveSend(input: SendInput, id?: string): Promise<ActionResult> {
  if (id !== undefined && !uuid.safeParse(id).success) return fail("Invalid record.");
  const parsed = sendSchema.safeParse(input);
  if (!parsed.success) return validationFail(parsed.error);

  const s = await session();
  if (!s) return fail(SESSION_EXPIRED);

  if (id) {
    // Editing keeps the original rate so history never changes.
    const { error } = await s.supabase.from("sends").update(parsed.data).eq("id", id);
    return error ? dbFail(error, "update send") : { ok: true };
  }

  const rate = await getRate();
  if (!rate) return fail("Exchange rate is unavailable right now. Please try again shortly.");

  const { error } = await s.supabase
    .from("sends")
    .insert({ ...parsed.data, rate_qar_pkr: rate.qarPkr });
  return error ? dbFail(error, "insert send") : { ok: true };
}

// ---------------------------------------------------------------------------
// Others: several label/amount rows saved together
// ---------------------------------------------------------------------------

export async function saveOthersBatch(input: OtherBatchInput): Promise<ActionResult> {
  const parsed = otherBatchSchema.safeParse(input);
  if (!parsed.success) return validationFail(parsed.error);

  const s = await session();
  if (!s) return fail(SESSION_EXPIRED);

  const batchId = crypto.randomUUID();
  const rows = parsed.data.items.map((item) => ({
    entry_date: parsed.data.entry_date,
    batch_id: batchId,
    label: item.label,
    amount_pkr: item.amount_pkr,
  }));
  const { error } = await s.supabase.from("other_entries").insert(rows);
  return error ? dbFail(error, "insert others batch") : { ok: true };
}

// ---------------------------------------------------------------------------
// Debts: grouped by person. Payments live on the person, not on one debt.
// ---------------------------------------------------------------------------

/** Names match ignoring case and surrounding spaces, like the database index. */
const sameName = (a: string, b: string) => a.trim().toLowerCase() === b.trim().toLowerCase();

export type SaveDebtResult = ActionResult<{
  /** Set when the name matches an existing person and the user must confirm. */
  confirm?: { personId: string; name: string };
  personId?: string;
}>;

/**
 * Add a debt. With a name that already exists, nothing is saved and the
 * caller is asked to confirm it's the same person (then call again with
 * person_id). A new name creates the person first.
 */
export async function saveDebt(input: DebtCreateInput): Promise<SaveDebtResult> {
  const parsed = debtCreateSchema.safeParse(input);
  if (!parsed.success) return validationFail(parsed.error);

  const s = await session();
  if (!s) return fail(SESSION_EXPIRED);

  const { person_id, person_name, ...debt } = parsed.data;
  let personId = person_id;

  if (!personId) {
    const name = person_name!.replace(/\s+/g, " ").trim();
    const { data: people, error } = await s.supabase.from("debt_people").select("id, name");
    if (error) return dbFail(error, "load people");

    const existing = people.find((p) => sameName(p.name, name));
    if (existing) return { ok: true, data: { confirm: { personId: existing.id, name: existing.name } } };

    const { data: created, error: createError } = await s.supabase
      .from("debt_people")
      .insert({ name })
      .select("id")
      .single();
    if (createError) {
      if (createError.code === "23505") return fail("That name was just added. Please try again.");
      return dbFail(createError, "create person");
    }
    personId = created.id;
  }

  const { error } = await s.supabase.from("debts").insert({ ...debt, person_id: personId });
  return error ? dbFail(error, "insert debt") : { ok: true, data: { personId } };
}

export async function updateDebt(id: string, input: DebtUpdateInput): Promise<ActionResult> {
  if (!uuid.safeParse(id).success) return fail("Invalid record.");
  const parsed = debtUpdateSchema.safeParse(input);
  if (!parsed.success) return validationFail(parsed.error);

  const s = await session();
  if (!s) return fail(SESSION_EXPIRED);

  const { error } = await s.supabase.from("debts").update(parsed.data).eq("id", id);
  return error ? dbFail(error, "update debt") : { ok: true };
}

export async function renamePerson(id: string, name: string): Promise<ActionResult> {
  if (!uuid.safeParse(id).success) return fail("Invalid record.");
  const parsed = personName.safeParse(name);
  if (!parsed.success) return validationFail(parsed.error);

  const s = await session();
  if (!s) return fail(SESSION_EXPIRED);

  const { error } = await s.supabase
    .from("debt_people")
    .update({ name: parsed.data.replace(/\s+/g, " ") })
    .eq("id", id);
  if (error?.code === "23505") return fail("Another person already has this name.", { name: ["Another person already has this name."] });
  return error ? dbFail(error, "rename person") : { ok: true };
}

// ---------------------------------------------------------------------------
// Income (salary): converted to QAR on the server with the current rate
// ---------------------------------------------------------------------------

export async function saveIncome(input: IncomeInput): Promise<ActionResult> {
  const parsed = incomeSchema.safeParse(input);
  if (!parsed.success) return validationFail(parsed.error);

  const s = await session();
  if (!s) return fail(SESSION_EXPIRED);

  const rate = await getRate();
  if (!rate) return fail("Exchange rate is unavailable right now. Please try again shortly.");

  const { month, amount, currency } = parsed.data;
  const { error } = await s.supabase.from("incomes").upsert(
    {
      user_id: s.userId,
      month,
      amount,
      currency,
      amount_qar: toQar(amount, currency, rate),
      rate_qar_pkr: rate.qarPkr,
    },
    { onConflict: "user_id,month" },
  );
  return error ? dbFail(error, "save income") : { ok: true };
}

// ---------------------------------------------------------------------------
// Profile, PIN and settings
// ---------------------------------------------------------------------------

export async function updateProfile(input: ProfileInput): Promise<ActionResult> {
  const parsed = profileSchema.safeParse(input);
  if (!parsed.success) return validationFail(parsed.error);

  const s = await session();
  if (!s) return fail(SESSION_EXPIRED);

  const phone = toE164(parsed.data.country, parsed.data.phone);
  const email = phoneToEmail(phone);

  // A new phone means a new login email. With email confirmation off,
  // Supabase applies the change immediately.
  if (email !== s.email) {
    const { error } = await s.supabase.auth.updateUser({ email, data: { phone } });
    if (error) {
      if (error.code === "email_exists" || error.code === "user_already_exists") {
        return fail("Another account already uses this number.", { phone: ["Another account already uses this number."] });
      }
      console.error("[auth] update email:", error.code, error.message);
      return fail("Couldn't change your phone number. Please try again.");
    }
  }

  const { error } = await s.supabase
    .from("profiles")
    .update({ name: parsed.data.name, phone })
    .eq("id", s.userId);
  return error ? dbFail(error, "update profile") : { ok: true };
}

export async function changePin(input: ChangePinInput): Promise<ActionResult> {
  const parsed = changePinSchema.safeParse(input);
  if (!parsed.success) return validationFail(parsed.error);

  const s = await session();
  if (!s?.email) return fail(SESSION_EXPIRED);

  const keys = [`pin-change:${s.userId}`];
  if (lockRemaining(keys) > 0) return fail("Too many attempts. Try again in a few minutes.");
  await sleep(attemptDelay(keys));

  // Re-authenticate with the current PIN before allowing the change.
  const { error: authError } = await s.supabase.auth.signInWithPassword({
    email: s.email,
    password: parsed.data.currentPin,
  });
  if (authError) {
    recordFailure(keys);
    return fail("Current PIN is incorrect.", { currentPin: ["Current PIN is incorrect."] });
  }
  recordSuccess(keys);

  const { error } = await s.supabase.auth.updateUser({ password: parsed.data.newPin });
  if (error) {
    console.error("[auth] change pin:", error.code, error.message);
    if (error.code === "same_password") return fail("New PIN must be different.", { newPin: ["New PIN must be different."] });
    return fail("Couldn't change your PIN. Please try again.");
  }
  return { ok: true };
}

export async function updateSettings(input: SettingsInput): Promise<ActionResult> {
  const parsed = settingsSchema.safeParse(input);
  if (!parsed.success) return validationFail(parsed.error);

  const s = await session();
  if (!s) return fail(SESSION_EXPIRED);

  const { error } = await s.supabase.from("profiles").update(parsed.data).eq("id", s.userId);
  return error ? dbFail(error, "update settings") : { ok: true };
}

/** Drop the cached provider rate so the next /api/rate call fetches a fresh one. */
export async function refreshRate(): Promise<ActionResult> {
  const s = await session();
  if (!s) return fail(SESSION_EXPIRED);
  updateTag(RATE_CACHE_TAG);
  return { ok: true };
}

/** Delete every row the user owns but keep the account and profile. */
export async function deleteAllData(): Promise<ActionResult> {
  const s = await session();
  if (!s) return fail(SESSION_EXPIRED);

  // Children first; RLS limits each delete to the caller's rows.
  const tables = [
    "family_transfers", "debt_payments", "sends", "debts", "debt_people", "charity_entries",
    "installments", "other_entries", "savings", "expenses", "incomes",
  ] as const;
  for (const table of tables) {
    const { error } = await s.supabase.from(table).delete().eq("user_id", s.userId);
    if (error) return dbFail(error, `delete all ${table}`);
  }
  return { ok: true };
}

/** Permanently delete the account and all its data, then sign out. */
export async function deleteAccount(): Promise<ActionResult> {
  const s = await session();
  if (!s) return fail(SESSION_EXPIRED);

  const { error } = await s.supabase.rpc("delete_my_account");
  if (error) return dbFail(error, "delete account");

  await s.supabase.auth.signOut();
  redirect("/signup");
}
