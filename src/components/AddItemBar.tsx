"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Wand2, Link2 } from "lucide-react";
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
      setWarnings(["Couldn't fetch details from that link. You can still fill the item in manually."]);
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
      <div className="relative overflow-hidden rounded-2xl border border-border bg-gradient-to-br from-accent-soft via-surface to-surface p-5 shadow-[var(--shadow-soft)] sm:p-6">
        <div className="pointer-events-none absolute -right-10 -top-16 h-48 w-48 rounded-full bg-accent/10 blur-3xl" />
        <div className="relative flex items-start gap-3">
          <span className="mt-0.5 hidden h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-accent-hover shadow-sm sm:flex">
            <Link2 className="h-5 w-5" />
          </span>
          <div className="min-w-0 flex-1">
            <h2 className="text-base font-semibold text-foreground">Add something you want</h2>
            <p className="mt-0.5 text-sm text-muted-foreground">
              We&rsquo;ll try to automatically fill in the image, title, and price.
            </p>
            <form onSubmit={handleFetch} className="mt-4 flex flex-col gap-2 sm:flex-row">
              <input
                type="text"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="Paste a product link…"
                className="flex-1 rounded-xl border border-border bg-surface px-4 py-2.5 text-sm shadow-sm placeholder:text-muted-foreground/70 focus:outline-none focus:ring-2 focus:ring-ring"
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
          </div>
        </div>
      </div>

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
