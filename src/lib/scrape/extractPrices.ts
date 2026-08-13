// Price candidate gathering across every source, in order of preference:
// JSON-LD > meta tags > microdata > (last resort) visible-text regex
// scanning. Structured sources are tried first because free-text scraping
// is inherently noisy — shipping costs, "you save $10" banners, and review
// counts all look like prices out of context.
import type * as cheerio from "cheerio";
import { extractJsonLdPriceCandidates, type JsonLdNode } from "./extractJsonLd";
import { extractMetaPriceCandidates } from "./extractOpenGraph";
import { extractMicrodataPriceCandidates } from "./microdata";
import { makePriceCandidate } from "./normalizePrice";
import { SYMBOLS_BY_LENGTH_DESC, KNOWN_CURRENCY_CODES } from "@/lib/currencies";
import type { PriceCandidate } from "./types";

const EXCLUDE_TAGS = new Set(["script", "style", "noscript", "template", "svg", "iframe"]);

const EXCLUDE_CONTEXT_RE =
  /(shipping|delivery|freight|\btax\b|\bvat\b|discount|coupon|\bsave\b|savings|\boff\b|\/\s*mo\b|per\s*month|installment|financing|subtotal|msrp|was:?\s*$|review|rating|sold|in\s*stock|stock:|credit|reward|cashback)/i;

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

const SYMBOL_ALT = SYMBOLS_BY_LENGTH_DESC.map(escapeRegExp).join("|");
const CODE_ALT = [...KNOWN_CURRENCY_CODES].join("|");

// A "reasonable" price number: either (a) digit groups separated by ".",
// ",", a regular space, or a non-breaking space (e.g. "1,234.56"), or (b) a
// plain run of digits with an optional decimal tail (e.g. "1000", "19.99").
// (a) requires at least one separator group so it never short-matches a
// plain run like "1000" as just its first 1-3 digits. `normalizePrice`
// (money.ts) handles disambiguating which separator is thousands vs. decimal.
//
// NOTE: built from a *string* (not a /regex/ literal), so every backslash
// here must be doubled — a template literal treats `\d` as an unrecognized
// string escape and silently drops the backslash, leaving a literal "d".
const THOUSANDS_SEP_CLASS = "[.,  ]";
const NUMBER =
  "\\d{1,3}(?:" + THOUSANDS_SEP_CLASS + "\\d{3})+(?:[.,]\\d{1,2})?|\\d+(?:[.,]\\d{1,2})?";

const SYMBOL_BEFORE_RE = new RegExp(`(?:${SYMBOL_ALT})\\s?(${NUMBER})`, "g");
const SYMBOL_AFTER_RE = new RegExp(`(${NUMBER})\\s?(?:${SYMBOL_ALT})`, "g");
const CODE_BEFORE_RE = new RegExp(`\\b(?:${CODE_ALT})\\s?(${NUMBER})\\b`, "g");
const CODE_AFTER_RE = new RegExp(`(${NUMBER})\\s?(?:${CODE_ALT})\\b`, "g");

function isSuspiciousContext(text: string): boolean {
  return EXCLUDE_CONTEXT_RE.test(text);
}

/**
 * Last-resort fallback: scans short leaf-element text nodes in the body for
 * currency-formatted numbers, skipping script/style content and anything
 * near shipping/tax/discount/review language.
 */
export function visibleBodyPriceCandidates($: cheerio.CheerioAPI): PriceCandidate[] {
  const candidates: PriceCandidate[] = [];
  const seen = new Set<string>();

  $("body")
    .find("*")
    .each((_, el) => {
      const tag = (el as { tagName?: string }).tagName?.toLowerCase();
      if (!tag || EXCLUDE_TAGS.has(tag)) return;
      const $el = $(el);
      if ($el.children().length > 0) return; // only leaf elements — avoids duplicate matches from nested wrappers

      const text = $el.text().trim().replace(/\s+/g, " ");
      if (!text || text.length > 60) return;
      if (isSuspiciousContext(text)) return;

      const ancestorHint = `${$el.attr("class") ?? ""} ${$el.parent().attr("class") ?? ""}`;
      if (isSuspiciousContext(ancestorHint)) return;

      for (const re of [SYMBOL_BEFORE_RE, SYMBOL_AFTER_RE, CODE_BEFORE_RE, CODE_AFTER_RE]) {
        re.lastIndex = 0;
        const match = re.exec(text);
        if (!match) continue;
        const raw = match[0];
        if (seen.has(raw)) continue;
        seen.add(raw);
        candidates.push(makePriceCandidate(raw, "regex", "low", null));
      }
    });

  return candidates;
}

/**
 * Gathers price candidates from every source. Regex fallback only runs when
 * no structured (JSON-LD/meta/microdata) candidate was found, since it's
 * meaningfully less reliable.
 */
export function gatherPriceCandidates(
  $: cheerio.CheerioAPI,
  jsonLdNodes: JsonLdNode[]
): PriceCandidate[] {
  const structured = [
    ...extractJsonLdPriceCandidates(jsonLdNodes),
    ...extractMetaPriceCandidates($),
    ...extractMicrodataPriceCandidates($),
  ].filter((c) => c.amount !== null);

  if (structured.length > 0) return structured;

  return visibleBodyPriceCandidates($).filter((c) => c.amount !== null);
}

const CONFIDENCE_RANK: Record<PriceCandidate["confidence"], number> = { high: 3, medium: 2, low: 1 };

export interface BestPriceResult {
  best: PriceCandidate | null;
  alternates: PriceCandidate[];
}

export function pickBestPrice(candidates: PriceCandidate[]): BestPriceResult {
  const usable = candidates.filter((c) => c.amount !== null);
  if (usable.length === 0) return { best: null, alternates: [] };
  const sorted = [...usable].sort((a, b) => {
    const rankDiff = CONFIDENCE_RANK[b.confidence] - CONFIDENCE_RANK[a.confidence];
    if (rankDiff !== 0) return rankDiff;
    // Among equal confidence, prefer candidates with a known currency.
    return (b.currency ? 1 : 0) - (a.currency ? 1 : 0);
  });
  const [best, ...alternates] = sorted;
  return { best, alternates: alternates.slice(0, 8) };
}
