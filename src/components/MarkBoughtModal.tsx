"use client";

import { useState } from "react";
import { Modal } from "./ui/Modal";
import { Button } from "./ui/Button";
import { CurrencySelect } from "./ui/CurrencySelect";
import { useToast } from "./ToastProvider";
import type { SerializedItem } from "@/lib/items";

interface MarkBoughtModalProps {
  open: boolean;
  onClose: () => void;
  item: SerializedItem | null;
  onSaved: (item: SerializedItem) => void;
}

function todayLocalDate(): string {
  const d = new Date();
  const offset = d.getTimezoneOffset();
  return new Date(d.getTime() - offset * 60000).toISOString().slice(0, 10);
}

export function MarkBoughtModal({ open, onClose, item, onSaved }: MarkBoughtModalProps) {
  const { showToast } = useToast();
  const [boughtAt, setBoughtAt] = useState(todayLocalDate());
  const [boughtPrice, setBoughtPrice] = useState("");
  const [boughtCurrency, setBoughtCurrency] = useState("USD");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  // See ItemFormModal for why this resets during render instead of in an effect.
  const [wasOpen, setWasOpen] = useState(open);
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open && item) {
      setBoughtAt(todayLocalDate());
      setBoughtPrice(item.convertedPrice ?? item.originalPrice ?? "");
      setBoughtCurrency(item.baseCurrency ?? item.originalCurrency ?? "USD");
      setNotes(item.notes ?? "");
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!item) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/items/${item.id}/mark-bought`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          boughtAt: new Date(boughtAt).toISOString(),
          boughtPrice: boughtPrice === "" ? null : Number(boughtPrice),
          boughtCurrency: boughtPrice === "" ? null : boughtCurrency,
          notes: notes.trim() || null,
        }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error ?? "Failed to mark item as bought");
      showToast(`"${item.title}" marked as bought.`, "success");
      onSaved(data);
      onClose();
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Failed to mark item as bought", "error");
    } finally {
      setSaving(false);
    }
  }

  if (!item) return null;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={`Mark "${item.title}" as bought`}
      maxWidthClassName="max-w-md"
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button variant="primary" onClick={handleSubmit} loading={saving}>
            Mark as bought
          </Button>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Bought on</label>
          <input
            type="date"
            value={boughtAt}
            onChange={(e) => setBoughtAt(e.target.value)}
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Price paid</label>
            <input
              type="number"
              min="0"
              step="0.01"
              value={boughtPrice}
              onChange={(e) => setBoughtPrice(e.target.value)}
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Currency</label>
            <CurrencySelect value={boughtCurrency} onChange={setBoughtCurrency} className="w-full" />
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Notes</label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
      </form>
    </Modal>
  );
}
