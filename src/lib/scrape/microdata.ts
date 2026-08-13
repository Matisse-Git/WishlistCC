// schema.org microdata extraction (itemprop attributes), the fallback when
// a page has neither JSON-LD nor Open Graph tags.
import type * as cheerio from "cheerio";
import { resolveUrl } from "./resolveUrl";
import { makePriceCandidate } from "./normalizePrice";
import type { ImageCandidate, PriceCandidate, TitleCandidate, DescriptionCandidate } from "./types";

function itemprop($: cheerio.CheerioAPI, name: string): string | undefined {
  const el = $(`[itemprop="${name}"]`).first();
  if (el.length === 0) return undefined;
  // Per the microdata spec, `content` (on <meta>) wins over visible text/attrs.
  const content = el.attr("content");
  if (content?.trim()) return content.trim();
  const src = el.attr("src") || el.attr("href");
  if (src?.trim()) return src.trim();
  const text = el.text().trim();
  return text || undefined;
}

export interface MicrodataFields {
  name?: string;
  image?: string;
  description?: string;
  price?: string;
  priceCurrency?: string;
  lowPrice?: string;
  highPrice?: string;
}

export function extractMicrodata($: cheerio.CheerioAPI): MicrodataFields {
  return {
    name: itemprop($, "name"),
    image: itemprop($, "image"),
    description: itemprop($, "description"),
    price: itemprop($, "price"),
    priceCurrency: itemprop($, "priceCurrency"),
    lowPrice: itemprop($, "lowPrice"),
    highPrice: itemprop($, "highPrice"),
  };
}

export function hasMicrodata($: cheerio.CheerioAPI): boolean {
  return $("[itemscope]").length > 0 || $("[itemprop]").length > 0;
}

export function extractMicrodataImageCandidates($: cheerio.CheerioAPI, baseUrl: string): ImageCandidate[] {
  const fields = extractMicrodata($);
  const resolved = resolveUrl(fields.image, baseUrl);
  return resolved ? [{ url: resolved, source: "microdata", score: 42 }] : [];
}

export function extractMicrodataPriceCandidates($: cheerio.CheerioAPI): PriceCandidate[] {
  const fields = extractMicrodata($);
  const currency = fields.priceCurrency?.toUpperCase() ?? null;
  const candidates: PriceCandidate[] = [];
  if (fields.price) {
    candidates.push(makePriceCandidate(fields.price, "microdata", currency ? "high" : "medium", currency));
  }
  if (fields.lowPrice) {
    candidates.push(makePriceCandidate(fields.lowPrice, "microdata", currency ? "high" : "medium", currency));
  }
  return candidates;
}

export function extractMicrodataTitleCandidates($: cheerio.CheerioAPI): TitleCandidate[] {
  const fields = extractMicrodata($);
  return fields.name ? [{ value: fields.name, source: "microdata" }] : [];
}

export function extractMicrodataDescriptionCandidates($: cheerio.CheerioAPI): DescriptionCandidate[] {
  const fields = extractMicrodata($);
  return fields.description ? [{ value: fields.description, source: "microdata" }] : [];
}
