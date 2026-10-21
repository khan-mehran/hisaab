import "server-only";

/**
 * Basic brute-force protection for PIN logins.
 *
 * Failed attempts are counted per key (phone number and client IP). After a
 * few failures every further attempt is slowed down, and after many failures
 * the key is locked for a while. Supabase Auth also rate-limits sign-ins on
 * its side.
 *
 * State lives in server memory, so on serverless hosting it is per instance
 * and resets on cold starts. That is acceptable as a first line of defence;
 * swap in Upstash/Redis if you need a shared counter.
 */

const FREE_ATTEMPTS = 3; // failures before delays start
const MAX_DELAY_MS = 8_000;
const LOCK_AFTER = 10; // failures before lockout
const LOCK_MS = 5 * 60_000;
const FORGET_AFTER_MS = 30 * 60_000;

type Entry = { fails: number; lockedUntil: number; lastFail: number };
const attempts = new Map<string, Entry>();

function get(key: string): Entry | undefined {
  const entry = attempts.get(key);
  if (entry && Date.now() - entry.lastFail > FORGET_AFTER_MS) {
    attempts.delete(key);
    return undefined;
  }
  return entry;
}

/** Milliseconds the caller is still locked out for, or 0. */
export function lockRemaining(keys: string[]): number {
  const now = Date.now();
  return Math.max(0, ...keys.map((k) => (get(k)?.lockedUntil ?? 0) - now));
}

/** Delay to apply before answering, growing with the number of failures. */
export function attemptDelay(keys: string[]): number {
  const fails = Math.max(0, ...keys.map((k) => get(k)?.fails ?? 0));
  if (fails < FREE_ATTEMPTS) return 0;
  return Math.min(MAX_DELAY_MS, 1000 * 2 ** (fails - FREE_ATTEMPTS));
}

export function recordFailure(keys: string[]): void {
  const now = Date.now();
  for (const key of keys) {
    const entry = get(key) ?? { fails: 0, lockedUntil: 0, lastFail: now };
    entry.fails += 1;
    entry.lastFail = now;
    if (entry.fails >= LOCK_AFTER) entry.lockedUntil = now + LOCK_MS;
    attempts.set(key, entry);
  }
}

export function recordSuccess(keys: string[]): void {
  keys.forEach((key) => attempts.delete(key));
}

export const sleep = (ms: number) =>
  new Promise<void>((resolve) => setTimeout(resolve, ms));
