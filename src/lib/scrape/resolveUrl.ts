// URL resolution helpers shared by image and link extraction.

export function resolveUrl(src: string | undefined | null, base: string): string | null {
  if (!src) return null;
  const trimmed = src.trim();
  if (!trimmed) return null;
  try {
    const resolved = new URL(trimmed, base);
    if (resolved.protocol !== "http:" && resolved.protocol !== "https:") return null;
    return resolved.toString();
  } catch {
    return null;
  }
}

/**
 * Pulls the first URL out of a `srcset`/`data-srcset` attribute value, e.g.
 * "img-320.jpg 320w, img-640.jpg 640w" -> "img-320.jpg". Browsers pick the
 * best match by viewport; for our purposes any real candidate is enough.
 */
export function firstUrlFromSrcset(srcset: string | undefined | null): string | null {
  if (!srcset) return null;
  const first = srcset.split(",")[0]?.trim();
  if (!first) return null;
  return first.split(/\s+/)[0] || null;
}
