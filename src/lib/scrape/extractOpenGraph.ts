// Open Graph, Twitter Card, and other <meta>/<link> tag extraction.
import type * as cheerio from "cheerio";
import { resolveUrl } from "./resolveUrl";
import { makePriceCandidate } from "./normalizePrice";
import type { ImageCandidate, PriceCandidate, TitleCandidate, DescriptionCandidate } from "./types";

function metaContent($: cheerio.CheerioAPI, selector: string): string | undefined {
  const val = $(selector).first().attr("content");
  return val?.trim() || undefined;
}

export interface OpenGraphTags {
  title?: string;
  description?: string;
  image?: string;
  imageUrl?: string;
  imageSecureUrl?: string;
  articleImage?: string;
  productImage?: string;
}

export function extractOpenGraphTags($: cheerio.CheerioAPI): OpenGraphTags {
  return {
    title: metaContent($, 'meta[property="og:title"]'),
    description: metaContent($, 'meta[property="og:description"]'),
    image: metaContent($, 'meta[property="og:image"]'),
    imageUrl: metaContent($, 'meta[property="og:image:url"]'),
    imageSecureUrl: metaContent($, 'meta[property="og:image:secure_url"]'),
    articleImage: metaContent($, 'meta[property="article:image"]'),
    productImage: metaContent($, 'meta[property="product:image"]'),
  };
}

export interface TwitterTags {
  title?: string;
  description?: string;
  image?: string;
  imageSrc?: string;
  price?: string;
  currency?: string;
}

export function extractTwitterTags($: cheerio.CheerioAPI): TwitterTags {
  return {
    title: metaContent($, 'meta[name="twitter:title"]'),
    description: metaContent($, 'meta[name="twitter:description"]'),
    image: metaContent($, 'meta[name="twitter:image"]'),
    imageSrc: metaContent($, 'meta[name="twitter:image:src"]'),
    price: metaContent($, 'meta[property="twitter:price"]') ?? metaContent($, 'meta[name="twitter:price"]'),
    currency:
      metaContent($, 'meta[property="twitter:currency"]') ?? metaContent($, 'meta[name="twitter:currency"]'),
  };
}

export function extractOpenGraphImageCandidates(
  $: cheerio.CheerioAPI,
  baseUrl: string
): ImageCandidate[] {
  const og = extractOpenGraphTags($);
  const twitter = extractTwitterTags($);
  const candidates: ImageCandidate[] = [];
  const seen = new Set<string>();

  const push = (raw: string | undefined, source: ImageCandidate["source"], score: number) => {
    const resolved = resolveUrl(raw, baseUrl);
    if (!resolved || seen.has(resolved)) return;
    seen.add(resolved);
    candidates.push({ url: resolved, source, score });
  };

  push(og.imageSecureUrl, "og", 72);
  push(og.image, "og", 70);
  push(og.imageUrl, "og", 68);
  push(og.productImage, "og", 65);
  push(og.articleImage, "og", 55);
  push(twitter.image, "twitter", 60);
  push(twitter.imageSrc, "twitter", 58);

  return candidates;
}

export function extractLinkMetaImageCandidates(
  $: cheerio.CheerioAPI,
  baseUrl: string
): ImageCandidate[] {
  const candidates: ImageCandidate[] = [];
  const seen = new Set<string>();

  const push = (raw: string | undefined, score: number) => {
    const resolved = resolveUrl(raw, baseUrl);
    if (!resolved || seen.has(resolved)) return;
    seen.add(resolved);
    candidates.push({ url: resolved, source: "link", score });
  };

  push($('link[rel="image_src"]').first().attr("href"), 50);
  push($('meta[itemprop="image"]').first().attr("content"), 45);
  push($('meta[name="thumbnail"]').first().attr("content"), 40);
  push($('meta[property="thumbnail"]').first().attr("content"), 40);

  return candidates;
}

export function extractOpenGraphTitleCandidates($: cheerio.CheerioAPI): TitleCandidate[] {
  const og = extractOpenGraphTags($);
  const twitter = extractTwitterTags($);
  const metaTitle = metaContent($, 'meta[name="title"]');
  const out: TitleCandidate[] = [];
  if (og.title) out.push({ value: og.title, source: "og" });
  if (twitter.title) out.push({ value: twitter.title, source: "twitter" });
  if (metaTitle) out.push({ value: metaTitle, source: "meta" });
  const tagTitle = $("title").first().text().trim();
  if (tagTitle) out.push({ value: tagTitle, source: "html-title" });
  return out;
}

export function extractOpenGraphDescriptionCandidates($: cheerio.CheerioAPI): DescriptionCandidate[] {
  const og = extractOpenGraphTags($);
  const twitter = extractTwitterTags($);
  const metaDescription = metaContent($, 'meta[name="description"]');
  const out: DescriptionCandidate[] = [];
  if (og.description) out.push({ value: og.description, source: "og" });
  if (twitter.description) out.push({ value: twitter.description, source: "twitter" });
  if (metaDescription) out.push({ value: metaDescription, source: "meta" });
  return out;
}

export function extractMetaPriceCandidates($: cheerio.CheerioAPI): PriceCandidate[] {
  const candidates: PriceCandidate[] = [];

  const productAmount = metaContent($, 'meta[property="product:price:amount"]');
  const productCurrency = metaContent($, 'meta[property="product:price:currency"]');
  if (productAmount) {
    candidates.push(makePriceCandidate(productAmount, "meta", "high", productCurrency?.toUpperCase() ?? null));
  }

  const ogAmount = metaContent($, 'meta[property="og:price:amount"]');
  const ogCurrency = metaContent($, 'meta[property="og:price:currency"]');
  if (ogAmount) {
    candidates.push(makePriceCandidate(ogAmount, "og", "high", ogCurrency?.toUpperCase() ?? null));
  }

  const nameAmount = metaContent($, 'meta[name="price"]');
  const nameCurrency = metaContent($, 'meta[name="currency"]');
  if (nameAmount) {
    candidates.push(makePriceCandidate(nameAmount, "meta", "medium", nameCurrency?.toUpperCase() ?? null));
  }

  const twitter = extractTwitterTags($);
  if (twitter.price) {
    candidates.push(makePriceCandidate(twitter.price, "twitter", "medium", twitter.currency?.toUpperCase() ?? null));
  }

  return candidates;
}
