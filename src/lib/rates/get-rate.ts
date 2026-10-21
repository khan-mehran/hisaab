import "server-only";

import { cacheLife, cacheTag } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { fetchProviderRates, USD_QAR_PEG } from "./provider";

export const RATE_CACHE_TAG = "fx-rates";

export type RateInfo = {
  qarPkr: number;
  usdQar: number;
  fetchedAt: string;
  /** True when the provider failed and the last saved rate is used. */
  stale: boolean;
};

/**
 * Provider call cached for an hour across all users. Errors are not cached,
 * so a failed call is retried on the next request.
 */
async function cachedProviderRates() {
  "use cache";
  cacheLife("hours");
  cacheTag(RATE_CACHE_TAG);
  return fetchProviderRates();
}

/**
 * Current QAR rates for a signed-in request. Saves fresh rates to the
 * exchange_rates table (the database throttles writes) and falls back to the
 * last saved rate if the provider is down.
 */
export async function getRate(): Promise<RateInfo | null> {
  const supabase = await createClient();

  try {
    const rates = await cachedProviderRates();
    // Best effort: a failed save must not break the response.
    const { error } = await supabase.rpc("record_exchange_rate", {
      p_base: "QAR",
      p_quote: "PKR",
      p_rate: rates.qarPkr,
    });
    if (error) console.warn("record_exchange_rate:", error.message);
    return { qarPkr: rates.qarPkr, usdQar: rates.usdQar, fetchedAt: rates.fetchedAt, stale: false };
  } catch (err) {
    console.warn("Rate provider failed, using last saved rate:", err);
  }

  const { data } = await supabase
    .from("exchange_rates")
    .select("rate, fetched_at")
    .eq("base", "QAR")
    .eq("quote", "PKR")
    .order("fetched_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!data) return null;
  return { qarPkr: Number(data.rate), usdQar: USD_QAR_PEG, fetchedAt: data.fetched_at, stale: true };
}
