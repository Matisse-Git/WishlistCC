// Top-level entry points for URL preview / metadata extraction.
//
// analyzeUrlPreview() is the full diagnostics-friendly pipeline described in
// the scrape debug view: fetch -> parse -> extract -> return everything,
// including *why* a field wasn't selected.
//
// fetchProductPreview() is the leaner shape the add-item UI actually
// consumes (kept stable so existing callers don't need to change).
import * as cheerio from "cheerio";
import { isSafeUrl } from "./safeUrl";
import { storeNameFromUrl } from "./storeName";
import { safeFetchHtml, describeFetchError } from "./fetchHtml";
import { extractMetadata } from "./extractMetadata";
import type { AnalyzeUrlResult, ExtractionDebugInfo, FetchDebugInfo } from "./types";

function emptyDebug(fetchDebug: FetchDebugInfo): ExtractionDebugInfo {
  return {
    fetch: fetchDebug,
    jsonLdBlocksFound: 0,
    jsonLdParseErrors: 0,
    jsonLdProductNodesFound: 0,
    openGraphTagsFound: [],
    microdataFound: false,
    titles: [],
    descriptions: [],
    images: [],
    imageAlternates: [],
    prices: [],
    priceAlternates: [],
    selectedTitleSource: null,
    selectedImageSource: null,
    selectedPriceSource: null,
    imageRejectionReason: null,
    priceRejectionReason: null,
  };
}

export async function analyzeUrlPreview(rawUrl: string): Promise<AnalyzeUrlResult> {
  const warnings: string[] = [];
  const safe = isSafeUrl(rawUrl);

  if (!safe.ok) {
    const fetchDebug: FetchDebugInfo = {
      requestedUrl: rawUrl,
      finalUrl: null,
      ok: false,
      status: null,
      contentType: null,
      contentLength: null,
      htmlEmpty: true,
      error: "unsafe_url",
    };
    return {
      ok: false,
      url: rawUrl,
      finalUrl: rawUrl,
      title: null,
      description: null,
      imageUrl: null,
      price: null,
      currency: null,
      store: null,
      warnings: [safe.reason],
      debug: emptyDebug(fetchDebug),
    };
  }

  const store = storeNameFromUrl(safe.url);
  const fetchResult = await safeFetchHtml(safe.url);

  if (!fetchResult.ok) {
    warnings.push(describeFetchError(fetchResult.error));
    return {
      ok: false,
      url: rawUrl,
      finalUrl: fetchResult.debug.finalUrl ?? rawUrl,
      title: null,
      description: null,
      imageUrl: null,
      price: null,
      currency: null,
      store,
      warnings,
      debug: emptyDebug(fetchResult.debug),
    };
  }

  let extracted: ReturnType<typeof extractMetadata>;
  try {
    const $ = cheerio.load(fetchResult.html);
    extracted = extractMetadata($, fetchResult.finalUrl, fetchResult.debug);
  } catch {
    warnings.push("Could not parse the page's HTML. You can fill in details manually.");
    return {
      ok: false,
      url: rawUrl,
      finalUrl: fetchResult.finalUrl,
      title: null,
      description: null,
      imageUrl: null,
      price: null,
      currency: null,
      store,
      warnings,
      debug: emptyDebug(fetchResult.debug),
    };
  }

  if (!extracted.title) warnings.push("Couldn't find a title automatically. Please enter one manually.");
  if (!extracted.price) {
    warnings.push(
      extracted.debug.priceRejectionReason
        ? `Couldn't detect a price (${extracted.debug.priceRejectionReason}). Please enter one manually.`
        : "Couldn't detect a price automatically. Please enter one manually."
    );
  } else if (!extracted.currency) {
    warnings.push("Found a price, but the currency could not be confirmed — please double-check it.");
  }
  if (!extracted.imageUrl) {
    warnings.push(
      "Couldn't find a product image automatically. You can paste a direct image URL instead."
    );
  }

  return {
    ok: true,
    url: rawUrl,
    finalUrl: fetchResult.finalUrl,
    title: extracted.title,
    description: extracted.description,
    imageUrl: extracted.imageUrl,
    price: extracted.price,
    currency: extracted.currency,
    store,
    warnings,
    debug: extracted.debug,
  };
}

// ---------------------------------------------------------------------------
// Legacy-shaped result kept for existing callers (the add-item preview API
// and UI). Backed entirely by analyzeUrlPreview.
// ---------------------------------------------------------------------------

export interface PreviewResult {
  url: string;
  title: string | null;
  description: string | null;
  imageUrl: string | null;
  price: string | null;
  currency: string | null;
  store: string | null;
  rawMetadata: Record<string, unknown> | null;
  warnings: string[];
  /** Full extraction debug info, for the add-item modal's "Show extraction details" panel. */
  debug: ExtractionDebugInfo;
}

export async function fetchProductPreview(rawUrl: string): Promise<PreviewResult> {
  const result = await analyzeUrlPreview(rawUrl);
  return {
    url: result.finalUrl,
    title: result.title,
    description: result.description,
    imageUrl: result.imageUrl,
    price: result.price,
    currency: result.currency,
    store: result.store,
    rawMetadata: result.ok
      ? {
          jsonLdBlocksFound: result.debug.jsonLdBlocksFound,
          openGraphTagsFound: result.debug.openGraphTagsFound,
          microdataFound: result.debug.microdataFound,
        }
      : null,
    warnings: result.warnings,
    debug: result.debug,
  };
}
