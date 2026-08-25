"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronDown, Search, Tag } from "lucide-react";
import { cn } from "@/lib/cn";

interface LabelOption {
  id: string;
  name: string;
}

interface LabelFilterProps {
  labels: LabelOption[];
  selected: string[];
  onChange: (ids: string[]) => void;
  fullWidth?: boolean;
}

export function LabelFilter({ labels, selected, onChange, fullWidth = false }: LabelFilterProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);

  function close() {
    setOpen(false);
    setQuery("");
  }

  useEffect(() => {
    if (!open) return;
    function handlePointerDown(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) close();
    }
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") close();
    }
    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return labels;
    return labels.filter((l) => l.name.toLowerCase().includes(q));
  }, [labels, query]);

  function toggle(id: string) {
    onChange(selected.includes(id) ? selected.filter((s) => s !== id) : [...selected, id]);
  }

  return (
    <div ref={containerRef} className={cn("relative", fullWidth && "w-full")}>
      <button
        type="button"
        onClick={() => (open ? close() : setOpen(true))}
        className={cn(
          "flex h-full items-center gap-1.5 whitespace-nowrap rounded-xl border border-border bg-surface px-3.5 py-2 text-sm text-foreground transition-shadow duration-150 hover:bg-surface-muted focus:outline-none focus:ring-2 focus:ring-ring",
          fullWidth && "w-full",
          selected.length > 0 && "border-transparent bg-accent-soft text-accent-hover hover:bg-accent-soft"
        )}
      >
        <Tag className="h-3.5 w-3.5" />
        Labels
        {selected.length > 0 && (
          <span className="flex h-4.5 min-w-4.5 items-center justify-center rounded-full bg-accent px-1 text-[11px] font-semibold text-accent-foreground">
            {selected.length}
          </span>
        )}
        <ChevronDown className={cn("h-3.5 w-3.5 opacity-60", fullWidth && "ml-auto")} />
      </button>

      {open && (
        <div
          className={cn(
            "absolute z-20 mt-1.5 overflow-hidden rounded-xl border border-border bg-surface shadow-[var(--shadow-soft-lg)]",
            fullWidth ? "w-full" : "w-64"
          )}
        >
          <div className="relative border-b border-border p-2">
            <Search className="pointer-events-none absolute left-4.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search labels…"
              className="w-full rounded-lg border border-transparent bg-surface-muted py-1.5 pl-7 pr-2 text-sm placeholder:text-muted-foreground/70 focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>

          <div className="max-h-56 overflow-y-auto p-1">
            {filtered.length === 0 ? (
              <p className="px-3 py-2 text-sm text-muted-foreground">No labels found.</p>
            ) : (
              filtered.map((label) => (
                <label
                  key={label.id}
                  className="flex cursor-pointer items-center gap-2 rounded-lg px-2.5 py-1.5 text-sm hover:bg-surface-muted"
                >
                  <input
                    type="checkbox"
                    checked={selected.includes(label.id)}
                    onChange={() => toggle(label.id)}
                    className="h-4 w-4 shrink-0 rounded border-border text-accent focus:ring-2 focus:ring-ring"
                  />
                  <span className="truncate">{label.name}</span>
                </label>
              ))
            )}
          </div>

          {selected.length > 0 && (
            <div className="border-t border-border p-1.5">
              <button
                type="button"
                onClick={() => onChange([])}
                className="w-full rounded-lg px-2.5 py-1.5 text-left text-xs font-medium text-accent-hover hover:bg-accent-soft"
              >
                Clear {selected.length} selected
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
