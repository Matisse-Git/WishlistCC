// Currency detection/normalization for scraped text. Delegates to the
// canonical symbol table in `lib/currencies` so display formatting
// (lib/money.ts) and extraction never disagree about what a symbol means.
import { isKnownCurrencyCode, SYMBOLS_BY_LENGTH_DESC, SYMBOL_TO_CURRENCY } from "@/lib/currencies";

/** Extracts an ISO currency code from free text, preferring explicit 3-letter codes over symbols. */
export function detectCurrency(raw: string | null | undefined): string | null {
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

/** Normalizes a currency code string; returns null (uncertain) rather than guessing when unknown. */
export function normalizeCurrencyCode(code: string | null | undefined): string | null {
  if (!code) return null;
  const upper = code.trim().toUpperCase();
  return isKnownCurrencyCode(upper) ? upper : null;
}
