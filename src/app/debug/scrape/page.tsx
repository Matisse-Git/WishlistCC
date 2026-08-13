"use client";

import { useState } from "react";
import { Search, CheckCircle2, XCircle, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input, Label } from "@/components/ui/Input";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { PageHeader } from "@/components/ui/PageHeader";
import type { AnalyzeUrlResult } from "@/lib/scrape/types";

/**
 * Hidden diagnostics page for the URL preview / metadata extraction
 * pipeline. Not linked from navigation — reachable at /debug/scrape by
 * anyone who's already authenticated (same auth wall as the rest of the
 * app). Shows exactly what was fetched, every candidate considered for
 * title/image/price/currency, and why the losing candidates lost.
 */
export default function ScrapeDebugPage() {
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<AnalyzeUrlResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleAnalyze(e: React.FormEvent) {
    e.preventDefault();
    if (!url.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/debug/scrape", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: url.trim() }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error ?? "Request failed");
      setResult(data as AnalyzeUrlResult);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Request failed");
      setResult(null);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-4xl space-y-6">
      <PageHeader
        title="Scrape diagnostics"
        subtitle="Inspect exactly what the link autofill extracted from a URL, and why."
      />

      <Card padding="md">
        <form onSubmit={handleAnalyze} className="flex flex-col gap-2 sm:flex-row sm:items-end">
          <div className="flex-1">
            <Label htmlFor="debug-url">URL</Label>
            <Input
              id="debug-url"
              type="text"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://example.com/product"
            />
          </div>
          <Button type="submit" variant="primary" loading={loading}>
            <Search className="h-4 w-4" />
            Analyze
          </Button>
        </form>
      </Card>

      {error && (
        <Card padding="md" className="border-red-200 bg-red-50 text-sm text-red-700">
          {error}
        </Card>
      )}

      {result && (
        <div className="space-y-4">
          <Summary result={result} />
          <FetchInfo result={result} />
          <FieldSection
            label="Title"
            selectedSource={result.debug.selectedTitleSource}
            selectedValue={result.title}
            candidates={result.debug.titles.map((t) => ({ label: t.value, source: t.source }))}
          />
          <ImageSection result={result} />
          <PriceSection result={result} />
          <RawJson result={result} />
        </div>
      )}
    </div>
  );
}

function Summary({ result }: { result: AnalyzeUrlResult }) {
  return (
    <Card padding="md" className="space-y-3">
      <div className="flex items-center gap-2">
        {result.ok ? (
          <CheckCircle2 className="h-4 w-4 text-emerald-600" />
        ) : (
          <XCircle className="h-4 w-4 text-red-600" />
        )}
        <h2 className="text-sm font-semibold text-foreground">{result.ok ? "Extraction succeeded" : "Extraction failed"}</h2>
      </div>
      <dl className="grid grid-cols-1 gap-x-6 gap-y-2 text-sm sm:grid-cols-2">
        <Field label="Requested URL" value={result.url} />
        <Field label="Final URL" value={result.finalUrl} />
        <Field label="Store" value={result.store} />
        <Field label="Title" value={result.title} />
        <Field label="Price" value={result.price ? `${result.price} ${result.currency ?? "(unknown currency)"}` : null} />
        <Field label="Image URL" value={result.imageUrl} />
      </dl>
      {result.warnings.length > 0 && (
        <div className="space-y-1 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
          {result.warnings.map((w, i) => (
            <div key={i} className="flex items-start gap-1.5">
              <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              <span>{w}</span>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}

function FetchInfo({ result }: { result: AnalyzeUrlResult }) {
  const f = result.debug.fetch;
  return (
    <Card padding="md" className="space-y-2">
      <h2 className="text-sm font-semibold text-foreground">Fetch</h2>
      <dl className="grid grid-cols-1 gap-x-6 gap-y-2 text-sm sm:grid-cols-2">
        <Field label="Status" value={f.status?.toString() ?? "—"} />
        <Field label="Content-Type" value={f.contentType} />
        <Field label="Content-Length" value={f.contentLength?.toString() ?? "—"} />
        <Field label="HTML empty" value={f.htmlEmpty ? "yes" : "no"} />
        <Field label="Error" value={f.error} />
        <Field label="JSON-LD blocks found" value={result.debug.jsonLdBlocksFound.toString()} />
        <Field label="JSON-LD parse errors" value={result.debug.jsonLdParseErrors.toString()} />
        <Field label="JSON-LD product nodes" value={result.debug.jsonLdProductNodesFound.toString()} />
        <Field label="Open Graph tags found" value={result.debug.openGraphTagsFound.join(", ") || "none"} />
        <Field label="Microdata found" value={result.debug.microdataFound ? "yes" : "no"} />
      </dl>
    </Card>
  );
}

function ImageSection({ result }: { result: AnalyzeUrlResult }) {
  const { images, imageAlternates, selectedImageSource, imageRejectionReason } = result.debug;
  const all = [...images, ...imageAlternates];
  return (
    <Card padding="md" className="space-y-2">
      <h2 className="text-sm font-semibold text-foreground">Image candidates</h2>
      {selectedImageSource && (
        <p className="text-xs text-muted-foreground">
          Selected source: <Badge tone="accent">{selectedImageSource}</Badge>
        </p>
      )}
      {imageRejectionReason && <p className="text-xs text-amber-700">Not selected: {imageRejectionReason}</p>}
      {all.length === 0 ? (
        <p className="text-xs text-muted-foreground">No image candidates found.</p>
      ) : (
        <ul className="space-y-2">
          {all.map((c, i) => (
            <li key={i} className="flex items-center gap-3 rounded-lg border border-border p-2 text-xs">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={c.url} alt="" referrerPolicy="no-referrer" className="h-10 w-10 rounded object-cover" />
              <div className="min-w-0 flex-1">
                <p className="truncate font-mono">{c.url}</p>
                <p className="text-muted-foreground">
                  source: {c.source} · score: {c.score}
                  {c.width && c.height ? ` · ${c.width}x${c.height}` : ""}
                </p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

function PriceSection({ result }: { result: AnalyzeUrlResult }) {
  const { prices, priceAlternates, selectedPriceSource, priceRejectionReason } = result.debug;
  const all = [...prices, ...priceAlternates];
  return (
    <Card padding="md" className="space-y-2">
      <h2 className="text-sm font-semibold text-foreground">Price candidates</h2>
      {selectedPriceSource && (
        <p className="text-xs text-muted-foreground">
          Selected source: <Badge tone="accent">{selectedPriceSource}</Badge>
        </p>
      )}
      {priceRejectionReason && <p className="text-xs text-amber-700">Not selected: {priceRejectionReason}</p>}
      {all.length === 0 ? (
        <p className="text-xs text-muted-foreground">No price candidates found.</p>
      ) : (
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="text-muted-foreground">
              <th className="py-1 pr-3 font-medium">Amount</th>
              <th className="py-1 pr-3 font-medium">Currency</th>
              <th className="py-1 pr-3 font-medium">Source</th>
              <th className="py-1 pr-3 font-medium">Confidence</th>
              <th className="py-1 font-medium">Raw</th>
            </tr>
          </thead>
          <tbody>
            {all.map((c, i) => (
              <tr key={i} className="border-t border-border">
                <td className="py-1 pr-3 tabular-nums">{c.amount ?? "—"}</td>
                <td className="py-1 pr-3">{c.currency ?? "?"}</td>
                <td className="py-1 pr-3">{c.source}</td>
                <td className="py-1 pr-3">{c.confidence}</td>
                <td className="max-w-[200px] truncate py-1 font-mono">{c.raw}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </Card>
  );
}

function FieldSection({
  label,
  selectedSource,
  selectedValue,
  candidates,
}: {
  label: string;
  selectedSource: string | null;
  selectedValue: string | null;
  candidates: { label: string; source: string }[];
}) {
  return (
    <Card padding="md" className="space-y-2">
      <h2 className="text-sm font-semibold text-foreground">{label} candidates</h2>
      {selectedValue && selectedSource && (
        <p className="text-xs text-muted-foreground">
          Selected (<Badge tone="accent">{selectedSource}</Badge>): {selectedValue}
        </p>
      )}
      {candidates.length === 0 ? (
        <p className="text-xs text-muted-foreground">No candidates found.</p>
      ) : (
        <ul className="space-y-1 text-xs">
          {candidates.map((c, i) => (
            <li key={i} className="flex gap-2">
              <span className="shrink-0 text-muted-foreground">{c.source}</span>
              <span className="truncate">{c.label}</span>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

function RawJson({ result }: { result: AnalyzeUrlResult }) {
  return (
    <details className="rounded-xl border border-border bg-surface-muted p-4">
      <summary className="cursor-pointer text-sm font-semibold text-foreground">Raw JSON</summary>
      <pre className="mt-3 max-h-[500px] overflow-auto rounded-lg bg-[#1e1e1e] p-3 text-xs text-[#d4d4d4]">
        {JSON.stringify(result, null, 2)}
      </pre>
    </details>
  );
}

function Field({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div className="min-w-0">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="truncate font-mono text-xs text-foreground">{value || "—"}</dd>
    </div>
  );
}
