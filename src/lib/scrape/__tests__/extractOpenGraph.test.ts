import { describe, it, expect } from "vitest";
import * as cheerio from "cheerio";
import {
  extractOpenGraphTags,
  extractTwitterTags,
  extractOpenGraphImageCandidates,
  extractLinkMetaImageCandidates,
  extractOpenGraphTitleCandidates,
  extractOpenGraphDescriptionCandidates,
  extractMetaPriceCandidates,
} from "../extractOpenGraph";

const base = "https://example.com/product";

describe("extractOpenGraphTags / extractTwitterTags", () => {
  it("reads og and twitter meta content", () => {
    const $ = cheerio.load(`
      <meta property="og:title" content="OG Title" />
      <meta property="og:image" content="/og.jpg" />
      <meta name="twitter:image" content="/tw.jpg" />
    `);
    expect(extractOpenGraphTags($).title).toBe("OG Title");
    expect(extractOpenGraphTags($).image).toBe("/og.jpg");
    expect(extractTwitterTags($).image).toBe("/tw.jpg");
  });
});

describe("extractOpenGraphImageCandidates", () => {
  it("extracts og:image and resolves it to an absolute URL", () => {
    const $ = cheerio.load(`<meta property="og:image" content="/og.jpg" />`);
    const candidates = extractOpenGraphImageCandidates($, base);
    expect(candidates[0].url).toBe("https://example.com/og.jpg");
    expect(candidates[0].source).toBe("og");
  });

  it("prefers og:image:secure_url over og:image when both are present", () => {
    const $ = cheerio.load(`
      <meta property="og:image" content="/plain.jpg" />
      <meta property="og:image:secure_url" content="/secure.jpg" />
    `);
    const candidates = extractOpenGraphImageCandidates($, base);
    expect(candidates[0].url).toBe("https://example.com/secure.jpg");
  });

  it("falls back to twitter:image when there's no og:image", () => {
    const $ = cheerio.load(`<meta name="twitter:image" content="/tw.jpg" />`);
    const candidates = extractOpenGraphImageCandidates($, base);
    expect(candidates.some((c) => c.url === "https://example.com/tw.jpg" && c.source === "twitter")).toBe(true);
  });

  it("returns an empty list when no og/twitter image tags exist", () => {
    const $ = cheerio.load(`<html><head></head><body></body></html>`);
    expect(extractOpenGraphImageCandidates($, base)).toHaveLength(0);
  });
});

describe("extractLinkMetaImageCandidates", () => {
  it("reads link[rel=image_src]", () => {
    const $ = cheerio.load(`<link rel="image_src" href="/link-img.jpg" />`);
    const candidates = extractLinkMetaImageCandidates($, base);
    expect(candidates[0].url).toBe("https://example.com/link-img.jpg");
  });

  it("reads meta[itemprop=image] and meta[name=thumbnail]", () => {
    const $ = cheerio.load(`
      <meta itemprop="image" content="/itemprop.jpg" />
      <meta name="thumbnail" content="/thumb.jpg" />
    `);
    const urls = extractLinkMetaImageCandidates($, base).map((c) => c.url);
    expect(urls).toContain("https://example.com/itemprop.jpg");
    expect(urls).toContain("https://example.com/thumb.jpg");
  });
});

describe("extractOpenGraphTitleCandidates", () => {
  it("falls back through og -> twitter -> meta[name=title] -> <title>", () => {
    const $ = cheerio.load(`<html><head><title>Bare Title</title></head><body></body></html>`);
    const candidates = extractOpenGraphTitleCandidates($);
    expect(candidates).toEqual([{ value: "Bare Title", source: "html-title" }]);
  });

  it("prefers og:title first when present", () => {
    const $ = cheerio.load(`
      <html><head>
        <title>Fallback</title>
        <meta property="og:title" content="OG Title" />
      </head></html>
    `);
    const candidates = extractOpenGraphTitleCandidates($);
    expect(candidates[0]).toEqual({ value: "OG Title", source: "og" });
  });
});

describe("extractOpenGraphDescriptionCandidates", () => {
  it("reads og:description", () => {
    const $ = cheerio.load(`<meta property="og:description" content="A great product" />`);
    expect(extractOpenGraphDescriptionCandidates($)[0]).toEqual({ value: "A great product", source: "og" });
  });
});

describe("extractMetaPriceCandidates", () => {
  it("reads product:price:amount / product:price:currency as high confidence", () => {
    const $ = cheerio.load(`
      <meta property="product:price:amount" content="99.95" />
      <meta property="product:price:currency" content="EUR" />
    `);
    const candidates = extractMetaPriceCandidates($);
    expect(candidates[0]).toMatchObject({ amount: "99.95", currency: "EUR", confidence: "high", source: "meta" });
  });

  it("reads og:price:amount / og:price:currency", () => {
    const $ = cheerio.load(`
      <meta property="og:price:amount" content="49.00" />
      <meta property="og:price:currency" content="USD" />
    `);
    const candidates = extractMetaPriceCandidates($);
    expect(candidates.some((c) => c.amount === "49.00" && c.currency === "USD")).toBe(true);
  });

  it("reads twitter:price / twitter:currency as medium confidence", () => {
    const $ = cheerio.load(`
      <meta name="twitter:price" content="15.00" />
      <meta name="twitter:currency" content="GBP" />
    `);
    const candidates = extractMetaPriceCandidates($);
    expect(candidates.some((c) => c.amount === "15.00" && c.confidence === "medium")).toBe(true);
  });

  it("returns an empty list when no price meta tags exist", () => {
    const $ = cheerio.load(`<html><head></head></html>`);
    expect(extractMetaPriceCandidates($)).toHaveLength(0);
  });
});
