// Server-side image proxy: fetches a remote image on the user's behalf so
// the browser never has to hit a hotlink-protected or referrer-restricted
// URL directly. Same safety rules as the HTML scraper (http/https only, no
// private/internal hosts) plus a content-type check and a size cap.
import { isSafeUrl } from "@/lib/scrape/safeUrl";

const FETCH_TIMEOUT_MS = 8000;
const MAX_IMAGE_BYTES = 6 * 1024 * 1024; // 6MB cap
const CACHE_TTL_MS = 30 * 60 * 1000; // 30 minutes
const CACHE_MAX_ENTRIES = 100;

const USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";

export type ProxyImageResult =
  | { ok: true; bytes: Buffer; contentType: string; cached: boolean }
  | { ok: false; reason: string; status: number };

interface CacheEntry {
  bytes: Buffer;
  contentType: string;
  expiresAt: number;
}

// Simple in-memory cache, single-process only — same tradeoff as
// lib/rate-limit.ts. Fine for a personal wishlist app; resets on restart.
const cache = new Map<string, CacheEntry>();

function getCached(url: string): CacheEntry | null {
  const entry = cache.get(url);
  if (!entry) return null;
  if (entry.expiresAt <= Date.now()) {
    cache.delete(url);
    return null;
  }
  return entry;
}

function setCached(url: string, entry: CacheEntry) {
  if (cache.size >= CACHE_MAX_ENTRIES) {
    const oldestKey = cache.keys().next().value;
    if (oldestKey !== undefined) cache.delete(oldestKey);
  }
  cache.set(url, entry);
}

async function readBodyCapped(res: Response, maxBytes: number): Promise<Buffer | null> {
  const reader = res.body?.getReader();
  if (!reader) {
    const buf = Buffer.from(await res.arrayBuffer());
    return buf.byteLength > maxBytes ? null : buf;
  }

  const chunks: Uint8Array[] = [];
  let received = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    if (value) {
      received += value.byteLength;
      if (received > maxBytes) {
        await reader.cancel().catch(() => {});
        return null;
      }
      chunks.push(value);
    }
  }
  return Buffer.concat(chunks.map((c) => Buffer.from(c)));
}

export async function fetchImageForProxy(rawUrl: string): Promise<ProxyImageResult> {
  const safe = isSafeUrl(rawUrl);
  if (!safe.ok) return { ok: false, reason: safe.reason, status: 400 };

  const cached = getCached(safe.url.toString());
  if (cached) return { ok: true, bytes: cached.bytes, contentType: cached.contentType, cached: true };

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  let res: Response;
  try {
    res = await fetch(safe.url.toString(), {
      signal: controller.signal,
      redirect: "follow",
      headers: {
        "User-Agent": USER_AGENT,
        Accept: "image/avif,image/webp,image/apng,image/*,*/*;q=0.8",
        Referer: "",
      },
    });
  } catch {
    clearTimeout(timeout);
    return { ok: false, reason: "Could not reach the image URL (timed out or network error).", status: 502 };
  }
  clearTimeout(timeout);

  if (!res.ok) {
    return { ok: false, reason: `Source returned HTTP ${res.status}.`, status: 502 };
  }

  const contentType = res.headers.get("content-type") ?? "";
  if (!contentType.startsWith("image/")) {
    return { ok: false, reason: "URL did not return an image.", status: 415 };
  }

  const bytes = await readBodyCapped(res, MAX_IMAGE_BYTES);
  if (!bytes) {
    return { ok: false, reason: "Image was too large to proxy.", status: 413 };
  }

  setCached(safe.url.toString(), { bytes, contentType, expiresAt: Date.now() + CACHE_TTL_MS });
  return { ok: true, bytes, contentType, cached: false };
}
