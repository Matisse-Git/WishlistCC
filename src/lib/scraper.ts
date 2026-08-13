// Backward-compatible entry point for URL preview / metadata extraction.
// The actual implementation lives in `./scrape/*` (see analyzeUrl.ts for the
// full diagnostics-capable pipeline); this file just re-exports the pieces
// existing callers (the preview API route, tests) already depend on.
export { fetchProductPreview, analyzeUrlPreview, type PreviewResult } from "./scrape/analyzeUrl";
export { isSafeUrl, type SafeUrlCheck } from "./scrape/safeUrl";
export { storeNameFromUrl } from "./scrape/storeName";
