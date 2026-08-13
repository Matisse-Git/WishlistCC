import { describe, it, expect } from "vitest";
import * as cheerio from "cheerio";
import {
  extractMicrodata,
  hasMicrodata,
  extractMicrodataImageCandidates,
  extractMicrodataPriceCandidates,
} from "../microdata";

const base = "https://example.com/product";

describe("extractMicrodata", () => {
  it("prefers the content attribute over visible text", () => {
    const $ = cheerio.load(`<span itemprop="price" content="15.00">$15.00</span>`);
    expect(extractMicrodata($).price).toBe("15.00");
  });

  it("falls back to visible text when there's no content attribute", () => {
    const $ = cheerio.load(`<span itemprop="name">Widget</span>`);
    expect(extractMicrodata($).name).toBe("Widget");
  });

  it("reads image from a src attribute", () => {
    const $ = cheerio.load(`<img itemprop="image" src="/img.jpg" />`);
    expect(extractMicrodata($).image).toBe("/img.jpg");
  });

  it("reads lowPrice/highPrice for price ranges", () => {
    const $ = cheerio.load(`
      <span itemprop="lowPrice" content="10.00"></span>
      <span itemprop="highPrice" content="20.00"></span>
    `);
    const fields = extractMicrodata($);
    expect(fields.lowPrice).toBe("10.00");
    expect(fields.highPrice).toBe("20.00");
  });
});

describe("hasMicrodata", () => {
  it("detects itemscope/itemprop presence", () => {
    expect(hasMicrodata(cheerio.load(`<div itemscope></div>`))).toBe(true);
    expect(hasMicrodata(cheerio.load(`<html><body>plain</body></html>`))).toBe(false);
  });
});

describe("extractMicrodataImageCandidates", () => {
  it("resolves the image to an absolute URL", () => {
    const $ = cheerio.load(`<img itemprop="image" src="/img.jpg" />`);
    expect(extractMicrodataImageCandidates($, base)[0].url).toBe("https://example.com/img.jpg");
  });

  it("returns an empty list when no itemprop=image exists", () => {
    expect(extractMicrodataImageCandidates(cheerio.load(`<html></html>`), base)).toHaveLength(0);
  });
});

describe("extractMicrodataPriceCandidates", () => {
  it("reads price + priceCurrency as high confidence", () => {
    const $ = cheerio.load(`
      <span itemprop="price" content="15.00"></span>
      <span itemprop="priceCurrency" content="USD"></span>
    `);
    const candidates = extractMicrodataPriceCandidates($);
    expect(candidates[0]).toMatchObject({ amount: "15.00", currency: "USD", confidence: "high" });
  });

  it("marks a missing priceCurrency as medium confidence", () => {
    const $ = cheerio.load(`<span itemprop="price" content="15.00"></span>`);
    expect(extractMicrodataPriceCandidates($)[0].confidence).toBe("medium");
  });
});
