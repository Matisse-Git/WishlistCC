// JSON-LD structured data extraction (schema.org Product / ProductGroup /
// IndividualProduct). This is the highest-confidence metadata source when
// present, since it's meant to be machine-read.
import type * as cheerio from "cheerio";
import { resolveUrl } from "./resolveUrl";
import { makePriceCandidate } from "./normalizePrice";
import type { ImageCandidate, PriceCandidate, TitleCandidate, DescriptionCandidate } from "./types";

export type JsonLdNode = Record<string, unknown>;

export function flattenJsonLd(node: unknown, out: JsonLdNode[]): void {
  if (!node || typeof node !== "object") return;
  if (Array.isArray(node)) {
    for (const n of node) flattenJsonLd(n, out);
    return;
  }
  const obj = node as JsonLdNode;
  if (Array.isArray(obj["@graph"])) {
    flattenJsonLd(obj["@graph"], out);
  }
  out.push(obj);
}

const PRODUCT_TYPES = new Set(["product", "productgroup", "individualproduct"]);

export function isProductLike(node: JsonLdNode): boolean {
  const type = node["@type"];
  if (!type) return false;
  const types = Array.isArray(type) ? type : [type];
  return types.some((t) => typeof t === "string" && PRODUCT_TYPES.has(t.toLowerCase()));
}

export interface JsonLdParseResult {
  nodes: JsonLdNode[];
  blocksFound: number;
  parseErrors: number;
}

/** Parses every `<script type="application/ld+json">` block on the page, tolerating malformed JSON in any one of them. */
export function parseJsonLdBlocks($: cheerio.CheerioAPI): JsonLdParseResult {
  const nodes: JsonLdNode[] = [];
  let blocksFound = 0;
  let parseErrors = 0;

  $('script[type="application/ld+json"]').each((_, el) => {
    blocksFound += 1;
    const text = $(el).contents().text();
    if (!text?.trim()) return;
    try {
      const parsed = JSON.parse(text);
      flattenJsonLd(parsed, nodes);
    } catch {
      parseErrors += 1;
    }
  });

  return { nodes, blocksFound, parseErrors };
}

export function findProductNodes(nodes: JsonLdNode[]): JsonLdNode[] {
  return nodes.filter(isProductLike);
}

export function firstString(value: unknown): string | undefined {
  if (typeof value === "string") return value;
  if (Array.isArray(value)) {
    for (const v of value) {
      const s = firstString(v);
      if (s) return s;
    }
    return undefined;
  }
  if (value && typeof value === "object") {
    const obj = value as Record<string, unknown>;
    if (typeof obj.url === "string") return obj.url;
    if (typeof obj.contentUrl === "string") return obj.contentUrl;
  }
  return undefined;
}

/** Collects every string/object image URL referenced anywhere in a product node. */
function collectImageStrings(value: unknown, out: string[]): void {
  if (!value) return;
  if (typeof value === "string") {
    out.push(value);
    return;
  }
  if (Array.isArray(value)) {
    for (const v of value) collectImageStrings(v, out);
    return;
  }
  if (typeof value === "object") {
    const obj = value as Record<string, unknown>;
    if (typeof obj.url === "string") out.push(obj.url);
    if (typeof obj.contentUrl === "string") out.push(obj.contentUrl);
  }
}

export function extractJsonLdImageCandidates(nodes: JsonLdNode[], baseUrl: string): ImageCandidate[] {
  const candidates: ImageCandidate[] = [];
  const seen = new Set<string>();

  const push = (raw: string | undefined, bonus: number) => {
    const resolved = resolveUrl(raw, baseUrl);
    if (!resolved || seen.has(resolved)) return;
    seen.add(resolved);
    candidates.push({ url: resolved, source: "json-ld", score: 80 + bonus });
  };

  for (const node of nodes) {
    const isProduct = isProductLike(node);
    const base = isProduct ? 20 : 0;

    const imageStrings: string[] = [];
    collectImageStrings(node.image, imageStrings);
    imageStrings.forEach((s) => push(s, base + 10));

    if (typeof node.contentUrl === "string") push(node.contentUrl, base + 8);
    if (typeof node.thumbnailUrl === "string") push(node.thumbnailUrl, base);
    if (typeof node.primaryImageOfPage === "string") push(node.primaryImageOfPage, base + 5);
    else {
      const primaryImage = firstString(node.primaryImageOfPage);
      if (primaryImage) push(primaryImage, base + 5);
    }

    const offersRaw = node.offers;
    if (offersRaw) {
      const offerList = (Array.isArray(offersRaw) ? offersRaw : [offersRaw]) as JsonLdNode[];
      for (const offer of offerList) {
        if (!offer || typeof offer !== "object") continue;
        const offerImages: string[] = [];
        collectImageStrings(offer.image, offerImages);
        offerImages.forEach((s) => push(s, base + 4));
      }
    }
  }

  return candidates;
}

export function extractJsonLdTitleCandidates(nodes: JsonLdNode[]): TitleCandidate[] {
  const out: TitleCandidate[] = [];
  for (const node of nodes) {
    const name = firstString(node.name);
    if (name?.trim()) out.push({ value: name.trim(), source: "json-ld" });
  }
  return out;
}

export function extractJsonLdDescriptionCandidates(nodes: JsonLdNode[]): DescriptionCandidate[] {
  const out: DescriptionCandidate[] = [];
  for (const node of nodes) {
    const description = firstString(node.description);
    if (description?.trim()) out.push({ value: description.trim(), source: "json-ld" });
  }
  return out;
}

/** Reads a single offer's price/currency, handling price ranges and nested priceSpecification. */
function readOfferPrice(offer: JsonLdNode): { raw: string; currency: string | null } | null {
  const priceSpec = (offer.priceSpecification ?? {}) as JsonLdNode;
  const currencyRaw = offer.priceCurrency ?? priceSpec.priceCurrency;
  const currency = typeof currencyRaw === "string" ? currencyRaw.toUpperCase() : null;

  let rawPrice: unknown = offer.price ?? priceSpec.price;
  if (rawPrice === undefined && offer.lowPrice !== undefined) {
    // Price range with no single price: use the lowest price per schema.org guidance.
    rawPrice = offer.lowPrice;
  }
  if (rawPrice === undefined || rawPrice === null || rawPrice === "") return null;
  return { raw: String(rawPrice), currency };
}

export function extractJsonLdPriceCandidates(nodes: JsonLdNode[]): PriceCandidate[] {
  const candidates: PriceCandidate[] = [];

  for (const node of nodes) {
    const offersRaw = node.offers ?? node.aggregateOffer ?? node.aggregateRating;
    if (!offersRaw && node.offers === undefined) continue;
    const source = node.offers;
    if (!source) continue;

    const offerList = (Array.isArray(source) ? source : [source]) as JsonLdNode[];
    for (const offer of offerList) {
      if (!offer || typeof offer !== "object") continue;
      const confidence = offer.priceCurrency || (offer.priceSpecification as JsonLdNode)?.priceCurrency ? "high" : "medium";

      const single = readOfferPrice(offer);
      if (single) {
        candidates.push(makePriceCandidate(single.raw, "json-ld", confidence, single.currency));
      }

      // Also surface lowPrice/highPrice explicitly (aggregateOffer-style ranges),
      // even when a direct `price` was already found, so debug output shows the range.
      if (offer.lowPrice !== undefined && offer.highPrice !== undefined) {
        const currencyRaw = offer.priceCurrency;
        const currency = typeof currencyRaw === "string" ? currencyRaw.toUpperCase() : null;
        candidates.push(
          makePriceCandidate(String(offer.lowPrice), "json-ld", currency ? "high" : "medium", currency)
        );
      }
    }
  }

  return candidates;
}
