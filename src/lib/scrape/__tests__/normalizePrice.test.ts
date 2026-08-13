import { describe, it, expect } from "vitest";
import { makePriceCandidate } from "../normalizePrice";

describe("makePriceCandidate", () => {
  it("parses the raw text and attaches source/confidence metadata", () => {
    const c = makePriceCandidate("$19.99", "json-ld", "high");
    expect(c).toEqual({ amount: "19.99", currency: "USD", source: "json-ld", confidence: "high", raw: "$19.99" });
  });

  it("prefers an explicit currency hint over what's detected in the text", () => {
    const c = makePriceCandidate("19.99", "meta", "high", "EUR");
    expect(c.currency).toBe("EUR");
  });

  it("keeps a null amount for unparsable text rather than throwing", () => {
    const c = makePriceCandidate("call for price", "regex", "low");
    expect(c.amount).toBeNull();
  });

  it.each([
    ["19.99", "19.99"],
    ["1,234.56", "1234.56"],
    ["1.234,56", "1234.56"],
    ["49,99 EUR", "49.99"],
  ])("normalizes %s -> %s", (raw, expected) => {
    expect(makePriceCandidate(raw, "regex", "low").amount).toBe(expected);
  });
});
