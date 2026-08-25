"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { GitCompare, Plus } from "lucide-react";
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
  const [switching, setSwitching] = useState<string | null>(null);

  const options = item.variants.length > 1 ? item.variants : [item];
  const selected = options.find((v) => v.isSelected) ?? options[0];

  async function handleSwitch(target: SerializedItem) {
    if (target.id === selected.id || switching) return;
    setSwitching(target.id);
    try {
      const res = await fetch(`/api/items/${target.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ selectVariant: true }),
      });
      if (!res.ok) throw new Error("Failed to switch variant");
      router.refresh();
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Failed to switch variant", "error");
    } finally {
      setSwitching(null);
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
        <GitCompare className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
        {options.map((v) => (
          <button
            key={v.id}
            type="button"
            onClick={() => handleSwitch(v)}
            disabled={switching !== null}
            title={`${v.title} — ${formatMoney(v.convertedPrice ?? v.originalPrice, v.baseCurrency ?? v.originalCurrency)}`}
            className={cn(
              "rounded-full px-2.5 py-1 text-xs font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-60",
              v.id === selected.id
                ? "bg-accent text-accent-foreground"
                : "bg-surface text-muted-foreground hover:bg-accent-soft hover:text-accent-hover"
            )}
          >
            {switching === v.id
              ? "Switching…"
              : `${truncate(v.title)} · ${formatMoney(v.convertedPrice ?? v.originalPrice, v.baseCurrency ?? v.originalCurrency)}`}
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
