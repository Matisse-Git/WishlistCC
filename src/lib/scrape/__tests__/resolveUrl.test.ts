import { describe, it, expect } from "vitest";
import { resolveUrl, firstUrlFromSrcset } from "../resolveUrl";

describe("resolveUrl", () => {
  it("resolves a relative path against the base URL", () => {
    expect(resolveUrl("/img/product.jpg", "https://example.com/product")).toBe(
      "https://example.com/img/product.jpg"
    );
  });

  it("resolves a protocol-relative URL", () => {
    expect(resolveUrl("//cdn.example.com/a.jpg", "https://example.com/product")).toBe(
      "https://cdn.example.com/a.jpg"
    );
  });

  it("leaves an already-absolute URL alone", () => {
    expect(resolveUrl("https://cdn.example.com/a.jpg", "https://example.com/product")).toBe(
      "https://cdn.example.com/a.jpg"
    );
  });

  it("returns null for empty/nullish input", () => {
    expect(resolveUrl(undefined, "https://example.com")).toBeNull();
    expect(resolveUrl(null, "https://example.com")).toBeNull();
    expect(resolveUrl("", "https://example.com")).toBeNull();
  });

  it("returns null for data: and javascript: URLs", () => {
    expect(resolveUrl("data:image/png;base64,abc", "https://example.com")).toBeNull();
    expect(resolveUrl("javascript:alert(1)", "https://example.com")).toBeNull();
  });

  it("returns null for unparsable input", () => {
    expect(resolveUrl("http://[invalid", "https://example.com")).toBeNull();
  });
});

describe("firstUrlFromSrcset", () => {
  it("extracts the first URL from a comma-separated srcset", () => {
    expect(firstUrlFromSrcset("img-320.jpg 320w, img-640.jpg 640w")).toBe("img-320.jpg");
  });

  it("handles a srcset entry with no descriptor", () => {
    expect(firstUrlFromSrcset("img.jpg")).toBe("img.jpg");
  });

  it("returns null for empty input", () => {
    expect(firstUrlFromSrcset(undefined)).toBeNull();
    expect(firstUrlFromSrcset("")).toBeNull();
  });
});
