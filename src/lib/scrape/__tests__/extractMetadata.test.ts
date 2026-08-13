import { describe, it, expect } from "vitest";
import * as cheerio from "cheerio";
import { extractMetadata } from "../extractMetadata";

describe("extractMetadata", () => {
  it("prefers JSON-LD Product data over OG tags for title/image/price", () => {
    const html = `
      <html><head>
        <meta property="og:title" content="OG Title" />
        <meta property="og:image" content="/og.jpg" />
        <script type="application/ld+json">
          {"@type":"Product","name":"JSON-LD Title","image":"/jsonld.jpg","offers":{"price":"29.99","priceCurrency":"USD"}}
        </script>
      </head><body></body></html>`;
    const $ = cheerio.load(html);
    const result = extractMetadata($, "https://example.com/product");
    expect(result.title).toBe("JSON-LD Title");
    expect(result.price).toBe("29.99");
    expect(result.currency).toBe("USD");
    expect(result.imageUrl).toBe("https://example.com/jsonld.jpg");
    expect(result.debug.selectedTitleSource).toBe("json-ld");
    expect(result.debug.selectedImageSource).toBe("json-ld");
    expect(result.debug.selectedPriceSource).toBe("json-ld");
  });

  it("handles JSON-LD wrapped in a top-level array with nested arrays", () => {
    const html = `
      <html><head>
        <script type="application/ld+json">
          [{"@type":["Thing","Product"],"name":"Nested Array Product","offers":[{"price":"5.00","priceCurrency":"EUR"}]}]
        </script>
      </head><body></body></html>`;
    const $ = cheerio.load(html);
    const result = extractMetadata($, "https://example.com/product");
    expect(result.title).toBe("Nested Array Product");
    expect(result.price).toBe("5.00");
  });

  it("falls back to OG tags when there is no JSON-LD", () => {
    const html = `
      <html><head>
        <meta property="og:title" content="OG Only Title" />
        <meta property="og:description" content="OG description" />
        <meta property="og:image" content="https://cdn.example.com/img.jpg" />
      </head><body></body></html>`;
    const $ = cheerio.load(html);
    const result = extractMetadata($, "https://example.com/product");
    expect(result.title).toBe("OG Only Title");
    expect(result.description).toBe("OG description");
    expect(result.imageUrl).toBe("https://cdn.example.com/img.jpg");
    expect(result.price).toBeNull();
    expect(result.debug.priceRejectionReason).toMatch(/No JSON-LD offers/);
  });

  it("falls back to the <title> tag when nothing else is present", () => {
    const html = `<html><head><title>Bare Title</title></head><body></body></html>`;
    const $ = cheerio.load(html);
    const result = extractMetadata($, "https://example.com/product");
    expect(result.title).toBe("Bare Title");
    expect(result.price).toBeNull();
    expect(result.imageUrl).toBeNull();
    expect(result.debug.imageRejectionReason).toBeTruthy();
  });

  it("does not crash on malformed JSON-LD and still falls back to OG tags", () => {
    const html = `
      <html><head>
        <meta property="og:title" content="Fallback Title" />
        <script type="application/ld+json">{ this is not valid JSON }</script>
      </head><body></body></html>`;
    const $ = cheerio.load(html);
    const result = extractMetadata($, "https://example.com/product");
    expect(result.title).toBe("Fallback Title");
    expect(result.debug.jsonLdParseErrors).toBe(1);
  });

  it("reads microdata price/currency when present", () => {
    const html = `
      <html><body>
        <div itemscope itemtype="https://schema.org/Product">
          <span itemprop="name">Microdata Product</span>
          <span itemprop="price" content="15.00">$15.00</span>
          <span itemprop="priceCurrency" content="USD"></span>
        </div>
      </body></html>`;
    const $ = cheerio.load(html);
    const result = extractMetadata($, "https://example.com/product");
    expect(result.title).toBe("Microdata Product");
    expect(result.price).toBe("15.00");
    expect(result.currency).toBe("USD");
  });

  it("reads product:price meta tags", () => {
    const html = `
      <html><head>
        <meta property="og:title" content="Meta Price Product" />
        <meta property="product:price:amount" content="99.95" />
        <meta property="product:price:currency" content="EUR" />
      </head><body></body></html>`;
    const $ = cheerio.load(html);
    const result = extractMetadata($, "https://example.com/product");
    expect(result.price).toBe("99.95");
    expect(result.currency).toBe("EUR");
  });

  it("resolves a relative og:image URL to absolute", () => {
    const html = `<html><head><meta property="og:image" content="/relative.jpg" /></head></html>`;
    const $ = cheerio.load(html);
    const result = extractMetadata($, "https://example.com/deep/product");
    expect(result.imageUrl).toBe("https://example.com/relative.jpg");
  });

  it("does not select an unknown currency code, but keeps the price", () => {
    const html = `
      <script type="application/ld+json">
        {"@type":"Product","name":"X","offers":{"price":"10.00","priceCurrency":"ZZZ"}}
      </script>`;
    const $ = cheerio.load(html);
    const result = extractMetadata($, "https://example.com/product");
    expect(result.price).toBe("10.00");
    expect(result.currency).toBeNull();
  });

  it("returns a helpful image rejection reason when the only image candidates are filtered out", () => {
    const html = `<html><body><img src="/logo.png" width="40" height="40" /></body></html>`;
    const $ = cheerio.load(html);
    const result = extractMetadata($, "https://example.com/product");
    expect(result.imageUrl).toBeNull();
    expect(result.debug.imageRejectionReason).toMatch(/filtered out/);
  });
});
