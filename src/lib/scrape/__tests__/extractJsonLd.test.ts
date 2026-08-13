import { describe, it, expect } from "vitest";
import * as cheerio from "cheerio";
import {
  flattenJsonLd,
  isProductLike,
  parseJsonLdBlocks,
  findProductNodes,
  extractJsonLdImageCandidates,
  extractJsonLdPriceCandidates,
  extractJsonLdTitleCandidates,
} from "../extractJsonLd";

describe("flattenJsonLd", () => {
  it("flattens a single object", () => {
    const out: Record<string, unknown>[] = [];
    flattenJsonLd({ "@type": "Product", name: "Widget" }, out);
    expect(out).toHaveLength(1);
  });

  it("flattens nested arrays", () => {
    const out: Record<string, unknown>[] = [];
    flattenJsonLd([{ "@type": "Product" }, [{ "@type": "Offer" }, { "@type": "Product" }]], out);
    expect(out).toHaveLength(3);
  });

  it("flattens an @graph wrapper alongside the wrapper node itself", () => {
    const out: Record<string, unknown>[] = [];
    flattenJsonLd({ "@graph": [{ "@type": "Product", name: "A" }, { "@type": "Organization" }] }, out);
    expect(out.some((n) => n.name === "A")).toBe(true);
  });

  it("ignores non-object garbage without throwing", () => {
    const out: Record<string, unknown>[] = [];
    expect(() => flattenJsonLd("not an object", out)).not.toThrow();
    expect(() => flattenJsonLd(null, out)).not.toThrow();
    expect(out).toHaveLength(0);
  });
});

describe("isProductLike", () => {
  it("matches Product, ProductGroup, IndividualProduct case-insensitively", () => {
    expect(isProductLike({ "@type": "Product" })).toBe(true);
    expect(isProductLike({ "@type": "productgroup" })).toBe(true);
    expect(isProductLike({ "@type": "IndividualProduct" })).toBe(true);
  });

  it("matches when @type is an array containing a product type", () => {
    expect(isProductLike({ "@type": ["Thing", "Product"] })).toBe(true);
  });

  it("rejects unrelated types", () => {
    expect(isProductLike({ "@type": "Organization" })).toBe(false);
    expect(isProductLike({})).toBe(false);
  });
});

describe("parseJsonLdBlocks", () => {
  it("parses multiple valid blocks", () => {
    const html = `
      <script type="application/ld+json">{"@type":"Product","name":"A"}</script>
      <script type="application/ld+json">{"@type":"Organization","name":"B"}</script>`;
    const $ = cheerio.load(html);
    const result = parseJsonLdBlocks($);
    expect(result.blocksFound).toBe(2);
    expect(result.parseErrors).toBe(0);
    expect(result.nodes).toHaveLength(2);
  });

  it("counts malformed blocks as parse errors without throwing, and keeps parsing the rest", () => {
    const html = `
      <script type="application/ld+json">{ not valid json }</script>
      <script type="application/ld+json">{"@type":"Product","name":"Good"}</script>`;
    const $ = cheerio.load(html);
    const result = parseJsonLdBlocks($);
    expect(result.blocksFound).toBe(2);
    expect(result.parseErrors).toBe(1);
    expect(result.nodes).toHaveLength(1);
    expect(result.nodes[0].name).toBe("Good");
  });

  it("returns zero blocks when none are present", () => {
    const $ = cheerio.load("<html><body></body></html>");
    const result = parseJsonLdBlocks($);
    expect(result.blocksFound).toBe(0);
    expect(result.nodes).toHaveLength(0);
  });
});

describe("findProductNodes", () => {
  it("filters to only product-like nodes", () => {
    const nodes = [{ "@type": "Organization" }, { "@type": "Product", name: "X" }];
    expect(findProductNodes(nodes)).toEqual([{ "@type": "Product", name: "X" }]);
  });
});

describe("extractJsonLdTitleCandidates", () => {
  it("reads the name field", () => {
    const candidates = extractJsonLdTitleCandidates([{ "@type": "Product", name: "Widget" }]);
    expect(candidates).toEqual([{ value: "Widget", source: "json-ld" }]);
  });
});

describe("extractJsonLdImageCandidates", () => {
  const base = "https://example.com/product";

  it("handles image as a plain string", () => {
    const candidates = extractJsonLdImageCandidates([{ "@type": "Product", image: "/img.jpg" }], base);
    expect(candidates.map((c) => c.url)).toContain("https://example.com/img.jpg");
  });

  it("handles image as an array of strings", () => {
    const candidates = extractJsonLdImageCandidates(
      [{ "@type": "Product", image: ["/a.jpg", "/b.jpg"] }],
      base
    );
    const urls = candidates.map((c) => c.url);
    expect(urls).toContain("https://example.com/a.jpg");
    expect(urls).toContain("https://example.com/b.jpg");
  });

  it("handles image as an object with a url property", () => {
    const candidates = extractJsonLdImageCandidates(
      [{ "@type": "Product", image: { "@type": "ImageObject", url: "/obj.jpg" } }],
      base
    );
    expect(candidates.map((c) => c.url)).toContain("https://example.com/obj.jpg");
  });

  it("handles image as an object with a contentUrl property", () => {
    const candidates = extractJsonLdImageCandidates(
      [{ "@type": "Product", image: { "@type": "ImageObject", contentUrl: "/content.jpg" } }],
      base
    );
    expect(candidates.map((c) => c.url)).toContain("https://example.com/content.jpg");
  });

  it("falls back to contentUrl, thumbnailUrl at the node level", () => {
    const candidates = extractJsonLdImageCandidates(
      [{ "@type": "Product", thumbnailUrl: "/thumb.jpg" }],
      base
    );
    expect(candidates.map((c) => c.url)).toContain("https://example.com/thumb.jpg");
  });

  it("resolves a relative URL to absolute", () => {
    const candidates = extractJsonLdImageCandidates([{ "@type": "Product", image: "relative.jpg" }], base);
    expect(candidates[0].url).toBe("https://example.com/relative.jpg");
  });

  it("reads images nested inside @graph via already-flattened nodes", () => {
    const out: Record<string, unknown>[] = [];
    flattenJsonLd({ "@graph": [{ "@type": "Product", image: "/graph.jpg" }] }, out);
    const candidates = extractJsonLdImageCandidates(out, base);
    expect(candidates.map((c) => c.url)).toContain("https://example.com/graph.jpg");
  });

  it("scores product-typed nodes higher than non-product nodes", () => {
    const candidates = extractJsonLdImageCandidates(
      [
        { "@type": "Organization", logo: "ignored" },
        { "@type": "Product", image: "/product.jpg" },
      ],
      base
    );
    const productCandidate = candidates.find((c) => c.url.includes("product.jpg"));
    expect(productCandidate).toBeDefined();
    expect(productCandidate!.score).toBeGreaterThan(80);
  });
});

describe("extractJsonLdPriceCandidates", () => {
  it("reads a simple offers.price/priceCurrency object", () => {
    const candidates = extractJsonLdPriceCandidates([
      { "@type": "Product", offers: { price: "19.99", priceCurrency: "USD" } },
    ]);
    expect(candidates[0]).toMatchObject({ amount: "19.99", currency: "USD", confidence: "high" });
  });

  it("picks the lowest price from a lowPrice/highPrice range (aggregateOffer)", () => {
    const candidates = extractJsonLdPriceCandidates([
      { "@type": "Product", offers: { lowPrice: "10.00", highPrice: "20.00", priceCurrency: "EUR" } },
    ]);
    expect(candidates.some((c) => c.amount === "10.00")).toBe(true);
  });

  it("handles offers as an array, extracting from every usable entry", () => {
    const candidates = extractJsonLdPriceCandidates([
      { "@type": "Product", offers: [{ price: null }, { price: "42.50", priceCurrency: "GBP" }] },
    ]);
    expect(candidates.some((c) => c.amount === "42.50" && c.currency === "GBP")).toBe(true);
  });

  it("falls back to nested priceSpecification", () => {
    const candidates = extractJsonLdPriceCandidates([
      { "@type": "Product", offers: { priceSpecification: { price: "7.5", priceCurrency: "CAD" } } },
    ]);
    expect(candidates[0]).toMatchObject({ amount: "7.5", currency: "CAD" });
  });

  it("returns no candidates when there are no offers", () => {
    expect(extractJsonLdPriceCandidates([{ "@type": "Product" }])).toHaveLength(0);
  });

  it("marks missing priceCurrency as medium confidence rather than dropping the candidate", () => {
    const candidates = extractJsonLdPriceCandidates([{ "@type": "Product", offers: { price: "9.99" } }]);
    expect(candidates[0]).toMatchObject({ amount: "9.99", currency: null, confidence: "medium" });
  });
});
