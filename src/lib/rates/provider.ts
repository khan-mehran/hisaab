import "server-only";

/**
 * Exchange-rate provider. Swap the implementation here to change source;
 * the rest of the app only sees `ProviderRates`.
 */

export type ProviderRates = {
  /** 1 QAR in PKR. */
  qarPkr: number;
  /** 1 USD in QAR. */
  usdQar: number;
  fetchedAt: string;
  source: string;
};

const DEFAULT_URL = "https://open.er-api.com/v6/latest/QAR";

/** QAR is pegged to the US dollar at 3.64, used if the provider omits USD. */
export const USD_QAR_PEG = 3.64;

type OpenErApiResponse = {
  result: "success" | "error";
  time_last_update_unix?: number;
  rates?: Record<string, number>;
};

/** open.er-api.com: free, no key, same market rate as Google. */
async function fetchOpenErApi(): Promise<ProviderRates> {
  const url = process.env.EXCHANGE_RATE_API_URL || DEFAULT_URL;
  const res = await fetch(url, { signal: AbortSignal.timeout(8_000) });
  if (!res.ok) throw new Error(`Rate provider responded ${res.status}`);

  const body = (await res.json()) as OpenErApiResponse;
  const pkr = body.rates?.PKR;
  const usd = body.rates?.USD; // 1 QAR in USD
  if (body.result !== "success" || !pkr || pkr <= 0) {
    throw new Error("Rate provider returned no PKR rate");
  }

  return {
    qarPkr: pkr,
    usdQar: usd && usd > 0 ? 1 / usd : USD_QAR_PEG,
    fetchedAt: new Date(
      (body.time_last_update_unix ?? Date.now() / 1000) * 1000,
    ).toISOString(),
    source: new URL(url).hostname,
  };
}

export const fetchProviderRates = fetchOpenErApi;
