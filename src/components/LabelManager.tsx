"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2, Plus, Tag } from "lucide-react";
import { Button } from "./ui/Button";
import { ConfirmDialog } from "./ui/ConfirmDialog";
import { useToast } from "./ToastProvider";
import type { SerializedLabelFull } from "@/lib/labels";

export function LabelManager({ initialLabels }: { initialLabels: SerializedLabelFull[] }) {
  const router = useRouter();
  const { showToast } = useToast();
  const [labels, setLabels] = useState(initialLabels);
  const [name, setName] = useState("");
  const [creating, setCreating] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<SerializedLabelFull | null>(null);
  const [deleting, setDeleting] = useState(false);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setCreating(true);
    try {
      const res = await fetch("/api/labels", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim() }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error ?? "Failed to create label");
      setLabels((prev) => [...prev, { ...data, itemCount: 0 }].sort((a, b) => a.name.localeCompare(b.name)));
      setName("");
      router.refresh();
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Failed to create label", "error");
    } finally {
      setCreating(false);
    }
  }

  async function handleDelete() {
    if (!pendingDelete) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/labels/${pendingDelete.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete label");
      setLabels((prev) => prev.filter((l) => l.id !== pendingDelete.id));
      showToast(`Deleted label "${pendingDelete.name}".`, "success");
      setPendingDelete(null);
      router.refresh();
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Failed to delete label", "error");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-4">
      <h2 className="font-medium text-slate-900 flex items-center gap-1.5">
        <Tag className="h-4 w-4" />
        Labels
      </h2>

      <form onSubmit={handleCreate} className="flex gap-2">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="New label name"
          className="flex-1 rounded-md border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
        <Button type="submit" variant="secondary" loading={creating}>
          <Plus className="h-4 w-4" />
          Add
        </Button>
      </form>

      {labels.length === 0 ? (
        <p className="text-sm text-slate-500">No labels yet.</p>
      ) : (
        <ul className="divide-y divide-slate-100">
          {labels.map((label) => (
            <li key={label.id} className="flex items-center justify-between py-2">
              <div className="flex items-center gap-2 text-sm">
                <span className="font-medium text-slate-800">{label.name}</span>
                <span className="text-slate-400">
                  {label.itemCount} item{label.itemCount === 1 ? "" : "s"}
                </span>
              </div>
              <button
                onClick={() => setPendingDelete(label)}
                className="text-slate-400 hover:text-red-600"
                aria-label={`Delete ${label.name}`}
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </li>
          ))}
        </ul>
      )}

      <ConfirmDialog
        open={pendingDelete !== null}
        title="Delete label?"
        message={`"${pendingDelete?.name}" will be removed from all items. This does not delete the items themselves.`}
        confirmLabel="Delete"
        loading={deleting}
        onConfirm={handleDelete}
        onCancel={() => setPendingDelete(null)}
      />
    </div>
  );
}
