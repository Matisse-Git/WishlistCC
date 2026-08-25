"use client";

import { useEffect, useMemo, useState } from "react";
import { X, Check, Undo2 } from "lucide-react";
import { formatMoney } from "@/lib/money";
import type { SerializedItem } from "@/lib/items";

interface Candidate {
  id: string;
  title: string;
  convertedPrice: string | null;
  originalPrice: string | null;
  originalCurrency: string | null;
  baseCurrency: string | null;
}

interface VariantPickerProps {
  /** Group name currently set on the form — candidates are scoped to items in this group. */
  groupName: string;
  /** Self, when editing — excluded from the candidate list. */
  excludeItemId?: string;
  /** This item's current variant-set members, excluding itself (empty if not in a set). */
  siblings: SerializedItem[];
  /** Pending change: undefined = none, null = will detach on save, string = will attach to this item id on save. */
  value: string | null | undefined;
  /** Display label for `value` to show before the candidate list finishes loading. */
  valueLabel?: string;
  onChange: (value: string | null | undefined) => void;
}

function priceOf(c: Candidate): string {
  return formatMoney(c.convertedPrice ?? c.originalPrice, c.baseCurrency ?? c.originalCurrency);
}

export function VariantPicker({ groupName, excludeItemId, siblings, value, valueLabel, onChange }: VariantPickerProps) {
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [input, setInput] = useState("");
  const [focused, setFocused] = useState(false);

  useEffect(() => {
    // Nothing to fetch without a group — the render below only reads
    // `candidates` once `groupName` is set, so leaving stale state here is
    // harmless and avoids a synchronous setState-in-effect.
    if (!groupName) return;
    let cancelled = false;
    fetch("/api/groups")
      .then((res) => (res.ok ? res.json() : []))
      .then((groups: { id: string; name: string }[]) => {
        const match = groups.find((g) => g.name === groupName);
        if (!match) return { items: [] as SerializedItem[] };
        return fetch(`/api/items?group=${match.id}&status=wishlist&pageSize=200&sortBy=titleAsc`).then((res) =>
          res.ok ? res.json() : { items: [] }
        );
      })
      .then((data: { items: SerializedItem[] }) => {
        if (cancelled) return;
        setCandidates(
          (data.items ?? [])
            .filter((it) => it.id !== excludeItemId)
            .map((it) => ({
              id: it.id,
              title: it.title,
              convertedPrice: it.convertedPrice,
              originalPrice: it.originalPrice,
              originalCurrency: it.originalCurrency,
              baseCurrency: it.baseCurrency,
            }))
        );
      })
      .catch(() => !cancelled && setCandidates([]));
    return () => {
      cancelled = true;
    };
  }, [groupName, excludeItemId]);

  const suggestions = useMemo(() => {
    const q = input.trim().toLowerCase();
    return candidates.filter((c) => (q ? c.title.toLowerCase().includes(q) : true)).slice(0, 8);
  }, [candidates, input]);

  return (
    <div className="space-y-2">
      {siblings.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {siblings.map((s) => (
            <span
              key={s.id}
              className="inline-flex items-center gap-1 rounded-full bg-surface-muted px-2 py-0.5 text-xs text-muted-foreground"
            >
              {s.isSelected && <Check className="h-3 w-3 text-emerald-600" />}
              {s.title} · {formatMoney(s.convertedPrice ?? s.originalPrice, s.baseCurrency ?? s.originalCurrency)}
            </span>
          ))}
        </div>
      )}

      {typeof value === "string" && value ? (
        <div className="flex items-center gap-1.5 rounded-xl border border-border bg-surface px-2.5 py-2">
          <span className="inline-flex items-center gap-1 rounded-full bg-accent-soft px-2 py-0.5 text-xs font-medium text-accent-hover">
            Variant of: {candidates.find((c) => c.id === value)?.title ?? valueLabel ?? "selected item"}
            <button type="button" onClick={() => onChange(undefined)} aria-label="Cancel variant pick" className="hover:opacity-70">
              <X className="h-3 w-3" />
            </button>
          </span>
        </div>
      ) : value === null ? (
        <div className="flex items-center gap-1.5 rounded-xl border border-dashed border-border px-3.5 py-2.5 text-xs text-muted-foreground">
          <span className="flex-1">Will be removed from its variant set when you save.</span>
          <button type="button" onClick={() => onChange(undefined)} className="flex items-center gap-1 font-medium text-accent-hover hover:underline">
            <Undo2 className="h-3 w-3" /> Undo
          </button>
        </div>
      ) : !groupName ? (
        <p className="rounded-xl border border-dashed border-border px-3.5 py-2.5 text-xs text-muted-foreground">
          Add this item to a group above to search for other items to compare it with.
        </p>
      ) : (
        <div className="relative">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onFocus={() => setFocused(true)}
            onBlur={() => setTimeout(() => setFocused(false), 120)}
            placeholder="Search items in this group…"
            className="w-full rounded-xl border border-border bg-surface px-3.5 py-2.5 text-sm placeholder:text-muted-foreground/70 focus:outline-none focus:ring-2 focus:ring-ring"
          />
          {focused && suggestions.length > 0 && (
            <ul className="absolute z-10 mt-1 max-h-48 w-full overflow-y-auto rounded-xl border border-border bg-surface text-sm shadow-[var(--shadow-soft-lg)]">
              {suggestions.map((c) => (
                <li key={c.id}>
                  <button
                    type="button"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => {
                      onChange(c.id);
                      setInput("");
                    }}
                    className="flex w-full items-center justify-between gap-2 px-3 py-1.5 text-left hover:bg-surface-muted"
                  >
                    <span className="truncate">{c.title}</span>
                    <span className="shrink-0 tabular-nums text-xs text-muted-foreground">{priceOf(c)}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
          {candidates.length === 0 && (
            <p className="mt-1.5 text-xs text-muted-foreground">No other wishlist items in this group yet.</p>
          )}
          {siblings.length > 0 && (
            <button
              type="button"
              onClick={() => onChange(null)}
              className="mt-1.5 text-xs font-medium text-destructive hover:underline"
            >
              Remove from this variant set
            </button>
          )}
        </div>
      )}
    </div>
  );
}
