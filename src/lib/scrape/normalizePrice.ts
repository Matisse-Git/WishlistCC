// Locale-aware price string parsing for scraped text. Delegates the actual
// number-format disambiguation to `lib/money.ts` (parsePriceString), which
// already handles "1,234.56" vs "1.234,56" vs "1 234,56" correctly and is
// covered by its own tests — this module just adapts that into extraction
// candidates.
import { parsePriceString } from "@/lib/money";
import type { PriceCandidate, Confidence, SourceType } from "./types";

export function normalizePrice(raw: string): { amount: string | null; currency: string | null } {
  return parsePriceString(raw);
}

export function makePriceCandidate(
  raw: string,
  source: SourceType,
  confidence: Confidence,
  currencyHint?: string | null
): PriceCandidate {
  const parsed = normalizePrice(raw);
  return {
    amount: parsed.amount,
    currency: currencyHint ?? parsed.currency,
    source,
    confidence,
    raw,
  };
}
