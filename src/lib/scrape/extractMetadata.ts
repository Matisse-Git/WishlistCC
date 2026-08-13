// Orchestrates title/description/image/price/currency extraction for an
// already-fetched, already-parsed page, combining every source module and
// recording enough detail (candidates, rejections, selection reasons) to
// power the debug/diagnostics view.
import type * as cheerio from "cheerio";
import { parseJsonLdBlocks, findProductNodes, extractJsonLdTitleCandidates, extractJsonLdDescriptionCandidates } from "./extractJsonLd";
import { extractOpenGraphTitleCandidates, extractOpenGraphDescriptionCandidates } from "./extractOpenGraph";
import { extractMicrodataTitleCandidates, extractMicrodataDescriptionCandidates, hasMicrodata } from "./microdata";
import { gatherImageCandidates, pickBestImage } from "./extractImages";
import { gatherPriceCandidates, pickBestPrice } from "./extractPrices";
import { normalizeCurrencyCode } from "./normalizeCurrency";
import type { ExtractionDebugInfo, FetchDebugInfo, TitleCandidate, DescriptionCandidate } from "./types";

function truncate(value: string | null | undefined, max: number): string | null {
  if (!value) return null;
  const trimmed = value.trim().replace(/\s+/g, " ");
  if (!trimmed) return null;
  return trimmed.length > max ? trimmed.slice(0, max) : trimmed;
}

function pickBestText(candidates: (TitleCandidate | DescriptionCandidate)[]): { value: string | null; source: TitleCandidate["source"] | null } {
  const first = candidates.find((c) => c.value.trim().length > 0);
  return first ? { value: first.value, source: first.source } : { value: null, source: null };
}

export interface ExtractedMetadata {
  title: string | null;
  description: string | null;
  imageUrl: string | null;
  price: string | null;
  currency: string | null;
  debug: ExtractionDebugInfo;
}

export function extractMetadata(
  $: cheerio.CheerioAPI,
  finalUrl: string,
  fetchDebug?: FetchDebugInfo
): ExtractedMetadata {
  const { nodes: jsonLdNodes, blocksFound, parseErrors } = parseJsonLdBlocks($);
  const productNodes = findProductNodes(jsonLdNodes);
  // Prefer product-typed nodes for title/description; fall back to any JSON-LD node.
  const jsonLdForText = productNodes.length > 0 ? productNodes : jsonLdNodes;

  // ---- Title ----
  const titleCandidates: TitleCandidate[] = [
    ...extractJsonLdTitleCandidates(jsonLdForText),
    ...extractOpenGraphTitleCandidates($),
    ...extractMicrodataTitleCandidates($),
  ];
  const titlePick = pickBestText(titleCandidates);
  const title = truncate(titlePick.value, 300);

  // ---- Description ----
  const descriptionCandidates: DescriptionCandidate[] = [
    ...extractJsonLdDescriptionCandidates(jsonLdForText),
    ...extractOpenGraphDescriptionCandidates($),
    ...extractMicrodataDescriptionCandidates($),
  ];
  const descriptionPick = pickBestText(descriptionCandidates);
  const description = truncate(descriptionPick.value, 2000);

  // ---- Image ----
  const imageExtraction = gatherImageCandidates($, finalUrl, jsonLdNodes);
  const { best: bestImage, alternates: imageAlternates } = pickBestImage(imageExtraction.accepted);
  let imageRejectionReason: string | null = null;
  if (!bestImage) {
    imageRejectionReason =
      imageExtraction.rejected.length > 0
        ? `${imageExtraction.rejected.length} candidate(s) found but all were filtered out (e.g. ${imageExtraction.rejected[0].rejected}).`
        : "No image tags, Open Graph, Twitter, or JSON-LD image data found on the page.";
  }

  // ---- Price ----
  const priceCandidates = gatherPriceCandidates($, jsonLdNodes);
  const { best: bestPrice, alternates: priceAlternates } = pickBestPrice(priceCandidates);
  let priceRejectionReason: string | null = null;
  if (!bestPrice) {
    priceRejectionReason =
      priceCandidates.length > 0
        ? "Price-like text was found but could not be parsed into a valid amount."
        : "No JSON-LD offers, price meta tags, microdata, or visible price text found on the page.";
  }

  const currency = bestPrice ? normalizeCurrencyCode(bestPrice.currency) : null;

  const openGraphTagsFound: string[] = [];
  if ($('meta[property="og:title"]').length) openGraphTagsFound.push("og:title");
  if ($('meta[property="og:image"]').length) openGraphTagsFound.push("og:image");
  if ($('meta[property="og:description"]').length) openGraphTagsFound.push("og:description");
  if ($('meta[property="product:price:amount"]').length) openGraphTagsFound.push("product:price:amount");

  const debug: ExtractionDebugInfo = {
    fetch:
      fetchDebug ?? {
        requestedUrl: finalUrl,
        finalUrl,
        ok: true,
        status: 200,
        contentType: "text/html",
        contentLength: null,
        htmlEmpty: false,
        error: null,
      },
    jsonLdBlocksFound: blocksFound,
    jsonLdParseErrors: parseErrors,
    jsonLdProductNodesFound: productNodes.length,
    openGraphTagsFound,
    microdataFound: hasMicrodata($),
    titles: titleCandidates,
    descriptions: descriptionCandidates,
    images: bestImage ? [bestImage] : [],
    imageAlternates,
    prices: bestPrice ? [bestPrice] : [],
    priceAlternates,
    selectedTitleSource: titlePick.source,
    selectedImageSource: bestImage?.source ?? null,
    selectedPriceSource: bestPrice?.source ?? null,
    imageRejectionReason,
    priceRejectionReason,
  };

  return {
    title,
    description,
    imageUrl: bestImage?.url ?? null,
    price: bestPrice?.amount ?? null,
    currency,
    debug,
  };
}
