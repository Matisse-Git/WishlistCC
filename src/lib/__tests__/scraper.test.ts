import { describe, it, expect } from "vitest";
import * as cheerio from "cheerio";
import {
  isSafeUrl,
  storeNameFromUrl,
  flattenJsonLd,
  isProductLike,
  extractOfferPrice,
  extractMetadata,
} from "../scraper";

describe("isSafeUrl", () => {
  it("accepts ordinary https URLs", () => {
    const result = isSafeUrl("https://example.com/product/123");
    expect(result.ok).toBe(true);
  });

  it("rejects non-http(s) protocols", () => {
    expect(isSafeUrl("ftp://example.com").ok).toBe(false);
    expect(isSafeUrl("file:///etc/passwd").ok).toBe(false);
    expect(isSafeUrl("javascript:alert(1)").ok).toBe(false);
  });

  it("rejects malformed URLs instead of throwing", () => {
    expect(isSafeUrl("not a url").ok).toBe(false);
  });

  it.each([
    "http://localhost/",
    "http://127.0.0.1/",
    "http://0.0.0.0/",
    "http://10.0.0.5/",
    "http://192.168.1.1/",
    "http://172.16.0.1/",
    "http://172.31.255.255/",
    "http://169.254.1.1/",
    "http://[::1]/",
  ])("rejects internal/private host %s", (url) => {
    expect(isSafeUrl(url).ok).toBe(false);
  });

  it("does not false-positive on public IPs that merely start like a private range", () => {
    expect(isSafeUrl("http://172.32.0.1/").ok).toBe(true);
    expect(isSafeUrl("http://8.8.8.8/").ok).toBe(true);
  });
});

describe("storeNameFromUrl", () => {
  it("maps known domains to display names", () => {
    expect(storeNameFromUrl(new URL("https://www.amazon.com/dp/123"))).toBe("Amazon");
    expect(storeNameFromUrl(new URL("https://www.ebay.co.uk/itm/1"))).toBe("eBay");
    expect(storeNameFromUrl(new URL("https://www.etsy.com/listing/1"))).toBe("Etsy");
  });

  it("resolves through subdomains to the base domain", () => {
    expect(storeNameFromUrl(new URL("https://smile.amazon.com/dp/123"))).toBe("Amazon");
  });

  it("falls back to the bare hostname for unknown stores", () => {
    expect(storeNameFromUrl(new URL("https://www.some-random-shop.example/"))).toBe("some-random-shop.example");
  });
});

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

describe("extractOfferPrice", () => {
  it("reads a simple offers.price/priceCurrency object", () => {
    const result = extractOfferPrice({ offers: { price: "19.99", priceCurrency: "USD" } });
    expect(result).toEqual({ amount: "19.99", currency: "USD" });
  });

  it("picks the lowest price from a lowPrice/highPrice range", () => {
    const result = extractOfferPrice({ offers: { lowPrice: "10.00", highPrice: "20.00", priceCurrency: "EUR" } });
    expect(result?.amount).toBe("10.00");
  });

  it("handles offers as an array, using the first usable entry", () => {
    const result = extractOfferPrice({
      offers: [{ price: null }, { price: "42.50", priceCurrency: "GBP" }],
    });
    expect(result).toEqual({ amount: "42.50", currency: "GBP" });
  });

  it("falls back to nested priceSpecification", () => {
    const result = extractOfferPrice({
      offers: { priceSpecification: { price: "7.5", priceCurrency: "CAD" } },
    });
    expect(result).toEqual({ amount: "7.5", currency: "CAD" });
  });

  it("returns null when there are no offers", () => {
    expect(extractOfferPrice({})).toBeNull();
  });
});

describe("extractMetadata", () => {
  it("prefers JSON-LD Product data over OG tags", () => {
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
  });

  it("falls back to the <title> tag when nothing else is present", () => {
    const html = `<html><head><title>Bare Title</title></head><body></body></html>`;
    const $ = cheerio.load(html);
    const result = extractMetadata($, "https://example.com/product");
    expect(result.title).toBe("Bare Title");
    expect(result.price).toBeNull();
    expect(result.imageUrl).toBeNull();
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
});
