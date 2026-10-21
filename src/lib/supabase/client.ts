import { createBrowserClient } from "@supabase/ssr";
import { env } from "@/lib/env";
import type { Database } from "@/lib/database.types";

/**
 * Supabase client for Client Components.
 * Uses the public key only; Row Level Security limits every query to the
 * signed-in user's own rows.
 */
export function createClient() {
  return createBrowserClient<Database>(env.supabaseUrl, env.supabaseKey);
}
