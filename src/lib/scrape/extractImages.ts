// Image candidate gathering, filtering, and scoring. Combines JSON-LD,
// Open Graph/Twitter, link/meta tags, and — only as a last resort — a scan
// of <img> tags on the page, since raw <img> scraping is the noisiest and
// most failure-prone source (site chrome, ads, tracking pixels, icons).
import type * as cheerio from "cheerio";
import { resolveUrl, firstUrlFromSrcset } from "./resolveUrl";
import { extractJsonLdImageCandidates, type JsonLdNode } from "./extractJsonLd";
import { extractOpenGraphImageCandidates, extractLinkMetaImageCandidates } from "./extractOpenGraph";
import { extractMicrodataImageCandidates } from "./microdata";
import type { ImageCandidate } from "./types";

const BAD_IMAGE_KEYWORDS = [
  "logo",
  "icon",
  "favicon",
  "sprite",
  "avatar",
  "blank",
  "placeholder",
  "tracking",
  "pixel",
  "analytics",
  "spacer",
  "1x1",
];

const BAD_IMAGE_KEYWORD_RE = new RegExp(`(${BAD_IMAGE_KEYWORDS.join("|")})`, "i");

const PRODUCT_HINT_RE = /(product|hero|gallery|main[-_]?image|zoom|detail)/i;

export interface ImageRejection {
  url: string;
  reason: string;
}

/** Returns a rejection reason string, or null if the candidate looks acceptable. */
export function evaluateImageCandidate(url: string, width?: number, height?: number): string | null {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return "not a resolvable URL";
  }

  if (width !== undefined && height !== undefined) {
    if (width <= 2 && height <= 2) return "1x1 tracking pixel";
    if (width < 32 && height < 32) return "too small to be a product image (likely an icon)";
  }

  const pathAndQuery = `${parsed.pathname}${parsed.search}`;
  if (BAD_IMAGE_KEYWORD_RE.test(pathAndQuery)) {
    const match = pathAndQuery.match(BAD_IMAGE_KEYWORD_RE);
    return `filename/path suggests a non-product image ("${match?.[0]}")`;
  }

  if (parsed.pathname.toLowerCase().endsWith(".svg")) {
    return "svg (deprioritized unless it's the only candidate)";
  }

  return null;
}

function dimensionBonus(width?: number, height?: number): number {
  if (!width || !height) return 0;
  const area = width * height;
  return Math.min(20, Math.round(area / 40000));
}

function finalizeScore(candidate: ImageCandidate): number {
  let score = candidate.score;
  if (candidate.url.startsWith("https://")) score += 3;
  score += dimensionBonus(candidate.width, candidate.height);
  if (candidate.url.toLowerCase().endsWith(".svg")) score -= 25;
  return score;
}

function readImgElementCandidate(
  $img: cheerio.Cheerio<import("domhandler").Element>
): { raw: string | null; width?: number; height?: number; productHint: boolean } {
  const raw =
    $img.attr("src") ||
    $img.attr("data-src") ||
    $img.attr("data-lazy-src") ||
    $img.attr("data-original") ||
    firstUrlFromSrcset($img.attr("data-srcset")) ||
    firstUrlFromSrcset($img.attr("srcset")) ||
    $img.attr("data-lazyload") ||
    null;

  const width = Number(($img.attr("width") || "").replace(/[^\d]/g, "")) || undefined;
  const height = Number(($img.attr("height") || "").replace(/[^\d]/g, "")) || undefined;

  const classAndId = `${$img.attr("class") ?? ""} ${$img.attr("id") ?? ""}`;
  const parentClassAndId = `${$img.parent().attr("class") ?? ""} ${$img.parent().attr("id") ?? ""}`;
  const productHint = PRODUCT_HINT_RE.test(classAndId) || PRODUCT_HINT_RE.test(parentClassAndId);

  return { raw, width, height, productHint };
}

export function htmlImgFallbackCandidates($: cheerio.CheerioAPI, baseUrl: string): ImageCandidate[] {
  const candidates: ImageCandidate[] = [];
  const seen = new Set<string>();

  $("img").each((_, el) => {
    const $img = $(el);
    const { raw, width, height, productHint } = readImgElementCandidate($img);
    const resolved = resolveUrl(raw, baseUrl);
    if (!resolved || seen.has(resolved)) return;
    seen.add(resolved);

    const rejection = evaluateImageCandidate(resolved, width, height);
    if (rejection && !rejection.startsWith("svg")) {
      candidates.push({ url: resolved, source: "html-img", score: 5, width, height, rejected: rejection });
      return;
    }

    candidates.push({
      url: resolved,
      source: "html-img",
      score: 15 + (productHint ? 15 : 0),
      width,
      height,
      rejected: rejection ?? undefined,
    });
  });

  return candidates;
}

export interface ImageExtractionResult {
  accepted: ImageCandidate[];
  rejected: ImageCandidate[];
}

/**
 * Gathers image candidates in order of preference (JSON-LD > Open Graph >
 * Twitter > link/meta tags), falling back to an <img> scan only when none
 * of the structured sources produced an acceptable candidate.
 */
export function gatherImageCandidates(
  $: cheerio.CheerioAPI,
  baseUrl: string,
  jsonLdNodes: JsonLdNode[]
): ImageExtractionResult {
  const structured: ImageCandidate[] = [
    ...extractJsonLdImageCandidates(jsonLdNodes, baseUrl),
    ...extractOpenGraphImageCandidates($, baseUrl),
    ...extractLinkMetaImageCandidates($, baseUrl),
    ...extractMicrodataImageCandidates($, baseUrl),
  ];

  const accepted: ImageCandidate[] = [];
  const rejected: ImageCandidate[] = [];

  for (const candidate of structured) {
    const rejection = evaluateImageCandidate(candidate.url, candidate.width, candidate.height);
    if (rejection && !rejection.startsWith("svg")) {
      rejected.push({ ...candidate, rejected: rejection });
    } else {
      accepted.push({ ...candidate, rejected: rejection ?? undefined });
    }
  }

  // Only fall back to scanning <img> tags when structured sources found nothing usable.
  if (accepted.filter((c) => !c.url.toLowerCase().endsWith(".svg")).length === 0) {
    const htmlCandidates = htmlImgFallbackCandidates($, baseUrl);
    for (const candidate of htmlCandidates) {
      if (candidate.rejected) rejected.push(candidate);
      else accepted.push(candidate);
    }
  }

  return { accepted, rejected };
}

export interface BestImageResult {
  best: ImageCandidate | null;
  alternates: ImageCandidate[];
}

export function pickBestImage(candidates: ImageCandidate[]): BestImageResult {
  if (candidates.length === 0) return { best: null, alternates: [] };
  const scored = candidates
    .map((c) => ({ ...c, score: finalizeScore(c) }))
    .sort((a, b) => b.score - a.score);
  const [best, ...alternates] = scored;
  return { best, alternates: alternates.slice(0, 8) };
}
