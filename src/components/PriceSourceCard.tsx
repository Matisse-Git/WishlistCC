"use client";

import { useLayoutEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Store, X } from "lucide-react";
import Decimal from "decimal.js";
import { ItemCard } from "./ItemCard";
import { useToast } from "./ToastProvider";
import { useLiveTotals } from "./LiveTotalsProvider";
import { formatMoney, toDecimal } from "@/lib/money";
import { cn } from "@/lib/cn";
import type { SerializedItem, SerializedPriceSource } from "@/lib/items";

interface PriceSourceCardProps {
  /** The item to display — its own url/store/price fields are always "the active listing" (see PriceSource). */
  item: SerializedItem;
  onEdit?: (item: SerializedItem) => void;
  onMarkBought?: (item: SerializedItem) => void;
  onDelete?: (item: SerializedItem) => void;
  onAddVariant?: (item: SerializedItem) => void;
  onAddPriceSource?: (item: SerializedItem) => void;
}

interface PriceOption {
  key: string; // "active" for the item's own listing, otherwise a PriceSource id
  store: string | null;
  url: string | null;
  originalPrice: string | null;
  originalCurrency: string | null;
  convertedPrice: string | null;
  baseCurrency: string | null;
}

function toOption(key: string, data: SerializedPriceSource | SerializedItem): PriceOption {
  return {
    key,
    store: data.store,
    url: data.url,
    originalPrice: data.originalPrice,
    originalCurrency: data.originalCurrency,
    convertedPrice: data.convertedPrice,
    baseCurrency: data.baseCurrency,
  };
}

function labelFor(option: PriceOption): string {
  if (option.store) return option.store;
  if (option.url) {
    try {
      return new URL(option.url).hostname.replace(/^www\./, "");
    } catch {
      // fall through
    }
  }
  return "Unknown store";
}

export function PriceSourceCard({ item, onEdit, onMarkBought, onDelete, onAddVariant, onAddPriceSource }: PriceSourceCardProps) {
  const router = useRouter();
  const { showToast } = useToast();
  const { setOverride, clearOverride } = useLiveTotals();

  const options: PriceOption[] = [toOption("active", item), ...item.priceSources.map((s) => toOption(s.id, s))];

  const [optimisticKey, setOptimisticKey] = useState<string | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [removingKey, setRemovingKey] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const latestRequestedKeyRef = useRef<string | null>(null);

  // Every swap bumps the item's updatedAt (it's a plain field update), so
  // that alone is a reliable "fresh server data has landed" signal — no
  // need to hash the individual price/url/store fields. Adjusted during
  // render for the same reason as VariantCard: React disallows updating a
  // different component's state (clearOverride) mid-render, so the actual
  // handoff still needs a layout effect below.
  const [lastUpdatedAt, setLastUpdatedAt] = useState(item.updatedAt);
  if (item.updatedAt !== lastUpdatedAt) {
    setLastUpdatedAt(item.updatedAt);
    setOptimisticKey(null);
  }

  useLayoutEffect(() => {
    clearOverride(item.id);
  }, [item.updatedAt, item.id, clearOverride]);

  const selected = options.find((o) => o.key === optimisticKey) ?? options[0];

  // Overlay the optimistically-picked option's listing fields onto the item
  // so the card itself updates instantly too, not just the pill highlight —
  // same feel as switching a variant.
  const effectiveItem: SerializedItem = {
    ...item,
    url: selected.url,
    store: selected.store,
    originalPrice: selected.originalPrice,
    originalCurrency: selected.originalCurrency,
    convertedPrice: selected.convertedPrice,
    baseCurrency: selected.baseCurrency,
  };

  async function handleSwitch(target: PriceOption) {
    if (target.key === selected.key) return;

    latestRequestedKeyRef.current = target.key;
    setOptimisticKey(target.key);
    setSyncing(true);

    setOverride(item.id, {
      groupId: item.group?.id ?? null,
      delta: (toDecimal(target.convertedPrice) ?? new Decimal(0)).minus(toDecimal(item.convertedPrice) ?? new Decimal(0)),
    });

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const res = await fetch(`/api/items/${item.id}/price-sources/${target.key}/activate`, {
        method: "POST",
        signal: controller.signal,
      });
      if (!res.ok) throw new Error("Failed to switch price source");
      if (latestRequestedKeyRef.current === target.key) {
        router.refresh();
      }
    } catch (err) {
      if (controller.signal.aborted) return;
      if (latestRequestedKeyRef.current === target.key) {
        setOptimisticKey(null);
        clearOverride(item.id);
        router.refresh();
        showToast(err instanceof Error ? err.message : "Failed to switch price source", "error");
      }
    } finally {
      if (latestRequestedKeyRef.current === target.key) setSyncing(false);
    }
  }

  async function handleRemove(sourceId: string) {
    setRemovingKey(sourceId);
    try {
      const res = await fetch(`/api/items/${item.id}/price-sources/${sourceId}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to remove price source");
      router.refresh();
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Failed to remove price source", "error");
      setRemovingKey(null);
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <ItemCard
        item={effectiveItem}
        onEdit={onEdit}
        onMarkBought={onMarkBought}
        onDelete={onDelete}
        onAddVariant={onAddVariant}
        onAddPriceSource={onAddPriceSource}
      />

      {item.priceSources.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5 rounded-xl border border-dashed border-border bg-surface-muted/60 px-2.5 py-2">
          {syncing ? (
            <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin text-muted-foreground" />
          ) : (
            <Store className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
          )}
          {options.map((o) => (
            <span
              key={o.key}
              className={cn(
                "flex items-center rounded-full text-xs font-medium transition-colors",
                o.key === selected.key
                  ? "bg-accent text-accent-foreground"
                  : "bg-surface text-muted-foreground hover:bg-accent-soft hover:text-accent-hover"
              )}
            >
              <button
                type="button"
                onClick={() => handleSwitch(o)}
                title={`${labelFor(o)} — ${formatMoney(o.convertedPrice ?? o.originalPrice, o.baseCurrency ?? o.originalCurrency)}`}
                className={cn("py-1 pl-2.5", o.key === "active" ? "pr-2.5" : "pr-1")}
              >
                {labelFor(o)} · {formatMoney(o.convertedPrice ?? o.originalPrice, o.baseCurrency ?? o.originalCurrency)}
              </button>
              {o.key !== "active" && (
                <button
                  type="button"
                  onClick={() => handleRemove(o.key)}
                  disabled={removingKey === o.key}
                  aria-label={`Remove ${labelFor(o)} price source`}
                  className="rounded-full p-1 pr-2 hover:opacity-70 disabled:opacity-40"
                >
                  <X className="h-3 w-3" />
                </button>
              )}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
