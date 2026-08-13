import { describe, it, expect } from "vitest";
import { detectCurrency, normalizeCurrencyCode } from "../normalizeCurrency";

describe("detectCurrency", () => {
  it("detects from an explicit ISO code", () => {
    expect(detectCurrency("EUR")).toBe("EUR");
  });
  it("detects from the € symbol", () => {
    expect(detectCurrency("€49,99")).toBe("EUR");
  });
  it("detects from the £ symbol", () => {
    expect(detectCurrency("£12.50")).toBe("GBP");
  });
  it("detects from the $ symbol", () => {
    expect(detectCurrency("$19.99")).toBe("USD");
  });
  it("returns null for text with no currency signal", () => {
    expect(detectCurrency("19.99")).toBeNull();
  });
  it("returns null for null/undefined input", () => {
    expect(detectCurrency(null)).toBeNull();
    expect(detectCurrency(undefined)).toBeNull();
  });
});

describe("normalizeCurrencyCode", () => {
  it("uppercases and validates a known code", () => {
    expect(normalizeCurrencyCode("usd")).toBe("USD");
  });
  it("returns null for an unknown/unsupported code rather than guessing", () => {
    expect(normalizeCurrencyCode("XYZ")).toBeNull();
  });
  it("returns null for null/undefined", () => {
    expect(normalizeCurrencyCode(null)).toBeNull();
    expect(normalizeCurrencyCode(undefined)).toBeNull();
  });
});
