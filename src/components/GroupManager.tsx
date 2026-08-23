"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2, Plus, Layers } from "lucide-react";
import { Button } from "./ui/Button";
import { ConfirmDialog } from "./ui/ConfirmDialog";
import { Input } from "./ui/Input";
import { SettingsSection } from "./ui/SettingsSection";
import { useToast } from "./ToastProvider";
import type { SerializedGroup } from "@/lib/groups";

export function GroupManager({ initialGroups }: { initialGroups: SerializedGroup[] }) {
  const router = useRouter();
  const { showToast } = useToast();
  const [groups, setGroups] = useState(initialGroups);
  const [name, setName] = useState("");
  const [creating, setCreating] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<SerializedGroup | null>(null);
  const [deleting, setDeleting] = useState(false);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setCreating(true);
    try {
      const res = await fetch("/api/groups", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim() }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error ?? "Failed to create group");
      setGroups((prev) =>
        [...prev, { ...data, itemCount: 0, activeTotal: "0.00", boughtTotal: "0.00" }].sort((a, b) =>
          a.name.localeCompare(b.name)
        )
      );
      setName("");
      router.refresh();
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Failed to create group", "error");
    } finally {
      setCreating(false);
    }
  }

  async function handleDelete() {
    if (!pendingDelete) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/groups/${pendingDelete.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete group");
      setGroups((prev) => prev.filter((g) => g.id !== pendingDelete.id));
      showToast(`Deleted group "${pendingDelete.name}".`, "success");
      setPendingDelete(null);
      router.refresh();
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Failed to delete group", "error");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <SettingsSection title="Groups" icon={Layers} description="Bundle items into a project, like “Build a PC”.">
      <form onSubmit={handleCreate} className="flex gap-2">
        <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="New group name" />
        <Button type="submit" variant="secondary" loading={creating}>
          <Plus className="h-4 w-4" />
          Add
        </Button>
      </form>

      {groups.length === 0 ? (
        <p className="text-sm text-muted-foreground">No groups yet.</p>
      ) : (
        <ul className="divide-y divide-border">
          {groups.map((group) => (
            <li key={group.id} className="flex items-center justify-between py-2.5">
              <div className="flex items-center gap-2 text-sm">
                <span className="font-medium text-foreground">{group.name}</span>
                <span className="text-muted-foreground">
                  {group.itemCount} item{group.itemCount === 1 ? "" : "s"}
                </span>
              </div>
              <button
                onClick={() => setPendingDelete(group)}
                className="rounded-lg p-1.5 text-muted-foreground hover:bg-destructive-soft hover:text-destructive"
                aria-label={`Delete ${group.name}`}
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </li>
          ))}
        </ul>
      )}

      <ConfirmDialog
        open={pendingDelete !== null}
        title="Delete group?"
        message={`"${pendingDelete?.name}" will be removed from all items. This does not delete the items themselves.`}
        confirmLabel="Delete"
        loading={deleting}
        onConfirm={handleDelete}
        onCancel={() => setPendingDelete(null)}
      />
    </SettingsSection>
  );
}
