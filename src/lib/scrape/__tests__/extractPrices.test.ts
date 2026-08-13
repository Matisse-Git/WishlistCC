import { describe, it, expect } from "vitest";
import * as cheerio from "cheerio";
import { visibleBodyPriceCandidates, gatherPriceCandidates, pickBestPrice } from "../extractPrices";

describe("visibleBodyPriceCandidates", () => {
  it.each([
    ["<span>$19.99</span>", "19.99"],
    ["<span>$1,234.56</span>", "1234.56"],
    ["<span>£12.50</span>", "12.50"],
    ["<span>19,99 €</span>", "19.99"],
    ["<span>1 234,56 EUR</span>", "1234.56"],
    ["<span>¥1000</span>", "1000"],
    ["<span>CAD 29.99</span>", "29.99"],
    ["<span>29.99 USD</span>", "29.99"],
  ])("extracts a price from %s", (html, expectedAmount) => {
    const $ = cheerio.load(`<body>${html}</body>`);
    const candidates = visibleBodyPriceCandidates($);
    expect(candidates.some((c) => c.amount === expectedAmount)).toBe(true);
  });

  it("ignores shipping cost text", () => {
    const $ = cheerio.load(`<body><span>Shipping: $5.99</span></body>`);
    expect(visibleBodyPriceCandidates($)).toHaveLength(0);
  });

  it("ignores tax text", () => {
    const $ = cheerio.load(`<body><span>Tax: $2.50</span></body>`);
    expect(visibleBodyPriceCandidates($)).toHaveLength(0);
  });

  it("ignores 'you save' discount banners", () => {
    const $ = cheerio.load(`<body><span>You save $10.00 today!</span></body>`);
    expect(visibleBodyPriceCandidates($)).toHaveLength(0);
  });

  it("ignores review-count-style text (no currency signal, so never matches)", () => {
    const $ = cheerio.load(`<body><span>4.5 stars (1,234 reviews)</span></body>`);
    expect(visibleBodyPriceCandidates($)).toHaveLength(0);
  });

  it("ignores an element whose ancestor class suggests shipping/discount context", () => {
    const $ = cheerio.load(`<body><div class="shipping-cost"><span>$5.99</span></div></body>`);
    expect(visibleBodyPriceCandidates($)).toHaveLength(0);
  });

  it("does not scan <script> contents", () => {
    const $ = cheerio.load(`<body><script>var price = "$19.99";</script></body>`);
    expect(visibleBodyPriceCandidates($)).toHaveLength(0);
  });

  it("returns candidates with low confidence and a null currency-independent raw value", () => {
    const $ = cheerio.load(`<body><span>$19.99</span></body>`);
    const candidates = visibleBodyPriceCandidates($);
    expect(candidates[0].confidence).toBe("low");
    expect(candidates[0].source).toBe("regex");
  });
});

describe("gatherPriceCandidates", () => {
  it("prefers JSON-LD/meta/microdata over the regex fallback", () => {
    const $ = cheerio.load(`
      <meta property="product:price:amount" content="29.99" />
      <meta property="product:price:currency" content="USD" />
      <body><span>Was $50.00</span></body>
    `);
    const candidates = gatherPriceCandidates($, []);
    expect(candidates).toHaveLength(1);
    expect(candidates[0]).toMatchObject({ amount: "29.99", currency: "USD" });
  });

  it("falls back to regex scanning only when no structured price exists", () => {
    const $ = cheerio.load(`<body><span>$19.99</span></body>`);
    const candidates = gatherPriceCandidates($, []);
    expect(candidates.some((c) => c.amount === "19.99")).toBe(true);
  });

  it("returns an empty list when there's no price anywhere on the page", () => {
    const $ = cheerio.load(`<html><body><p>No price here.</p></body></html>`);
    expect(gatherPriceCandidates($, [])).toHaveLength(0);
  });
});

describe("pickBestPrice", () => {
  it("returns null with no alternates for an empty list", () => {
    expect(pickBestPrice([])).toEqual({ best: null, alternates: [] });
  });

  it("prefers higher-confidence candidates", () => {
    const result = pickBestPrice([
      { amount: "9.99", currency: null, source: "regex", confidence: "low", raw: "$9.99" },
      { amount: "19.99", currency: "USD", source: "json-ld", confidence: "high", raw: "19.99" },
    ]);
    expect(result.best?.amount).toBe("19.99");
  });

  it("filters out candidates with an unparsable (null) amount", () => {
    const result = pickBestPrice([{ amount: null, currency: null, source: "regex", confidence: "low", raw: "??" }]);
    expect(result.best).toBeNull();
  });
});
