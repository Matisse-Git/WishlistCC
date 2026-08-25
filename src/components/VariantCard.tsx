"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { GitCompare, Loader2, Plus } from "lucide-react";
import { ItemCard } from "./ItemCard";
import { useToast } from "./ToastProvider";
import { formatMoney } from "@/lib/money";
import { cn } from "@/lib/cn";
import type { SerializedItem } from "@/lib/items";

interface VariantCardProps {
  /** Any member of the variant set — the currently-selected sibling is resolved and shown as the primary card. */
  item: SerializedItem;
  onEdit?: (item: SerializedItem) => void;
  onMarkBought?: (item: SerializedItem) => void;
  onDelete?: (item: SerializedItem) => void;
  onAddVariant?: (item: SerializedItem) => void;
}

function truncate(title: string, max = 24): string {
  return title.length > max ? `${title.slice(0, max - 1)}…` : title;
}

export function VariantCard({ item, onEdit, onMarkBought, onDelete, onAddVariant }: VariantCardProps) {
  const router = useRouter();
  const { showToast } = useToast();

  const options = item.variants.length > 1 ? item.variants : [item];
  const serverSelected = options.find((v) => v.isSelected) ?? options[0];

  // Applied the moment a pill is clicked, so switching feels instant instead
  // of waiting on a round trip. Cleared once fresh server data (via
  // router.refresh()) confirms a selection, so it never goes stale.
  const [optimisticId, setOptimisticId] = useState<string | null>(null);
  const [syncing, setSyncing] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const latestRequestedIdRef = useRef<string | null>(null);

  // Adjusted during render (React's recommended pattern — see ItemFormModal
  // for the same idiom) rather than in an effect: once fresh server data
  // confirms a selection, drop the local override on the very next paint
  // instead of flashing the old state for an extra render first.
  const selectionSignature = options.map((v) => (v.isSelected ? v.id : "_")).join(",");
  const [lastSignature, setLastSignature] = useState(selectionSignature);
  if (selectionSignature !== lastSignature) {
    setLastSignature(selectionSignature);
    setOptimisticId(null);
  }

  const selected = options.find((v) => v.id === optimisticId) ?? serverSelected;

  async function handleSwitch(target: SerializedItem) {
    if (target.id === selected.id) return;

    latestRequestedIdRef.current = target.id;
    setOptimisticId(target.id);
    setSyncing(true);

    // A rapid second click cancels whatever switch is still in flight — only
    // the latest one is allowed to land.
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const res = await fetch(`/api/items/${target.id}/select-variant`, {
        method: "POST",
        signal: controller.signal,
      });
      if (!res.ok) throw new Error("Failed to switch variant");
      if (latestRequestedIdRef.current === target.id) {
        router.refresh();
      }
    } catch (err) {
      if (controller.signal.aborted) return; // superseded by a newer click — its own request owns the outcome now
      if (latestRequestedIdRef.current === target.id) {
        setOptimisticId(null);
        router.refresh(); // re-sync with whatever the server actually ended up with
        showToast(err instanceof Error ? err.message : "Failed to switch variant", "error");
      }
    } finally {
      if (latestRequestedIdRef.current === target.id) setSyncing(false);
    }
  }

  // `selected` may be a sibling summary (see SerializedItem.variants), which
  // never carries its own nested variants — reattach the full set from the
  // anchor `item` so editing shows the "grouped with…" context correctly
  // regardless of which member happens to be selected.
  const selectedWithVariants: SerializedItem = { ...selected, variants: item.variants.length > 1 ? item.variants : [] };

  return (
    <div className="flex flex-col gap-2">
      <ItemCard
        item={selected}
        onEdit={onEdit ? () => onEdit(selectedWithVariants) : undefined}
        onMarkBought={onMarkBought}
        onDelete={onDelete}
      />

      <div className="flex flex-wrap items-center gap-1.5 rounded-xl border border-dashed border-border bg-surface-muted/60 px-2.5 py-2">
        {syncing ? (
          <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin text-muted-foreground" />
        ) : (
          <GitCompare className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
        )}
        {options.map((v) => (
          <button
            key={v.id}
            type="button"
            onClick={() => handleSwitch(v)}
            title={`${v.title} — ${formatMoney(v.convertedPrice ?? v.originalPrice, v.baseCurrency ?? v.originalCurrency)}`}
            className={cn(
              "rounded-full px-2.5 py-1 text-xs font-medium transition-colors",
              v.id === selected.id
                ? "bg-accent text-accent-foreground"
                : "bg-surface text-muted-foreground hover:bg-accent-soft hover:text-accent-hover"
            )}
          >
            {truncate(v.title)} · {formatMoney(v.convertedPrice ?? v.originalPrice, v.baseCurrency ?? v.originalCurrency)}
          </button>
        ))}
        {onAddVariant && (
          <button
            type="button"
            onClick={() => onAddVariant(selected)}
            className="flex items-center gap-1 rounded-full border border-dashed border-border px-2.5 py-1 text-xs font-medium text-muted-foreground hover:border-accent hover:text-accent-hover"
          >
            <Plus className="h-3 w-3" />
            Add option
          </button>
        )}
      </div>
      <p className="px-1 text-xs text-muted-foreground">
        {options.length} option{options.length === 1 ? "" : "s"} for this slot — only the highlighted one counts toward your total.
      </p>
    </div>
  );
}
