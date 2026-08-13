import { describe, it, expect } from "vitest";
import Decimal from "decimal.js";
import { convertAmount } from "../currency";

describe("convertAmount", () => {
  it("returns the same amount unchanged when currencies match", () => {
    const result = convertAmount(new Decimal("50"), "USD", "USD", { EUR: 0.9 });
    expect(result?.toString()).toBe("50");
  });

  it("converts using rate = units of fromCurrency per 1 unit of toCurrency", () => {
    // base=USD rates say 1 USD = 0.9 EUR, so 90 EUR -> 100 USD.
    const result = convertAmount(new Decimal("90"), "EUR", "USD", { EUR: 0.9 });
    expect(result?.toNumber()).toBeCloseTo(100, 5);
  });

  it("rounds to the target currency's standard decimal places", () => {
    const result = convertAmount(new Decimal("100"), "EUR", "USD", { EUR: 0.9234567 });
    expect(result?.toString()).toBe(new Decimal(100).dividedBy(0.9234567).toDecimalPlaces(2).toString());
  });

  it("rounds to zero decimal places for JPY", () => {
    const result = convertAmount(new Decimal("100"), "USD", "JPY", { USD: 0.0067 });
    expect(result?.decimalPlaces()).toBe(0);
  });

  it("returns null when the rate is missing", () => {
    expect(convertAmount(new Decimal("50"), "GBP", "USD", { EUR: 0.9 })).toBeNull();
  });

  it("returns null when the rate is zero or negative", () => {
    expect(convertAmount(new Decimal("50"), "GBP", "USD", { GBP: 0 })).toBeNull();
    expect(convertAmount(new Decimal("50"), "GBP", "USD", { GBP: -1 })).toBeNull();
  });

  it("is case-insensitive on currency codes", () => {
    const result = convertAmount(new Decimal("90"), "eur", "usd", { EUR: 0.9 });
    expect(result?.toNumber()).toBeCloseTo(100, 5);
  });
});
