import { describe, it, expect } from "vitest";
import { isSafeUrl } from "../safeUrl";

describe("isSafeUrl", () => {
  it("accepts ordinary https URLs", () => {
    expect(isSafeUrl("https://example.com/product/123").ok).toBe(true);
  });

  it("rejects non-http(s) protocols", () => {
    expect(isSafeUrl("ftp://example.com").ok).toBe(false);
    expect(isSafeUrl("file:///etc/passwd").ok).toBe(false);
    expect(isSafeUrl("javascript:alert(1)").ok).toBe(false);
  });

  it("rejects malformed URLs instead of throwing", () => {
    expect(isSafeUrl("not a url").ok).toBe(false);
  });

  it.each([
    "http://localhost/",
    "http://127.0.0.1/",
    "http://0.0.0.0/",
    "http://10.0.0.5/",
    "http://192.168.1.1/",
    "http://172.16.0.1/",
    "http://172.31.255.255/",
    "http://169.254.1.1/",
    "http://[::1]/",
  ])("rejects internal/private host %s", (url) => {
    expect(isSafeUrl(url).ok).toBe(false);
  });

  it("does not false-positive on public IPs that merely start like a private range", () => {
    expect(isSafeUrl("http://172.32.0.1/").ok).toBe(true);
    expect(isSafeUrl("http://8.8.8.8/").ok).toBe(true);
  });
});
