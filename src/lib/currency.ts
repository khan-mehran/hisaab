/**
 * Currency helpers. All maths uses plain numbers rounded to 2 decimals;
 * amounts stay well within safe integer range for personal finance.
 */

export type Currency = "QAR" | "PKR" | "USD";
export type NumberLocale = "en-US" | "en-IN";

export const CURRENCIES: Currency[] = ["QAR", "PKR", "USD"];

export type Rates = {
  /** 1 QAR in PKR. */
  qarPkr: number;
  /** 1 USD in QAR. */
  usdQar: number;
};

/** Round to 2 decimals without floating point drift (e.g. 1.005 -> 1.01). */
export function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

export function qarToPkr(qar: number, qarPkr: number): number {
  return round2(qar * qarPkr);
}

/** Convert any supported currency to QAR. */
export function toQar(amount: number, currency: Currency, rates: Rates): number {
  switch (currency) {
    case "QAR":
      return round2(amount);
    case "PKR":
      return round2(amount / rates.qarPkr);
    case "USD":
      return round2(amount * rates.usdQar);
  }
}

/** Convert any supported currency to PKR. */
export function toPkr(amount: number, currency: Currency, rates: Rates): number {
  return currency === "PKR" ? round2(amount) : qarToPkr(toQar(amount, currency, rates), rates.qarPkr);
}

const PREFIX: Record<Currency, string> = { QAR: "QAR ", PKR: "Rs ", USD: "$" };

const formatters = new Map<string, Intl.NumberFormat>();

function formatter(locale: NumberLocale, decimals: boolean) {
  const key = `${locale}:${decimals}`;
  let f = formatters.get(key);
  if (!f) {
    f = new Intl.NumberFormat(locale, {
      minimumFractionDigits: 0,
      maximumFractionDigits: decimals ? 2 : 0,
    });
    formatters.set(key, f);
  }
  return f;
}

/**
 * Format an amount: QAR 5,000 / Rs 387,000 / $1,250.
 * PKR is shown without decimals; QAR and USD keep up to 2.
 */
export function formatMoney(
  amount: number,
  currency: Currency,
  locale: NumberLocale = "en-US",
): string {
  const value = Number.isFinite(amount) ? amount : 0;
  const sign = value < 0 ? "-" : "";
  return `${sign}${PREFIX[currency]}${formatter(locale, currency !== "PKR").format(Math.abs(value))}`;
}

export const formatQAR = (n: number, locale?: NumberLocale) => formatMoney(n, "QAR", locale);
export const formatPKR = (n: number, locale?: NumberLocale) => formatMoney(n, "PKR", locale);

/** Plain number with grouping, e.g. for table cells under a currency header. */
export function formatNumber(n: number, locale: NumberLocale = "en-US", decimals = 2): string {
  return new Intl.NumberFormat(locale, { maximumFractionDigits: decimals }).format(n);
}

/** Parse a user-typed amount like "1,500.50". Returns NaN when invalid. */
export function parseAmount(input: string | number | null | undefined): number {
  if (typeof input === "number") return input;
  if (!input) return NaN;
  const cleaned = input.replace(/[,\s]/g, "");
  return /^\d*\.?\d*$/.test(cleaned) && cleaned !== "" && cleaned !== "." ? Number(cleaned) : NaN;
}
