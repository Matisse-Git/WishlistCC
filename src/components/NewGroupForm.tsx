"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { Button } from "./ui/Button";
import { Input } from "./ui/Input";
import { useToast } from "./ToastProvider";

export function NewGroupForm() {
  const router = useRouter();
  const { showToast } = useToast();
  const [name, setName] = useState("");
  const [creating, setCreating] = useState(false);

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
      setName("");
      showToast(`Created group "${data.name}".`, "success");
      router.refresh();
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Failed to create group", "error");
    } finally {
      setCreating(false);
    }
  }

  return (
    <form onSubmit={handleCreate} className="flex gap-2">
      <Input
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="New group name, e.g. “Build a PC”"
        className="max-w-xs"
      />
      <Button type="submit" variant="secondary" loading={creating}>
        <Plus className="h-4 w-4" />
        New group
      </Button>
    </form>
  );
}
