import { describe, it, expect, vi, afterEach } from "vitest";
import { analyzeUrlPreview, fetchProductPreview } from "../analyzeUrl";

function htmlResponse(html: string, init?: { status?: number; contentType?: string }) {
  return new Response(html, {
    status: init?.status ?? 200,
    headers: { "content-type": init?.contentType ?? "text/html; charset=utf-8" },
  });
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("analyzeUrlPreview", () => {
  it("rejects unsafe URLs before ever fetching", async () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);

    const result = await analyzeUrlPreview("http://localhost/admin");
    expect(result.ok).toBe(false);
    expect(result.warnings[0]).toMatch(/internal\/private hosts/);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("surfaces a friendly warning and no crash on HTTP error responses", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(htmlResponse("", { status: 404 })));

    const result = await analyzeUrlPreview("https://example.com/missing");
    expect(result.ok).toBe(false);
    expect(result.warnings[0]).toMatch(/HTTP 404/);
    expect(result.debug.fetch.status).toBe(404);
  });

  it("surfaces a friendly warning on network failure/timeout instead of throwing", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockImplementation(() => Promise.reject(new Error("network down")))
    );

    const result = await analyzeUrlPreview("https://example.com/unreachable");
    expect(result.ok).toBe(false);
    expect(result.warnings[0]).toMatch(/Could not reach the URL/);
  });

  it("handles an empty HTML body gracefully", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(htmlResponse("   ")));

    const result = await analyzeUrlPreview("https://example.com/empty");
    expect(result.ok).toBe(false);
    expect(result.warnings[0]).toMatch(/empty response/);
  });

  it("follows a safe redirect and re-validates the new host", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(null, { status: 302, headers: { location: "https://final.example.com/product" } })
      )
      .mockResolvedValueOnce(
        htmlResponse(`<html><head><title>Redirected Product</title></head></html>`)
      );
    vi.stubGlobal("fetch", fetchMock);

    const result = await analyzeUrlPreview("https://short.example.com/x");
    expect(result.ok).toBe(true);
    expect(result.finalUrl).toBe("https://final.example.com/product");
    expect(result.title).toBe("Redirected Product");
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("refuses to follow a redirect into a private/internal host", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(null, { status: 302, headers: { location: "http://127.0.0.1/secret" } })
      )
    );

    const result = await analyzeUrlPreview("https://example.com/redirect-me");
    expect(result.ok).toBe(false);
    expect(result.warnings[0]).toMatch(/disallowed internal address/i);
  });

  it("returns a full successful result with title/image/price/currency/store and no warnings", async () => {
    const html = `
      <html><head>
        <script type="application/ld+json">
          {"@type":"Product","name":"Great Widget","image":"/widget.jpg","offers":{"price":"42.00","priceCurrency":"USD"}}
        </script>
      </head><body></body></html>`;
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(htmlResponse(html)));

    const result = await analyzeUrlPreview("https://www.amazon.com/dp/B000");
    expect(result.ok).toBe(true);
    expect(result.title).toBe("Great Widget");
    expect(result.imageUrl).toBe("https://www.amazon.com/widget.jpg");
    expect(result.price).toBe("42.00");
    expect(result.currency).toBe("USD");
    expect(result.store).toBe("Amazon");
    expect(result.warnings).toHaveLength(0);
  });

  it("returns partial results (title only) with warnings for the missing fields, rather than failing entirely", async () => {
    const html = `<html><head><title>Just A Title</title></head><body></body></html>`;
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(htmlResponse(html)));

    const result = await analyzeUrlPreview("https://example.com/product");
    expect(result.ok).toBe(true);
    expect(result.title).toBe("Just A Title");
    expect(result.price).toBeNull();
    expect(result.imageUrl).toBeNull();
    expect(result.warnings.length).toBeGreaterThan(0);
  });
});

describe("fetchProductPreview (legacy shape)", () => {
  it("adapts analyzeUrlPreview into the leaner PreviewResult shape the UI consumes", async () => {
    const html = `<html><head><meta property="og:title" content="Legacy Shape Product" /></head></html>`;
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(htmlResponse(html)));

    const result = await fetchProductPreview("https://example.com/product");
    expect(result.title).toBe("Legacy Shape Product");
    expect(result).toHaveProperty("rawMetadata");
    expect(result).toHaveProperty("debug");
    expect(result).toHaveProperty("warnings");
  });

  it("never throws even when the fetch fails outright", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockImplementation(() => Promise.reject(new Error("boom")))
    );
    await expect(fetchProductPreview("https://example.com/x")).resolves.toBeTruthy();
  });
});
