import { describe, it, expect } from "vitest";
import { storeNameFromUrl } from "../storeName";

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
