import { fetchProductPreview } from "@/lib/scraper";
import { previewRequestSchema } from "@/lib/validation";
import { checkRateLimit } from "@/lib/rate-limit";
import { ok, badRequest, validationError, tooManyRequests, requestKey } from "@/lib/api-response";

export async function POST(request: Request) {
  const key = requestKey(request);
  const rate = checkRateLimit(`preview:${key}`, { windowMs: 60_000, max: 10 });
  if (!rate.allowed) return tooManyRequests(rate.retryAfterMs);

  const body = await request.json().catch(() => null);
  if (body === null) return badRequest("Invalid JSON body");

  const parsed = previewRequestSchema.safeParse(body);
  if (!parsed.success) return validationError(parsed.error);

  const result = await fetchProductPreview(parsed.data.url);
  return ok(result);
}
