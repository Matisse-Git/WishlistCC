import { describe, it, expect } from "vitest";
import * as cheerio from "cheerio";
import { evaluateImageCandidate, htmlImgFallbackCandidates, gatherImageCandidates, pickBestImage } from "../extractImages";

const base = "https://example.com/product";

describe("evaluateImageCandidate", () => {
  it("rejects 1x1 tracking pixels", () => {
    expect(evaluateImageCandidate("https://example.com/pixel.gif", 1, 1)).toMatch(/tracking pixel/);
  });

  it("rejects tiny icon-sized images", () => {
    expect(evaluateImageCandidate("https://example.com/x.png", 16, 16)).toMatch(/icon/);
  });

  it.each(["logo", "favicon", "sprite", "avatar", "placeholder", "tracking-pixel", "analytics"])(
    "rejects filenames containing %s",
    (keyword) => {
      expect(evaluateImageCandidate(`https://example.com/${keyword}.png`)).not.toBeNull();
    }
  );

  it("deprioritizes (but flags) svg rather than passing it through clean", () => {
    expect(evaluateImageCandidate("https://example.com/product.svg")).toMatch(/svg/);
  });

  it("accepts an ordinary product image with no red flags", () => {
    expect(evaluateImageCandidate("https://example.com/product-photo.jpg", 800, 800)).toBeNull();
  });
});

describe("htmlImgFallbackCandidates", () => {
  it("reads src as the default source", () => {
    const $ = cheerio.load(`<img src="/a.jpg" />`);
    const candidates = htmlImgFallbackCandidates($, base);
    expect(candidates[0].url).toBe("https://example.com/a.jpg");
  });

  it.each(["data-src", "data-lazy-src", "data-original", "data-lazyload"])(
    "falls back to %s when src is absent",
    (attr) => {
      const $ = cheerio.load(`<img ${attr}="/lazy.jpg" />`);
      const candidates = htmlImgFallbackCandidates($, base);
      expect(candidates.some((c) => c.url === "https://example.com/lazy.jpg")).toBe(true);
    }
  );

  it("reads the first URL out of srcset/data-srcset", () => {
    const $ = cheerio.load(`<img srcset="/small.jpg 320w, /large.jpg 640w" />`);
    const candidates = htmlImgFallbackCandidates($, base);
    expect(candidates.some((c) => c.url === "https://example.com/small.jpg")).toBe(true);
  });

  it("boosts score for images inside a product-hinted container", () => {
    const $ = cheerio.load(`
      <div class="product-gallery"><img src="/product.jpg" /></div>
      <div class="sidebar"><img src="/random.jpg" /></div>
    `);
    const candidates = htmlImgFallbackCandidates($, base);
    const product = candidates.find((c) => c.url.includes("product.jpg"))!;
    const random = candidates.find((c) => c.url.includes("random.jpg"))!;
    expect(product.score).toBeGreaterThan(random.score);
  });

  it("flags (but still returns) a logo/icon-keyword image as rejected", () => {
    const $ = cheerio.load(`<img src="/site-logo.png" />`);
    const candidates = htmlImgFallbackCandidates($, base);
    expect(candidates[0].rejected).toBeTruthy();
  });
});

describe("gatherImageCandidates", () => {
  it("prefers structured sources (og:image) over scanning <img> tags", () => {
    const $ = cheerio.load(`
      <meta property="og:image" content="/og.jpg" />
      <body><img src="/random-page-image.jpg" /></body>
    `);
    const { accepted } = gatherImageCandidates($, base, []);
    expect(accepted.some((c) => c.url.includes("og.jpg"))).toBe(true);
    expect(accepted.some((c) => c.url.includes("random-page-image.jpg"))).toBe(false);
  });

  it("falls back to scanning <img> tags when no structured image source exists", () => {
    const $ = cheerio.load(`<body><img src="/only-image.jpg" width="600" height="600" /></body>`);
    const { accepted } = gatherImageCandidates($, base, []);
    expect(accepted.some((c) => c.url.includes("only-image.jpg"))).toBe(true);
  });

  it("returns no accepted candidates when the page has nothing but bad images", () => {
    const $ = cheerio.load(`<body><img src="/favicon.ico" width="16" height="16" /></body>`);
    const { accepted } = gatherImageCandidates($, base, []);
    expect(accepted).toHaveLength(0);
  });
});

describe("pickBestImage", () => {
  it("returns null with no alternates when there are no candidates", () => {
    expect(pickBestImage([])).toEqual({ best: null, alternates: [] });
  });

  it("picks the highest-scoring candidate and returns the rest as alternates", () => {
    const result = pickBestImage([
      { url: "https://example.com/a.jpg", source: "html-img", score: 10 },
      { url: "https://example.com/b.jpg", source: "json-ld", score: 90 },
    ]);
    expect(result.best?.url).toBe("https://example.com/b.jpg");
    expect(result.alternates).toHaveLength(1);
  });

  it("penalizes svg heavily enough that a lower-scored raster candidate can still win", () => {
    const result = pickBestImage([
      { url: "https://example.com/a.svg", source: "og", score: 70 },
      { url: "https://example.com/b.jpg", source: "twitter", score: 60 },
    ]);
    expect(result.best?.url).toBe("https://example.com/b.jpg");
  });
});
