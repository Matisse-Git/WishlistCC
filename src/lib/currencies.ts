// A reasonably complete set of ISO 4217 currency codes for validation and
// <select> dropdowns. Not exhaustive, but covers everything a wishlist app
// is likely to encounter.
export const KNOWN_CURRENCY_CODES = [
  "USD", "EUR", "GBP", "JPY", "CNY", "CAD", "AUD", "NZD", "CHF", "SEK",
  "NOK", "DKK", "PLN", "CZK", "HUF", "RON", "BGN", "HRK", "ISK", "TRY",
  "RUB", "UAH", "INR", "PKR", "BDT", "LKR", "NPR", "IDR", "MYR", "SGD",
  "THB", "PHP", "VND", "KRW", "HKD", "TWD", "MOP", "AED", "SAR", "QAR",
  "KWD", "BHD", "OMR", "ILS", "EGP", "ZAR", "NGN", "KES", "GHS", "MAD",
  "BRL", "MXN", "ARS", "CLP", "COP", "PEN", "UYU", "BOB", "PYG",
] as const;

export type CurrencyCode = (typeof KNOWN_CURRENCY_CODES)[number];

const KNOWN_CURRENCY_SET = new Set<string>(KNOWN_CURRENCY_CODES);

export function isKnownCurrencyCode(code: string | null | undefined): code is CurrencyCode {
  if (!code) return false;
  return KNOWN_CURRENCY_SET.has(code.toUpperCase());
}

// Zero-decimal / three-decimal currencies where Intl.NumberFormat's default
// fraction digits already do the right thing, kept here only for reference —
// we rely on Intl to get this right rather than hardcoding it ourselves.

// Symbol -> ISO code. Longer/more specific symbols first so lookups that try
// them in order find the most specific match before falling back to bare "$".
export const SYMBOL_TO_CURRENCY: Record<string, CurrencyCode> = {
  "A$": "AUD",
  "C$": "CAD",
  "NZ$": "NZD",
  "HK$": "HKD",
  "NT$": "TWD",
  "R$": "BRL",
  "MX$": "MXN",
  "S$": "SGD",
  "€": "EUR",
  "£": "GBP",
  "¥": "JPY",
  "₹": "INR",
  "₩": "KRW",
  "₽": "RUB",
  "₺": "TRY",
  "₪": "ILS",
  "₫": "VND",
  "฿": "THB",
  "₴": "UAH",
  "zł": "PLN",
  "$": "USD",
};

// Ordered longest-first so multi-character symbols are matched before their
// single-character substrings (e.g. "A$" before "$").
export const SYMBOLS_BY_LENGTH_DESC = Object.keys(SYMBOL_TO_CURRENCY).sort(
  (a, b) => b.length - a.length
);
