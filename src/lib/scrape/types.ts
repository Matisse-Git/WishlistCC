// Shared types for the URL preview / metadata extraction pipeline.

export type SourceType =
  | "json-ld"
  | "og"
  | "twitter"
  | "meta"
  | "microdata"
  | "link"
  | "html-title"
  | "html-img"
  | "regex";

export type Confidence = "high" | "medium" | "low";

export interface ImageCandidate {
  /** Absolute URL. */
  url: string;
  source: SourceType;
  score: number;
  width?: number;
  height?: number;
  /** Set when the candidate was filtered out — kept around for debug output. */
  rejected?: string;
}

export interface PriceCandidate {
  /** Normalized decimal string, e.g. "19.99". Null if the raw text couldn't be parsed. */
  amount: string | null;
  currency: string | null;
  source: SourceType;
  confidence: Confidence;
  /** The raw text this candidate was parsed from, for debugging. */
  raw: string;
}

export interface TitleCandidate {
  value: string;
  source: SourceType;
}

export interface DescriptionCandidate {
  value: string;
  source: SourceType;
}

export interface FetchDebugInfo {
  requestedUrl: string;
  finalUrl: string | null;
  ok: boolean;
  status: number | null;
  contentType: string | null;
  contentLength: number | null;
  htmlEmpty: boolean;
  error: string | null;
}

export interface ExtractionDebugInfo {
  fetch: FetchDebugInfo;
  jsonLdBlocksFound: number;
  jsonLdParseErrors: number;
  jsonLdProductNodesFound: number;
  openGraphTagsFound: string[];
  microdataFound: boolean;
  titles: TitleCandidate[];
  descriptions: DescriptionCandidate[];
  images: ImageCandidate[];
  imageAlternates: ImageCandidate[];
  prices: PriceCandidate[];
  priceAlternates: PriceCandidate[];
  selectedTitleSource: SourceType | null;
  selectedImageSource: SourceType | null;
  selectedPriceSource: SourceType | null;
  imageRejectionReason: string | null;
  priceRejectionReason: string | null;
}

export interface AnalyzeUrlResult {
  ok: boolean;
  url: string;
  finalUrl: string;
  title: string | null;
  description: string | null;
  imageUrl: string | null;
  /** Decimal string, not a float — keeps money handling exact. */
  price: string | null;
  currency: string | null;
  store: string | null;
  warnings: string[];
  debug: ExtractionDebugInfo;
}
