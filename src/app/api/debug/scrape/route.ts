import { analyzeUrlPreview } from "@/lib/scrape/analyzeUrl";
import { previewRequestSchema } from "@/lib/validation";
import { checkRateLimit } from "@/lib/rate-limit";
import { ok, badRequest, validationError, tooManyRequests, requestKey } from "@/lib/api-response";

// Full-detail diagnostics endpoint backing /debug/scrape. Already sits
// behind the app's global auth wall (see src/proxy.ts) — same protection as
// every other page/API route, so no extra gating is needed here.
export async function POST(request: Request) {
  const key = requestKey(request);
  const rate = checkRateLimit(`debug-scrape:${key}`, { windowMs: 60_000, max: 20 });
  if (!rate.allowed) return tooManyRequests(rate.retryAfterMs);

  const body = await request.json().catch(() => null);
  if (body === null) return badRequest("Invalid JSON body");

  const parsed = previewRequestSchema.safeParse(body);
  if (!parsed.success) return validationError(parsed.error);

  const result = await analyzeUrlPreview(parsed.data.url);
  return ok(result);
}
