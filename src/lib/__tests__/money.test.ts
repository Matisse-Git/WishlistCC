import { describe, it, expect } from "vitest";
import { parsePriceString, extractCurrency, sumDecimals, toDecimal, formatMoney } from "../money";

describe("parsePriceString", () => {
  it("parses a plain dollar amount", () => {
    expect(parsePriceString("$19.99")).toEqual({ amount: "19.99", currency: "USD" });
  });

  it("parses a European decimal-comma amount with trailing symbol", () => {
    expect(parsePriceString("19,99 €")).toEqual({ amount: "19.99", currency: "EUR" });
  });

  it("parses a euro amount with thousands comma and decimal dot", () => {
    expect(parsePriceString("€1,234.56")).toEqual({ amount: "1234.56", currency: "EUR" });
  });

  it("parses a space-thousands, comma-decimal amount with explicit ISO code", () => {
    expect(parsePriceString("1 234,56 EUR")).toEqual({ amount: "1234.56", currency: "EUR" });
  });

  it("parses a plain thousands-comma amount with no currency", () => {
    expect(parsePriceString("1,234.56")).toEqual({ amount: "1234.56", currency: null });
  });

  it("returns null amount for empty input", () => {
    expect(parsePriceString("")).toEqual({ amount: null, currency: null });
  });

  it("returns null amount but keeps currency when no digits are present", () => {
    expect(parsePriceString("EUR")).toEqual({ amount: null, currency: "EUR" });
  });

  it("does not let a bare $ override an explicit ISO code", () => {
    const result = parsePriceString("$19.99 USD");
    expect(result.currency).toBe("USD");
  });

  it("handles a large thousands-grouped comma amount", () => {
    expect(parsePriceString("1,234,567.89")).toEqual({ amount: "1234567.89", currency: null });
  });
});

describe("extractCurrency", () => {
  it("prefers an explicit ISO code over a symbol", () => {
    expect(extractCurrency("GBP 19.99 (was $25)")).toBe("GBP");
  });

  it("falls back to a symbol when no ISO code is present", () => {
    expect(extractCurrency("£19.99")).toBe("GBP");
  });

  it("matches multi-character symbols before their single-character substrings", () => {
    expect(extractCurrency("A$19.99")).toBe("AUD");
  });

  it("returns null when nothing is recognizable", () => {
    expect(extractCurrency("19.99")).toBeNull();
  });
});

describe("toDecimal", () => {
  it("returns null for null/undefined/empty", () => {
    expect(toDecimal(null)).toBeNull();
    expect(toDecimal(undefined)).toBeNull();
    expect(toDecimal("")).toBeNull();
  });

  it("returns null for garbage strings instead of throwing", () => {
    expect(toDecimal("not-a-number")).toBeNull();
  });

  it("parses valid numeric strings and numbers", () => {
    expect(toDecimal("19.99")?.toString()).toBe("19.99");
    expect(toDecimal(19.99)?.toString()).toBe("19.99");
  });
});

describe("sumDecimals", () => {
  it("sums decimal-safe without float drift", () => {
    // 0.1 + 0.2 famously != 0.3 in floating point.
    expect(sumDecimals(["0.1", "0.2"]).toString()).toBe("0.3");
  });

  it("skips null/undefined/invalid entries", () => {
    expect(sumDecimals(["10", null, undefined, "not-a-number", "5"]).toString()).toBe("15");
  });

  it("returns 0 for an empty list", () => {
    expect(sumDecimals([]).toString()).toBe("0");
  });
});

describe("formatMoney", () => {
  it("formats a known currency", () => {
    expect(formatMoney("19.99", "USD")).toBe("$19.99");
  });

  it("respects zero-decimal currencies like JPY", () => {
    expect(formatMoney("1500", "JPY")).toBe("¥1,500");
  });

  it("falls back to a plain number when currency is missing", () => {
    expect(formatMoney("19.99", null)).toBe("19.99");
  });

  it("returns an em dash for null amounts", () => {
    expect(formatMoney(null, "USD")).toBe("—");
  });
});
