/**
 * Phone number helpers. Supabase phone auth needs paid SMS, so the app maps
 * a phone number to a synthetic email and uses the PIN as the password.
 */

export const COUNTRIES = {
  "974": { name: "Qatar", short: "QA", localLength: 8, example: "55123456" },
  "92": { name: "Pakistan", short: "PK", localLength: 10, example: "3001234567" },
} as const;

export type CountryCode = keyof typeof COUNTRIES;
export const COUNTRY_CODES = Object.keys(COUNTRIES) as CountryCode[];
export const DEFAULT_COUNTRY: CountryCode = "974";

const EMAIL_DOMAIN = "expense.local";

/**
 * Reduce user input to the national number: digits only, without a leading
 * trunk "0" (Pakistani numbers are often written 0300...) or a repeated
 * country code.
 */
export function normalizeLocalNumber(country: CountryCode, raw: string): string {
  // A leading "+" or "00" means the number includes a country code.
  const international = /^\s*(\+|00)/.test(raw);
  let digits = raw.replace(/\D/g, "");
  if (international && digits.startsWith("00")) digits = digits.slice(2);
  if (international && digits.startsWith(country)) digits = digits.slice(country.length);
  else if (
    digits.startsWith(country) &&
    digits.length === country.length + COUNTRIES[country].localLength
  ) {
    digits = digits.slice(country.length);
  }
  if (digits.startsWith("0")) digits = digits.slice(1);
  return digits;
}

/**
 * Clean phone input as the user types or pastes: digits only, trunk 0 and
 * country code removed, capped at the country's number length.
 */
export function sanitizeLocalInput(country: CountryCode, raw: string): string {
  return normalizeLocalNumber(country, raw).slice(0, COUNTRIES[country].localLength);
}

export function isValidLocalNumber(country: CountryCode, raw: string): boolean {
  return normalizeLocalNumber(country, raw).length === COUNTRIES[country].localLength;
}

/** E.164 format, e.g. +97455123456. */
export function toE164(country: CountryCode, raw: string): string {
  return `+${country}${normalizeLocalNumber(country, raw)}`;
}

/** Synthetic login email, e.g. 97455123456@expense.local. */
export function phoneToEmail(e164: string): string {
  return `${e164.replace(/\D/g, "")}@${EMAIL_DOMAIN}`;
}

/** Split a stored E.164 number back into country code and national number. */
export function splitE164(e164: string): { country: CountryCode; local: string } {
  const digits = e164.replace(/\D/g, "");
  const country =
    COUNTRY_CODES.find((code) => digits.startsWith(code)) ?? DEFAULT_COUNTRY;
  return { country, local: digits.slice(country.length) };
}
