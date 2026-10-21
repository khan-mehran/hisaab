/**
 * Public environment variables, validated once at import time.
 *
 * Only `NEXT_PUBLIC_*` values live here because this module is imported by
 * browser code. Never add the Supabase service-role key to this file.
 */

function required(name: string, value: string | undefined): string {
  if (!value) {
    throw new Error(
      `Missing environment variable ${name}. Locally: copy .env.example to .env.local and fill it in. On Vercel: Project Settings > Environment Variables, then redeploy.`,
    );
  }
  return value;
}

export const env = {
  supabaseUrl: required(
    "NEXT_PUBLIC_SUPABASE_URL",
    process.env.NEXT_PUBLIC_SUPABASE_URL,
  ),
  // Supabase now issues "publishable" keys; older projects still use the anon key.
  supabaseKey: required(
    "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  ),
} as const;
