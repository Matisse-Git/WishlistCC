import * as cheerio from "cheerio";
import { parsePriceString } from "./money";

const FETCH_TIMEOUT_MS = 9000;
const MAX_REDIRECTS = 5;
const MAX_HTML_BYTES = 3 * 1024 * 1024; // 3MB cap
const USER_AGENT =
  "Mozilla/5.0 (compatible; WishListCC/1.0; personal wishlist link preview bot)";

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
}

// ---------------------------------------------------------------------------
// URL safety
// ---------------------------------------------------------------------------

export type SafeUrlCheck = { ok: true; url: URL } | { ok: false; reason: string };

export function isSafeUrl(input: string): SafeUrlCheck {
  let url: URL;
  try {
    url = new URL(input);
  } catch {
    return { ok: false, reason: "That doesn't look like a valid URL." };
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    return { ok: false, reason: "Only http:// and https:// URLs are supported." };
  }
  if (isPrivateHostname(url.hostname.toLowerCase())) {
    return { ok: false, reason: "URLs pointing to internal/private hosts are not allowed." };
  }
  return { ok: true, url };
}

function isPrivateHostname(hostname: string): boolean {
  const bare = hostname.replace(/^\[|\]$/g, "");
  if (bare === "localhost" || bare.endsWith(".localhost")) return true;
  if (bare === "0.0.0.0" || bare === "::1" || bare === "::") return true;

  const ipv4 = bare.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (ipv4) {
    const a = Number(ipv4[1]);
    const b = Number(ipv4[2]);
    if (a === 127) return true; // loopback
    if (a === 10) return true; // 10.0.0.0/8
    if (a === 192 && b === 168) return true; // 192.168.0.0/16
    if (a === 172 && b >= 16 && b <= 31) return true; // 172.16.0.0/12
    if (a === 169 && b === 254) return true; // link-local
    if (a === 0) return true;
    return false;
  }

  // IPv6 unique-local / link-local literals.
  if (/^fc[0-9a-f]{2}:/i.test(bare) || /^fd[0-9a-f]{2}:/i.test(bare)) return true;
  if (/^fe80:/i.test(bare)) return true;

  return false;
}

// ---------------------------------------------------------------------------
// Store / domain naming
// ---------------------------------------------------------------------------

const STORE_NAME_MAP: Record<string, string> = {
  "amazon.com": "Amazon",
  "amazon.co.uk": "Amazon",
  "amazon.ca": "Amazon",
  "amazon.de": "Amazon",
  "amazon.fr": "Amazon",
  "amazon.it": "Amazon",
  "amazon.es": "Amazon",
  "amazon.co.jp": "Amazon",
  "amazon.in": "Amazon",
  "amazon.com.au": "Amazon",
  "ebay.com": "eBay",
  "ebay.co.uk": "eBay",
  "ebay.de": "eBay",
  "etsy.com": "Etsy",
  "aliexpress.com": "AliExpress",
  "aliexpress.us": "AliExpress",
  "walmart.com": "Walmart",
  "target.com": "Target",
  "bestbuy.com": "Best Buy",
  "wayfair.com": "Wayfair",
  "ikea.com": "IKEA",
  "newegg.com": "Newegg",
  "zappos.com": "Zappos",
};

export function storeNameFromUrl(url: URL): string {
  let hostname = url.hostname.toLowerCase();
  if (hostname.startsWith("www.")) hostname = hostname.slice(4);
  if (STORE_NAME_MAP[hostname]) return STORE_NAME_MAP[hostname];
  const parts = hostname.split(".");
  if (parts.length > 2) {
    const base = parts.slice(-2).join(".");
    if (STORE_NAME_MAP[base]) return STORE_NAME_MAP[base];
  }
  return hostname;
}

// ---------------------------------------------------------------------------
// Safe fetch with manual redirect validation + size/time limits
// ---------------------------------------------------------------------------

type FetchOutcome = { html: string; finalUrl: string } | { error: string };

async function safeFetchHtml(startUrl: URL): Promise<FetchOutcome> {
  let currentUrl = startUrl;

  for (let attempt = 0; attempt <= MAX_REDIRECTS; attempt++) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
    let res: Response;
    try {
      res = await fetch(currentUrl.toString(), {
        redirect: "manual",
        signal: controller.signal,
        headers: {
          "User-Agent": USER_AGENT,
          Accept: "text/html,application/xhtml+xml",
        },
      });
    } catch {
      clearTimeout(timeout);
      return { error: "timeout_or_network" };
    }
    clearTimeout(timeout);

    if (res.status >= 300 && res.status < 400) {
      const location = res.headers.get("location");
      if (!location) return { error: "redirect_no_location" };
      let nextUrl: URL;
      try {
        nextUrl = new URL(location, currentUrl);
      } catch {
        return { error: "invalid_redirect" };
      }
      const check = isSafeUrl(nextUrl.toString());
      if (!check.ok) return { error: "unsafe_redirect_target" };
      currentUrl = check.url;
      continue;
    }

    if (!res.ok) {
      return { error: `http_${res.status}` };
    }

    const contentType = res.headers.get("content-type") ?? "";
    if (!contentType.includes("html")) {
      return { error: "non_html_content" };
    }

    const html = await readBodyCapped(res, MAX_HTML_BYTES);
    return { html, finalUrl: currentUrl.toString() };
  }

  return { error: "too_many_redirects" };
}

async function readBodyCapped(res: Response, maxBytes: number): Promise<string> {
  const reader = res.body?.getReader();
  if (!reader) return (await res.text()).slice(0, maxBytes);

  const chunks: Uint8Array[] = [];
  let received = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    if (value) {
      received += value.byteLength;
      chunks.push(value);
      if (received >= maxBytes) {
        await reader.cancel().catch(() => {});
        break;
      }
    }
  }
  return Buffer.concat(chunks.map((c) => Buffer.from(c))).toString("utf-8");
}

function describeFetchError(error: string): string {
  if (error === "too_many_redirects") return "Too many redirects — could not reach the final page.";
  if (error === "non_html_content") return "The URL did not return an HTML page.";
  if (error === "unsafe_redirect_target") return "The page redirected to a disallowed internal address.";
  if (error.startsWith("http_")) {
    const code = error.replace("http_", "");
    return `The site returned an error (HTTP ${code}). Could not automatically fetch details. You can fill them in manually.`;
  }
  if (error === "timeout_or_network") {
    return "Could not reach the URL (timed out or network error). Could not automatically fetch details. You can fill them in manually.";
  }
  return "Could not automatically fetch details. You can fill them in manually.";
}

// ---------------------------------------------------------------------------
// JSON-LD helpers
// ---------------------------------------------------------------------------

type JsonLdNode = Record<string, unknown>;

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

function firstString(value: unknown): string | undefined {
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
  }
  return undefined;
}

export function extractOfferPrice(product: JsonLdNode): { amount: string; currency: string | null } | null {
  const offersRaw = product.offers;
  if (!offersRaw) return null;
  const offerList = (Array.isArray(offersRaw) ? offersRaw : [offersRaw]) as JsonLdNode[];

  for (const offer of offerList) {
    if (!offer || typeof offer !== "object") continue;
    const priceSpec = (offer.priceSpecification ?? {}) as JsonLdNode;
    const currencyRaw = offer.priceCurrency ?? priceSpec.priceCurrency;
    const currency = typeof currencyRaw === "string" ? currencyRaw.toUpperCase() : null;

    let rawPrice: unknown = offer.price ?? priceSpec.price;
    if (offer.lowPrice !== undefined) {
      // Price range: use the lowest price per spec, keep the range in rawMetadata.
      rawPrice = offer.lowPrice;
    }
    if (rawPrice === undefined || rawPrice === null || rawPrice === "") continue;

    const parsed = parsePriceString(String(rawPrice));
    if (parsed.amount) {
      return { amount: parsed.amount, currency: currency ?? parsed.currency };
    }
  }
  return null;
}

// ---------------------------------------------------------------------------
// Metadata extraction
// ---------------------------------------------------------------------------

function resolveUrl(src: string | undefined | null, base: string): string | null {
  if (!src) return null;
  try {
    return new URL(src, base).toString();
  } catch {
    return null;
  }
}

function truncate(value: string | null | undefined, max: number): string | null {
  if (!value) return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  return trimmed.length > max ? trimmed.slice(0, max) : trimmed;
}

function firstReasonableImage($: cheerio.CheerioAPI, base: string): string | null {
  let found: string | null = null;
  $("img").each((_, el) => {
    if (found) return;
    const src = $(el).attr("src") || $(el).attr("data-src");
    if (!src) return;
    if (/sprite|icon|logo|pixel|blank|spacer/i.test(src)) return;
    const resolved = resolveUrl(src, base);
    if (resolved) found = resolved;
  });
  return found;
}

interface ExtractedMetadata {
  title: string | null;
  description: string | null;
  imageUrl: string | null;
  price: string | null;
  currency: string | null;
  rawMetadata: Record<string, unknown>;
}

export function extractMetadata($: cheerio.CheerioAPI, finalUrl: string): ExtractedMetadata {
  const raw: Record<string, unknown> = {};

  const og = {
    title: $('meta[property="og:title"]').attr("content"),
    description: $('meta[property="og:description"]').attr("content"),
    image: $('meta[property="og:image"]').attr("content"),
  };
  raw.og = og;

  const twitter = {
    title: $('meta[name="twitter:title"]').attr("content"),
    description: $('meta[name="twitter:description"]').attr("content"),
    image: $('meta[name="twitter:image"]').attr("content"),
  };
  raw.twitter = twitter;

  const productMeta = {
    priceAmount: $('meta[property="product:price:amount"]').attr("content"),
    priceCurrency: $('meta[property="product:price:currency"]').attr("content"),
  };
  raw.productMeta = productMeta;

  const metaTitle = $('meta[name="title"]').attr("content");
  const metaDescription = $('meta[name="description"]').attr("content");

  const jsonLdNodes: JsonLdNode[] = [];
  $('script[type="application/ld+json"]').each((_, el) => {
    const text = $(el).contents().text();
    if (!text?.trim()) return;
    try {
      const parsed = JSON.parse(text);
      flattenJsonLd(parsed, jsonLdNodes);
    } catch {
      // Malformed JSON-LD block — ignore and keep looking.
    }
  });
  raw.jsonLd = jsonLdNodes.slice(0, 10);

  const product = jsonLdNodes.find(isProductLike);

  const microdata = {
    name:
      $('[itemprop="name"]').first().attr("content") ||
      $('[itemprop="name"]').first().text().trim() ||
      undefined,
    image:
      $('[itemprop="image"]').first().attr("content") ||
      $('[itemprop="image"]').first().attr("src") ||
      undefined,
    description:
      $('[itemprop="description"]').first().attr("content") ||
      $('[itemprop="description"]').first().text().trim() ||
      undefined,
    price:
      $('[itemprop="price"]').first().attr("content") ||
      $('[itemprop="price"]').first().text().trim() ||
      undefined,
    priceCurrency: $('[itemprop="priceCurrency"]').first().attr("content") || undefined,
  };
  raw.microdata = microdata;

  const productName = product ? firstString(product.name) : undefined;
  const productDescription = product ? firstString(product.description) : undefined;
  const productImage = product ? firstString(product.image) : undefined;

  const title = truncate(
    productName ||
      og.title ||
      twitter.title ||
      microdata.name ||
      metaTitle ||
      $("title").first().text().trim() ||
      null,
    300
  );

  const description = truncate(
    productDescription || og.description || twitter.description || microdata.description || metaDescription || null,
    2000
  );

  const imageUrl =
    resolveUrl(productImage, finalUrl) ||
    resolveUrl(og.image, finalUrl) ||
    resolveUrl(twitter.image, finalUrl) ||
    resolveUrl(microdata.image, finalUrl) ||
    firstReasonableImage($, finalUrl);

  let price: string | null = null;
  let currency: string | null = null;

  if (product) {
    const offerPrice = extractOfferPrice(product);
    if (offerPrice) {
      price = offerPrice.amount;
      currency = offerPrice.currency;
    }
  }
  if (!price && productMeta.priceAmount) {
    const parsed = parsePriceString(productMeta.priceAmount);
    price = parsed.amount;
    currency = currency || (productMeta.priceCurrency ?? null) || parsed.currency;
  }
  if (!price && microdata.price) {
    const parsed = parsePriceString(microdata.price);
    price = parsed.amount;
    currency = currency || (microdata.priceCurrency ?? null) || parsed.currency;
  }
  if (!currency && productMeta.priceCurrency) currency = productMeta.priceCurrency.toUpperCase();
  if (!currency && microdata.priceCurrency) currency = microdata.priceCurrency.toUpperCase();

  return { title, description, imageUrl, price, currency, rawMetadata: raw };
}

// ---------------------------------------------------------------------------
// Public entry point
// ---------------------------------------------------------------------------

export async function fetchProductPreview(rawUrl: string): Promise<PreviewResult> {
  const warnings: string[] = [];
  const safe = isSafeUrl(rawUrl);
  if (!safe.ok) {
    return {
      url: rawUrl,
      title: null,
      description: null,
      imageUrl: null,
      price: null,
      currency: null,
      store: null,
      rawMetadata: null,
      warnings: [safe.reason],
    };
  }

  const store = storeNameFromUrl(safe.url);
  const fetchResult = await safeFetchHtml(safe.url);

  if ("error" in fetchResult) {
    warnings.push(describeFetchError(fetchResult.error));
    return {
      url: rawUrl,
      title: null,
      description: null,
      imageUrl: null,
      price: null,
      currency: null,
      store,
      rawMetadata: null,
      warnings,
    };
  }

  let extracted: ExtractedMetadata;
  try {
    const $ = cheerio.load(fetchResult.html);
    extracted = extractMetadata($, fetchResult.finalUrl);
  } catch {
    warnings.push("Could not parse the page's HTML. You can fill in details manually.");
    return {
      url: fetchResult.finalUrl,
      title: null,
      description: null,
      imageUrl: null,
      price: null,
      currency: null,
      store,
      rawMetadata: null,
      warnings,
    };
  }

  if (!extracted.title) warnings.push("No title could be found — please enter one manually.");
  if (!extracted.price) warnings.push("No price could be found — please enter one manually.");
  if (!extracted.imageUrl) warnings.push("No image could be found.");

  return {
    url: fetchResult.finalUrl,
    title: extracted.title,
    description: extracted.description,
    imageUrl: extracted.imageUrl,
    price: extracted.price,
    currency: extracted.currency,
    store,
    rawMetadata: extracted.rawMetadata,
    warnings,
  };
}
