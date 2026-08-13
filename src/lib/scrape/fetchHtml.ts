// Safe, best-effort HTML fetching: protocol/host validation, bounded
// redirects, a timeout, size cap, and browser-like headers so ordinary
// product pages don't get served a stripped-down bot response.
import { isSafeUrl } from "./safeUrl";
import type { FetchDebugInfo } from "./types";

const FETCH_TIMEOUT_MS = 9000;
const MAX_REDIRECTS = 5;
const MAX_HTML_BYTES = 3 * 1024 * 1024; // 3MB cap

const USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";
const ACCEPT_HEADER =
  "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8";
const ACCEPT_LANGUAGE_HEADER = "en-US,en;q=0.9";

export type FetchOutcome =
  | { ok: true; html: string; finalUrl: string; debug: FetchDebugInfo }
  | { ok: false; error: string; debug: FetchDebugInfo };

function emptyDebug(requestedUrl: string): FetchDebugInfo {
  return {
    requestedUrl,
    finalUrl: null,
    ok: false,
    status: null,
    contentType: null,
    contentLength: null,
    htmlEmpty: true,
    error: null,
  };
}

async function readBodyCapped(res: Response, maxBytes: number): Promise<string> {
  const reader = res.body?.getReader();
  if (!reader) return (await res.text()).slice(0, maxBytes);

  const chunks: Uint8Array[] = [];
  let received = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    if (value) {
      received += value.byteLength;
      chunks.push(value);
      if (received >= maxBytes) {
        await reader.cancel().catch(() => {});
        break;
      }
    }
  }
  return Buffer.concat(chunks.map((c) => Buffer.from(c))).toString("utf-8");
}

function devLog(debug: FetchDebugInfo) {
  if (process.env.NODE_ENV === "production") return;
  console.debug("[scrape:fetch]", JSON.stringify(debug));
}

/** Fetches a URL's HTML, following redirects manually so each hop is re-validated against the safe-URL rules. */
export async function safeFetchHtml(startUrl: URL): Promise<FetchOutcome> {
  const debug = emptyDebug(startUrl.toString());
  let currentUrl = startUrl;

  for (let attempt = 0; attempt <= MAX_REDIRECTS; attempt++) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
    let res: Response;
    try {
      res = await fetch(currentUrl.toString(), {
        redirect: "manual",
        signal: controller.signal,
        headers: {
          "User-Agent": USER_AGENT,
          Accept: ACCEPT_HEADER,
          "Accept-Language": ACCEPT_LANGUAGE_HEADER,
        },
      });
    } catch (err) {
      clearTimeout(timeout);
      debug.error = err instanceof Error && err.name === "AbortError" ? "timeout" : "network_error";
      devLog(debug);
      return { ok: false, error: "timeout_or_network", debug };
    }
    clearTimeout(timeout);

    if (res.status >= 300 && res.status < 400) {
      const location = res.headers.get("location");
      if (!location) {
        debug.status = res.status;
        debug.error = "redirect_no_location";
        devLog(debug);
        return { ok: false, error: "redirect_no_location", debug };
      }
      let nextUrl: URL;
      try {
        nextUrl = new URL(location, currentUrl);
      } catch {
        debug.status = res.status;
        debug.error = "invalid_redirect";
        devLog(debug);
        return { ok: false, error: "invalid_redirect", debug };
      }
      const check = isSafeUrl(nextUrl.toString());
      if (!check.ok) {
        debug.status = res.status;
        debug.error = "unsafe_redirect_target";
        devLog(debug);
        return { ok: false, error: "unsafe_redirect_target", debug };
      }
      currentUrl = check.url;
      continue;
    }

    debug.finalUrl = currentUrl.toString();
    debug.status = res.status;
    debug.contentType = res.headers.get("content-type");
    debug.contentLength = res.headers.get("content-length")
      ? Number(res.headers.get("content-length"))
      : null;

    if (!res.ok) {
      debug.error = `http_${res.status}`;
      devLog(debug);
      return { ok: false, error: `http_${res.status}`, debug };
    }

    if (debug.contentType && !debug.contentType.includes("html")) {
      debug.error = "non_html_content";
      devLog(debug);
      return { ok: false, error: "non_html_content", debug };
    }

    const html = await readBodyCapped(res, MAX_HTML_BYTES);
    debug.htmlEmpty = html.trim().length === 0;
    debug.ok = true;
    devLog(debug);

    if (debug.htmlEmpty) {
      return { ok: false, error: "empty_html", debug };
    }

    return { ok: true, html, finalUrl: currentUrl.toString(), debug };
  }

  debug.error = "too_many_redirects";
  devLog(debug);
  return { ok: false, error: "too_many_redirects", debug };
}

export function describeFetchError(error: string): string {
  if (error === "too_many_redirects") return "Too many redirects — could not reach the final page.";
  if (error === "non_html_content") return "The URL did not return an HTML page.";
  if (error === "unsafe_redirect_target") return "The page redirected to a disallowed internal address.";
  if (error === "empty_html") return "The page returned an empty response.";
  if (error === "redirect_no_location") return "The page redirected without a destination.";
  if (error === "invalid_redirect") return "The page redirected to an invalid address.";
  if (error.startsWith("http_")) {
    const code = error.replace("http_", "");
    return `The site returned an error (HTTP ${code}). Could not automatically fetch details. You can fill them in manually.`;
  }
  if (error === "timeout_or_network") {
    return "Could not reach the URL (timed out or network error). Could not automatically fetch details. You can fill them in manually.";
  }
  return "Could not automatically fetch details. You can fill them in manually.";
}
