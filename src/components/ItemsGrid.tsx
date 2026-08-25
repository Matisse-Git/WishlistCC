"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ItemCard } from "./ItemCard";
import { VariantCard } from "./VariantCard";
import { ItemFormModal, type ItemFormInitial } from "./ItemFormModal";
import { MarkBoughtModal } from "./MarkBoughtModal";
import { ConfirmDialog } from "./ui/ConfirmDialog";
import { useToast } from "./ToastProvider";
import type { SerializedItem } from "@/lib/items";

function toInitial(item: SerializedItem): ItemFormInitial {
  return {
    id: item.id,
    url: item.url,
    title: item.title,
    description: item.description,
    imageUrl: item.imageUrl,
    originalPrice: item.originalPrice,
    originalCurrency: item.originalCurrency,
    convertedPrice: item.convertedPrice,
    baseCurrency: item.baseCurrency,
    conversionStatus: item.conversionStatus,
    store: item.store,
    priority: item.priority,
    notes: item.notes,
    status: item.status,
    labels: item.labels.map((l) => l.name),
    group: item.group?.name ?? null,
    variants: item.variants,
  };
}

function toVariantAddInitial(target: SerializedItem): ItemFormInitial {
  return {
    group: target.group?.name ?? null,
    variantOfId: target.id,
    variantOfTitle: target.title,
  };
}

export function ItemsGrid({ items, allowMarkBought = true }: { items: SerializedItem[]; allowMarkBought?: boolean }) {
  const router = useRouter();
  const { showToast } = useToast();
  const [editItem, setEditItem] = useState<SerializedItem | null>(null);
  const [variantTarget, setVariantTarget] = useState<SerializedItem | null>(null);
  const [boughtItem, setBoughtItem] = useState<SerializedItem | null>(null);
  const [deleteItem, setDeleteItem] = useState<SerializedItem | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Items sharing a variant set render once, as a single VariantCard —
  // anchored at whichever member appears first in this list, but the card
  // itself always resolves and displays the currently-selected sibling.
  const renderItems = useMemo(() => {
    const seen = new Set<string>();
    const result: SerializedItem[] = [];
    for (const item of items) {
      if (item.variantGroupId) {
        if (seen.has(item.variantGroupId)) continue;
        seen.add(item.variantGroupId);
      }
      result.push(item);
    }
    return result;
  }, [items]);

  async function handleDelete() {
    if (!deleteItem) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/items/${deleteItem.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete item");
      showToast(`Deleted "${deleteItem.title}".`, "success");
      setDeleteItem(null);
      router.refresh();
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Failed to delete item", "error");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <>
      {/* Column count tracks the actual width of this grid (which varies with
          the sidebar + rail, not just the viewport) rather than fixed
          viewport breakpoints, so cards stay a comfortable size next to the
          rail instead of being squeezed into too many narrow columns. */}
      <div className="grid grid-cols-[repeat(auto-fill,minmax(200px,1fr))] gap-5">
        {renderItems.map((item) =>
          item.variants.length > 1 ? (
            <VariantCard
              key={item.id}
              item={item}
              onEdit={setEditItem}
              onMarkBought={allowMarkBought ? setBoughtItem : undefined}
              onDelete={setDeleteItem}
              onAddVariant={setVariantTarget}
            />
          ) : (
            <ItemCard
              key={item.id}
              item={item}
              onEdit={setEditItem}
              onMarkBought={allowMarkBought ? setBoughtItem : undefined}
              onDelete={setDeleteItem}
              onAddVariant={setVariantTarget}
            />
          )
        )}
      </div>

      <ItemFormModal
        open={editItem !== null}
        onClose={() => setEditItem(null)}
        mode="edit"
        initial={editItem ? toInitial(editItem) : undefined}
        onSaved={() => router.refresh()}
      />

      <ItemFormModal
        open={variantTarget !== null}
        onClose={() => setVariantTarget(null)}
        mode="add"
        initial={variantTarget ? toVariantAddInitial(variantTarget) : undefined}
        onSaved={() => router.refresh()}
      />

      <MarkBoughtModal
        open={boughtItem !== null}
        onClose={() => setBoughtItem(null)}
        item={boughtItem}
        onSaved={() => router.refresh()}
      />

      <ConfirmDialog
        open={deleteItem !== null}
        title="Delete item?"
        message={`"${deleteItem?.title}" will be permanently deleted.`}
        confirmLabel="Delete"
        loading={deleting}
        onConfirm={handleDelete}
        onCancel={() => setDeleteItem(null)}
      />
    </>
  );
}
