"use client";

import { useState } from "react";
import { AlertTriangle, Wand2, ImageOff } from "lucide-react";
import { Modal } from "./ui/Modal";
import { Button } from "./ui/Button";
import { CurrencySelect } from "./ui/CurrencySelect";
import { Input, Textarea, Select, Label } from "./ui/Input";
import { LabelPicker } from "./LabelPicker";
import { useToast } from "./ToastProvider";
import type { SerializedItem } from "@/lib/items";

export interface ItemFormInitial {
  id?: string;
  url?: string | null;
  title?: string;
  description?: string | null;
  imageUrl?: string | null;
  originalPrice?: string | null;
  originalCurrency?: string | null;
  convertedPrice?: string | null;
  baseCurrency?: string | null;
  conversionStatus?: string;
  store?: string | null;
  priority?: string | null;
  notes?: string | null;
  status?: string;
  labels?: string[];
}

interface ItemFormModalProps {
  open: boolean;
  onClose: () => void;
  mode: "add" | "edit";
  initial?: ItemFormInitial;
  warnings?: string[];
  onSaved: (item: SerializedItem) => void;
}

const emptyState = () => ({
  url: "",
  title: "",
  description: "",
  imageUrl: "",
  originalPrice: "",
  originalCurrency: "USD",
  convertedPriceOverride: "",
  store: "",
  priority: "",
  notes: "",
  labels: [] as string[],
});

export function ItemFormModal({ open, onClose, mode, initial, warnings, onSaved }: ItemFormModalProps) {
  const { showToast } = useToast();
  const [form, setForm] = useState(emptyState());
  const [saving, setSaving] = useState(false);
  const [fetchingPreview, setFetchingPreview] = useState(false);
  const [localWarnings, setLocalWarnings] = useState<string[]>(warnings ?? []);
  const [imageErrored, setImageErrored] = useState(false);

  // Reset the form whenever the modal transitions to open, adjusted during
  // render (React's recommended pattern) rather than in an effect, so the
  // reset is visible on the very first paint instead of causing an extra
  // render pass.
  const [wasOpen, setWasOpen] = useState(open);
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) {
      setForm({
        url: initial?.url ?? "",
        title: initial?.title ?? "",
        description: initial?.description ?? "",
        imageUrl: initial?.imageUrl ?? "",
        originalPrice: initial?.originalPrice ?? "",
        originalCurrency: initial?.originalCurrency ?? "USD",
        convertedPriceOverride: initial?.conversionStatus === "manual" ? initial?.convertedPrice ?? "" : "",
        store: initial?.store ?? "",
        priority: initial?.priority ?? "",
        notes: initial?.notes ?? "",
        labels: initial?.labels ?? [],
      });
      setLocalWarnings(warnings ?? []);
      setImageErrored(false);
    }
  }

  function set<K extends keyof ReturnType<typeof emptyState>>(key: K, value: ReturnType<typeof emptyState>[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
    if (key === "imageUrl") setImageErrored(false);
  }

  async function handleFetchDetails() {
    if (!form.url.trim()) {
      showToast("Enter a URL first.", "error");
      return;
    }
    setFetchingPreview(true);
    try {
      const res = await fetch("/api/items/preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: form.url.trim() }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error ?? "Failed to fetch details");

      setForm((prev) => ({
        ...prev,
        url: data.url || prev.url,
        title: prev.title || data.title || "",
        description: prev.description || data.description || "",
        imageUrl: prev.imageUrl || data.imageUrl || "",
        originalPrice: prev.originalPrice || data.price || "",
        originalCurrency: data.currency || prev.originalCurrency,
        store: prev.store || data.store || "",
      }));
      setLocalWarnings(data.warnings ?? []);
      setImageErrored(false);
      if (!data.warnings?.length) showToast("Details fetched.", "success");
    } catch (err) {
      setLocalWarnings(["Couldn't fetch details from that link. You can still fill the item in manually."]);
      showToast(err instanceof Error ? err.message : "Failed to fetch details", "error");
    } finally {
      setFetchingPreview(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.title.trim()) {
      showToast("Title is required.", "error");
      return;
    }
    setSaving(true);
    try {
      const payload: Record<string, unknown> = {
        url: form.url.trim() || null,
        title: form.title.trim(),
        description: form.description.trim() || null,
        imageUrl: form.imageUrl.trim() || null,
        originalPrice: form.originalPrice === "" ? null : Number(form.originalPrice),
        originalCurrency: form.originalPrice === "" ? null : form.originalCurrency,
        store: form.store.trim() || null,
        priority: form.priority || null,
        notes: form.notes.trim() || null,
        labels: form.labels,
      };
      if (form.convertedPriceOverride !== "") {
        payload.convertedPrice = Number(form.convertedPriceOverride);
      } else if (mode === "edit" && initial?.conversionStatus === "manual") {
        payload.convertedPrice = null;
      }

      const url = mode === "add" ? "/api/items" : `/api/items/${initial?.id}`;
      const method = mode === "add" ? "POST" : "PATCH";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error ?? "Failed to save item");

      showToast(mode === "add" ? "Item added." : "Item updated.", "success");
      onSaved(data);
      onClose();
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Failed to save item", "error");
    } finally {
      setSaving(false);
    }
  }

  const isFormValid = form.title.trim().length > 0;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={mode === "add" ? "Add wishlist item" : "Edit item"}
      description={mode === "add" ? "Paste a link and fetch details, or fill it in yourself." : undefined}
      maxWidthClassName="max-w-xl"
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button variant="primary" onClick={handleSubmit} loading={saving} disabled={!isFormValid}>
            Save
          </Button>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        {localWarnings.length > 0 && (
          <div className="space-y-1 rounded-xl border border-amber-200 bg-warning-soft px-3.5 py-2.5 text-xs text-amber-800">
            {localWarnings.map((w, i) => (
              <div key={i} className="flex items-start gap-1.5">
                <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                <span>{w}</span>
              </div>
            ))}
          </div>
        )}

        <div>
          <Label htmlFor="item-url">Product URL</Label>
          <div className="flex gap-2">
            <Input
              id="item-url"
              type="text"
              value={form.url}
              onChange={(e) => set("url", e.target.value)}
              placeholder="https://example.com/product"
              className="flex-1"
            />
            <Button type="button" variant="secondary" onClick={handleFetchDetails} loading={fetchingPreview}>
              <Wand2 className="h-4 w-4" />
              Fetch
            </Button>
          </div>
          <p className="mt-1.5 text-xs text-muted-foreground">
            We&rsquo;ll try to automatically fill the image, title, and price.
          </p>
        </div>

        <div className="grid grid-cols-[1fr_auto] gap-4">
          <div className="space-y-4">
            <div>
              <Label htmlFor="item-title">Title *</Label>
              <Input id="item-title" type="text" required value={form.title} onChange={(e) => set("title", e.target.value)} />
            </div>
            <div>
              <Label htmlFor="item-image">Image URL</Label>
              <Input id="item-image" type="text" value={form.imageUrl} onChange={(e) => set("imageUrl", e.target.value)} />
            </div>
          </div>
          <div className="pt-6">
            <div className="flex h-20 w-20 items-center justify-center overflow-hidden rounded-xl border border-border bg-surface-muted">
              {form.imageUrl && !imageErrored ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={form.imageUrl}
                  alt=""
                  referrerPolicy="no-referrer"
                  className="h-full w-full object-cover"
                  onError={() => setImageErrored(true)}
                />
              ) : (
                <ImageOff className="h-5 w-5 text-muted-foreground/40" strokeWidth={1.5} />
              )}
            </div>
          </div>
        </div>

        <div>
          <Label htmlFor="item-description">Description</Label>
          <Textarea id="item-description" value={form.description} onChange={(e) => set("description", e.target.value)} rows={2} />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label htmlFor="item-price">Price</Label>
            <Input
              id="item-price"
              type="number"
              min="0"
              step="0.01"
              value={form.originalPrice}
              onChange={(e) => set("originalPrice", e.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="item-currency">Currency</Label>
            <CurrencySelect id="item-currency" value={form.originalCurrency} onChange={(v) => set("originalCurrency", v)} className="w-full" />
          </div>
        </div>

        <div>
          <Label htmlFor="item-converted">
            Converted price override <span className="font-normal text-muted-foreground">(optional)</span>
          </Label>
          <Input
            id="item-converted"
            type="number"
            min="0"
            step="0.01"
            value={form.convertedPriceOverride}
            onChange={(e) => set("convertedPriceOverride", e.target.value)}
            placeholder="Leave blank to auto-convert"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label htmlFor="item-store">Store</Label>
            <Input id="item-store" type="text" value={form.store} onChange={(e) => set("store", e.target.value)} />
          </div>
          <div>
            <Label htmlFor="item-priority">Priority</Label>
            <Select id="item-priority" value={form.priority} onChange={(e) => set("priority", e.target.value)}>
              <option value="">None</option>
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
            </Select>
          </div>
        </div>

        <div>
          <Label>Labels</Label>
          <LabelPicker value={form.labels} onChange={(labels) => set("labels", labels)} />
        </div>

        <div>
          <Label htmlFor="item-notes">Notes</Label>
          <Textarea id="item-notes" value={form.notes} onChange={(e) => set("notes", e.target.value)} rows={2} />
        </div>
      </form>
    </Modal>
  );
}
