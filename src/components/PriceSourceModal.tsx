"use client";

import { useState } from "react";
import { Tags, Wand2 } from "lucide-react";
import { Modal } from "./ui/Modal";
import { Button } from "./ui/Button";
import { CurrencySelect } from "./ui/CurrencySelect";
import { Input, Label } from "./ui/Input";
import { useToast } from "./ToastProvider";
import type { SerializedItem } from "@/lib/items";

interface PriceSourceModalProps {
  open: boolean;
  onClose: () => void;
  item: SerializedItem | null;
  onSaved: (item: SerializedItem) => void;
}

export function PriceSourceModal({ open, onClose, item, onSaved }: PriceSourceModalProps) {
  const { showToast } = useToast();
  const [url, setUrl] = useState("");
  const [store, setStore] = useState("");
  const [price, setPrice] = useState("");
  const [currency, setCurrency] = useState("USD");
  const [saving, setSaving] = useState(false);
  const [fetching, setFetching] = useState(false);

  // See ItemFormModal for why this resets during render instead of in an effect.
  const [wasOpen, setWasOpen] = useState(open);
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) {
      setUrl("");
      setStore("");
      setPrice("");
      setCurrency(item?.originalCurrency ?? "USD");
    }
  }

  async function handleFetch() {
    if (!url.trim()) {
      showToast("Enter a URL first.", "error");
      return;
    }
    setFetching(true);
    try {
      const res = await fetch("/api/items/preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: url.trim() }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error ?? "Failed to fetch details");
      setUrl(data.url || url);
      setStore((prev) => prev || data.store || "");
      setPrice((prev) => prev || data.price || "");
      if (data.currency) setCurrency(data.currency);
      showToast(data.price || data.store ? "Details fetched." : "Couldn't find a price — fill it in manually.", data.price || data.store ? "success" : "info");
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Failed to fetch details", "error");
    } finally {
      setFetching(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!item) return;
    if (!url.trim() && !store.trim()) {
      showToast("Enter a URL or a store name.", "error");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch(`/api/items/${item.id}/price-sources`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url: url.trim() || null,
          store: store.trim() || null,
          originalPrice: price === "" ? null : Number(price),
          originalCurrency: price === "" ? null : currency,
        }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error ?? "Failed to add price source");
      showToast("Price source added.", "success");
      onSaved(data);
      onClose();
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Failed to add price source", "error");
    } finally {
      setSaving(false);
    }
  }

  if (!item) return null;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={`Add a price source for "${item.title}"`}
      description="Track another store this exact item is listed at, so you can compare and switch between prices."
      maxWidthClassName="max-w-md"
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button variant="primary" onClick={handleSubmit} loading={saving}>
            <Tags className="h-4 w-4" />
            Add price source
          </Button>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <Label htmlFor="price-source-url">Product URL</Label>
          <div className="flex gap-2">
            <Input
              id="price-source-url"
              type="text"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://example.com/product"
              className="flex-1"
            />
            <Button type="button" variant="secondary" onClick={handleFetch} loading={fetching}>
              <Wand2 className="h-4 w-4" />
              Fetch
            </Button>
          </div>
        </div>
        <div>
          <Label htmlFor="price-source-store">Store</Label>
          <Input id="price-source-store" type="text" value={store} onChange={(e) => setStore(e.target.value)} placeholder="e.g. Amazon" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label htmlFor="price-source-price">Price</Label>
            <Input
              id="price-source-price"
              type="number"
              min="0"
              step="0.01"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="price-source-currency">Currency</Label>
            <CurrencySelect id="price-source-currency" value={currency} onChange={setCurrency} className="w-full" />
          </div>
        </div>
      </form>
    </Modal>
  );
}
