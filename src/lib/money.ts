import Decimal from "decimal.js";
import { isKnownCurrencyCode, SYMBOLS_BY_LENGTH_DESC, SYMBOL_TO_CURRENCY } from "./currencies";

export type DecimalLike = Decimal | number | string | { toString(): string };

/**
 * Safely converts any Decimal-like value (a decimal.js Decimal, a Prisma
 * Decimal, a number, or a numeric string) into a decimal.js Decimal.
 * Returns null instead of throwing for invalid/empty input, since prices
 * are frequently missing or partially entered in this app.
 */
export function toDecimal(value: DecimalLike | null | undefined): Decimal | null {
  if (value === null || value === undefined) return null;
  if (value instanceof Decimal) return value;
  const str = typeof value === "string" ? value.trim() : value.toString();
  if (str === "") return null;
  try {
    const d = new Decimal(str);
    if (d.isNaN()) return null;
    return d;
  } catch {
    return null;
  }
}

/** Sums a list of Decimal-like values without floating point drift. */
export function sumDecimals(values: Array<DecimalLike | null | undefined>): Decimal {
  return values.reduce<Decimal>((acc, v) => {
    const d = toDecimal(v);
    return d ? acc.plus(d) : acc;
  }, new Decimal(0));
}

/** Extracts an ISO currency code from free text, preferring explicit codes over symbols. */
export function extractCurrency(raw: string): string | null {
  if (!raw) return null;
  const isoMatches = raw.match(/\b[A-Za-z]{3}\b/g);
  if (isoMatches) {
    for (const m of isoMatches) {
      const upper = m.toUpperCase();
      if (isKnownCurrencyCode(upper)) return upper;
    }
  }
  for (const sym of SYMBOLS_BY_LENGTH_DESC) {
    if (raw.includes(sym)) return SYMBOL_TO_CURRENCY[sym];
  }
  return null;
}

export interface ParsedPrice {
  amount: string | null;
  currency: string | null;
}

/**
 * Parses loosely-formatted price strings such as "$19.99", "19,99 €",
 * "€1,234.56", "1 234,56 EUR", or "1,234.56" into a normalized decimal
 * string plus an inferred ISO currency code. Best-effort only — malformed
 * or ambiguous input returns amount: null rather than throwing.
 */
export function parsePriceString(raw: string): ParsedPrice {
  if (!raw) return { amount: null, currency: null };
  const currency = extractCurrency(raw);

  // Keep only digits, separators, minus sign, and whitespace.
  const numeric = raw.replace(/[^0-9.,\-\s]/g, "").trim();
  if (!numeric) return { amount: null, currency };

  const hasComma = numeric.includes(",");
  const hasDot = numeric.includes(".");
  let normalized: string;

  if (hasComma && hasDot) {
    const lastComma = numeric.lastIndexOf(",");
    const lastDot = numeric.lastIndexOf(".");
    const decimalSep = lastComma > lastDot ? "," : ".";
    const thousandsSep = decimalSep === "," ? "." : ",";
    normalized = numeric.split(thousandsSep).join("");
    if (decimalSep === ",") normalized = normalized.replace(",", ".");
  } else if (hasComma) {
    const parts = numeric.split(",");
    const lastPart = parts[parts.length - 1];
    if (parts.length === 2 && lastPart.trim().length <= 2) {
      // Single comma with 1-2 trailing digits: European decimal separator.
      normalized = parts.join(".");
    } else {
      // Multiple commas, or trailing group of 3: thousands separator.
      normalized = parts.join("");
    }
  } else {
    // Only dots (or nothing) present — treat as-is; a lone "." is already
    // the standard decimal separator in the common formats we expect.
    normalized = numeric;
  }

  normalized = normalized.replace(/\s+/g, "");

  if (!/^-?\d+(\.\d+)?$/.test(normalized)) {
    return { amount: null, currency };
  }

  return { amount: normalized, currency };
}

// Fixed rather than the user's locale (`undefined`) so server-rendered HTML
// always matches the client's first render — Node's default locale and a
// browser's locale frequently differ (e.g. "$1.00" vs "US$1.00"), which
// causes a React hydration mismatch when left to the runtime default.
const FORMAT_LOCALE = "en-US";

/** Formats an amount as currency, falling back to a plain number when the currency code is missing/unknown. */
export function formatMoney(
  amount: DecimalLike | null | undefined,
  currencyCode?: string | null
): string {
  const d = toDecimal(amount);
  if (d === null) return "—";
  const num = d.toNumber();

  if (currencyCode && isKnownCurrencyCode(currencyCode)) {
    try {
      return new Intl.NumberFormat(FORMAT_LOCALE, {
        style: "currency",
        currency: currencyCode.toUpperCase(),
      }).format(num);
    } catch {
      // Fall through to plain number formatting below.
    }
  }
  return new Intl.NumberFormat(FORMAT_LOCALE, { maximumFractionDigits: 2 }).format(num);
}

export function formatPercent(ratio: number): string {
  return new Intl.NumberFormat(FORMAT_LOCALE, {
    style: "percent",
    maximumFractionDigits: 0,
  }).format(Math.max(0, Math.min(1, ratio)));
}
