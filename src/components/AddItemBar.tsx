"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Wand2 } from "lucide-react";
import { Button } from "./ui/Button";
import { ItemFormModal, type ItemFormInitial } from "./ItemFormModal";
import { useToast } from "./ToastProvider";

export function AddItemBar() {
  const router = useRouter();
  const { showToast } = useToast();
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [initial, setInitial] = useState<ItemFormInitial>({});
  const [warnings, setWarnings] = useState<string[]>([]);

  async function handleFetch(e: React.FormEvent) {
    e.preventDefault();
    if (!url.trim()) {
      setInitial({});
      setWarnings([]);
      setModalOpen(true);
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/items/preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: url.trim() }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error ?? "Failed to fetch details");
      setInitial({
        url: data.url,
        title: data.title ?? "",
        description: data.description ?? "",
        imageUrl: data.imageUrl ?? "",
        originalPrice: data.price ?? "",
        originalCurrency: data.currency ?? "USD",
        store: data.store ?? "",
      });
      setWarnings(data.warnings ?? []);
      setModalOpen(true);
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Could not fetch details — add manually instead.", "error");
      setInitial({ url });
      setWarnings(["Could not automatically fetch details. You can fill them in manually."]);
      setModalOpen(true);
    } finally {
      setLoading(false);
    }
  }

  function handleAddManually() {
    setInitial({});
    setWarnings([]);
    setModalOpen(true);
  }

  return (
    <>
      <form
        onSubmit={handleFetch}
        className="bg-white border border-slate-200 rounded-xl p-4 flex flex-col sm:flex-row gap-2"
      >
        <input
          type="text"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="Paste a product URL…"
          className="flex-1 rounded-md border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
        <div className="flex gap-2">
          <Button type="submit" variant="primary" loading={loading} className="flex-1 sm:flex-none">
            <Wand2 className="h-4 w-4" />
            Fetch details
          </Button>
          <Button type="button" variant="secondary" onClick={handleAddManually} className="flex-1 sm:flex-none">
            <Plus className="h-4 w-4" />
            Add manually
          </Button>
        </div>
      </form>

      <ItemFormModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        mode="add"
        initial={initial}
        warnings={warnings}
        onSaved={() => {
          setUrl("");
          router.refresh();
        }}
      />
    </>
  );
}
