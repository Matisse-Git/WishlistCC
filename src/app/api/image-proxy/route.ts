import { fetchImageForProxy } from "@/lib/image/proxy";
import { checkRateLimit } from "@/lib/rate-limit";
import { requestKey } from "@/lib/api-response";

export async function GET(request: Request) {
  const key = requestKey(request);
  const rate = checkRateLimit(`image-proxy:${key}`, { windowMs: 60_000, max: 60 });
  if (!rate.allowed) {
    return new Response("Too many requests", {
      status: 429,
      headers: { "Retry-After": Math.ceil(rate.retryAfterMs / 1000).toString() },
    });
  }

  const { searchParams } = new URL(request.url);
  const url = searchParams.get("url");
  if (!url) {
    return new Response("Missing url parameter", { status: 400 });
  }

  const result = await fetchImageForProxy(url);
  if (!result.ok) {
    return new Response(result.reason, { status: result.status });
  }

  return new Response(new Uint8Array(result.bytes), {
    status: 200,
    headers: {
      "Content-Type": result.contentType,
      "Cache-Control": "public, max-age=1800, immutable",
      "Referrer-Policy": "no-referrer",
      "X-Proxy-Cache": result.cached ? "HIT" : "MISS",
    },
  });
}
