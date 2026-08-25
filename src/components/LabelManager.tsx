"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2, Plus, Tag } from "lucide-react";
import { Button } from "./ui/Button";
import { ConfirmDialog } from "./ui/ConfirmDialog";
import { Input } from "./ui/Input";
import { SettingsSection } from "./ui/SettingsSection";
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
    <SettingsSection id="labels" title="Labels" icon={Tag} description="Organize your wishlist with custom tags.">
      <form onSubmit={handleCreate} className="flex gap-2">
        <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="New label name" />
        <Button type="submit" variant="secondary" loading={creating}>
          <Plus className="h-4 w-4" />
          Add
        </Button>
      </form>

      {labels.length === 0 ? (
        <p className="text-sm text-muted-foreground">No labels yet.</p>
      ) : (
        <ul className="divide-y divide-border">
          {labels.map((label) => (
            <li key={label.id} className="flex items-center justify-between py-2.5">
              <div className="flex items-center gap-2 text-sm">
                <span className="font-medium text-foreground">{label.name}</span>
                <span className="text-muted-foreground">
                  {label.itemCount} item{label.itemCount === 1 ? "" : "s"}
                </span>
              </div>
              <button
                onClick={() => setPendingDelete(label)}
                className="rounded-lg p-1.5 text-muted-foreground hover:bg-destructive-soft hover:text-destructive"
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
    </SettingsSection>
  );
}
