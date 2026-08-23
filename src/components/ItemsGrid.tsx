"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ItemCard } from "./ItemCard";
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
  };
}

export function ItemsGrid({ items, allowMarkBought = true }: { items: SerializedItem[]; allowMarkBought?: boolean }) {
  const router = useRouter();
  const { showToast } = useToast();
  const [editItem, setEditItem] = useState<SerializedItem | null>(null);
  const [boughtItem, setBoughtItem] = useState<SerializedItem | null>(null);
  const [deleteItem, setDeleteItem] = useState<SerializedItem | null>(null);
  const [deleting, setDeleting] = useState(false);

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
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {items.map((item) => (
          <ItemCard
            key={item.id}
            item={item}
            onEdit={setEditItem}
            onMarkBought={allowMarkBought ? setBoughtItem : undefined}
            onDelete={setDeleteItem}
          />
        ))}
      </div>

      <ItemFormModal
        open={editItem !== null}
        onClose={() => setEditItem(null)}
        mode="edit"
        initial={editItem ? toInitial(editItem) : undefined}
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
