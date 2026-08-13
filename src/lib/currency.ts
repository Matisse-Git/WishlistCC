import Decimal from "decimal.js";
import { prisma } from "./db";

const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours
const FETCH_TIMEOUT_MS = 8000;

export interface RatesResult {
  rates: Record<string, number>;
  fetchedAt: Date;
  stale: boolean;
}

export type ConversionStatus = "success" | "missing_rate" | "manual" | "not_needed" | "unknown";

async function fetchRatesFromApi(baseCurrency: string): Promise<Record<string, number> | null> {
  const apiKey = process.env.CURRENCY_API_KEY;
  const url = apiKey
    ? `https://open.er-api.com/v6/latest/${encodeURIComponent(baseCurrency)}?apikey=${encodeURIComponent(apiKey)}`
    : `https://open.er-api.com/v6/latest/${encodeURIComponent(baseCurrency)}`;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: { "User-Agent": "WishListCC/1.0 (+personal wishlist app)" },
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { result?: string; rates?: Record<string, number> };
    if (data?.result !== "success" || !data?.rates) return null;
    return data.rates;
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

/** Fetches fresh rates from the API and writes them into the cache. Returns null if the fetch failed. */
export async function refreshExchangeRates(baseCurrency: string): Promise<RatesResult | null> {
  const code = baseCurrency.toUpperCase();
  const rates = await fetchRatesFromApi(code);
  if (!rates) return null;

  const fetchedAt = new Date();
  const expiresAt = new Date(fetchedAt.getTime() + CACHE_TTL_MS);
  await prisma.exchangeRateCache.upsert({
    where: { baseCurrency: code },
    create: { baseCurrency: code, rates, fetchedAt, expiresAt },
    update: { rates, fetchedAt, expiresAt },
  });
  return { rates, fetchedAt, stale: false };
}

/**
 * Returns exchange rates for the given base currency, using the cache when
 * fresh, refreshing when stale, and falling back to a stale cache entry
 * rather than failing outright if the upstream API is unreachable.
 */
export async function getExchangeRates(baseCurrency: string): Promise<RatesResult | null> {
  const code = baseCurrency.toUpperCase();
  const cached = await prisma.exchangeRateCache.findUnique({ where: { baseCurrency: code } });
  const now = new Date();

  if (cached && cached.expiresAt > now) {
    return { rates: cached.rates as Record<string, number>, fetchedAt: cached.fetchedAt, stale: false };
  }

  const fresh = await refreshExchangeRates(code);
  if (fresh) return fresh;

  if (cached) {
    return { rates: cached.rates as Record<string, number>, fetchedAt: cached.fetchedAt, stale: true };
  }

  return null;
}

/** Converts an amount between currencies using rates keyed relative to `fromCurrency`'s cache base. */
export function convertAmount(
  amount: Decimal,
  fromCurrency: string,
  toCurrency: string,
  ratesFromBase: Record<string, number>
): Decimal | null {
  if (fromCurrency.toUpperCase() === toCurrency.toUpperCase()) return amount;
  // ratesFromBase is keyed by "toCurrency" as the API base, giving units of
  // other currencies per 1 unit of toCurrency — so converting an amount in
  // fromCurrency into toCurrency is amount / rate[fromCurrency].
  const rate = ratesFromBase[fromCurrency.toUpperCase()];
  if (!rate || rate <= 0) return null;
  return amount.dividedBy(rate).toDecimalPlaces(decimalPlacesForCurrency(toCurrency));
}

/** Uses Intl's own currency data so zero-decimal currencies (JPY, ...) round correctly too. */
function decimalPlacesForCurrency(code: string): number {
  try {
    return (
      new Intl.NumberFormat("en-US", { style: "currency", currency: code.toUpperCase() }).resolvedOptions()
        .maximumFractionDigits ?? 2
    );
  } catch {
    return 2;
  }
}

export interface ConversionResult {
  convertedPrice: Decimal | null;
  conversionStatus: ConversionStatus;
}

/**
 * Computes convertedPrice + conversionStatus for an item's original price.
 * Never throws — a failed/missing rate degrades to conversionStatus
 * "missing_rate" or "unknown" rather than blocking the save.
 */
export async function computeConversion(
  originalPrice: Decimal | null,
  originalCurrency: string | null,
  baseCurrency: string
): Promise<ConversionResult> {
  if (!originalPrice || !originalCurrency) {
    return { convertedPrice: null, conversionStatus: "unknown" };
  }
  if (originalCurrency.toUpperCase() === baseCurrency.toUpperCase()) {
    return { convertedPrice: originalPrice, conversionStatus: "not_needed" };
  }

  // Rates are cached relative to the user's base currency, so a single
  // daily fetch covers conversions from every distinct item currency.
  const ratesResult = await getExchangeRates(baseCurrency);
  if (!ratesResult) {
    return { convertedPrice: null, conversionStatus: "missing_rate" };
  }
  const converted = convertAmount(originalPrice, originalCurrency, baseCurrency, ratesResult.rates);
  if (!converted) {
    return { convertedPrice: null, conversionStatus: "missing_rate" };
  }
  return { convertedPrice: converted, conversionStatus: "success" };
}
