"use client";

import { useEffect, useMemo, useState } from "react";
import { X } from "lucide-react";

interface GroupOption {
  id: string;
  name: string;
}

interface GroupPickerProps {
  value: string;
  onChange: (name: string) => void;
}

export function GroupPicker({ value, onChange }: GroupPickerProps) {
  const [options, setOptions] = useState<GroupOption[]>([]);
  const [input, setInput] = useState("");
  const [focused, setFocused] = useState(false);

  useEffect(() => {
    fetch("/api/groups")
      .then((res) => (res.ok ? res.json() : []))
      .then((data: { id: string; name: string }[]) => setOptions(data.map((g) => ({ id: g.id, name: g.name }))))
      .catch(() => setOptions([]));
  }, []);

  const suggestions = useMemo(() => {
    const q = input.trim().toLowerCase();
    return options.filter((o) => (q ? o.name.toLowerCase().includes(q) : true)).slice(0, 8);
  }, [options, input]);

  function select(name: string) {
    const trimmed = name.trim();
    if (!trimmed) return;
    onChange(trimmed);
    setInput("");
  }

  if (value) {
    return (
      <div className="flex items-center gap-1.5 rounded-xl border border-border bg-surface px-2.5 py-2">
        <span className="inline-flex items-center gap-1 rounded-full bg-accent-soft px-2 py-0.5 text-xs font-medium text-accent-hover">
          {value}
          <button type="button" onClick={() => onChange("")} aria-label={`Remove group ${value}`} className="hover:opacity-70">
            <X className="h-3 w-3" />
          </button>
        </span>
      </div>
    );
  }

  return (
    <div className="relative">
      <input
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            select(input);
          }
        }}
        onFocus={() => setFocused(true)}
        onBlur={() => setTimeout(() => setFocused(false), 120)}
        placeholder="No group — search or create one…"
        className="w-full rounded-xl border border-border bg-surface px-3.5 py-2.5 text-sm placeholder:text-muted-foreground/70 focus:outline-none focus:ring-2 focus:ring-ring"
      />
      {focused && suggestions.length > 0 && (
        <ul className="absolute z-10 mt-1 max-h-48 w-full overflow-y-auto rounded-xl border border-border bg-surface text-sm shadow-[var(--shadow-soft-lg)]">
          {suggestions.map((o) => (
            <li key={o.id}>
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => select(o.name)}
                className="w-full px-3 py-1.5 text-left hover:bg-surface-muted"
              >
                {o.name}
              </button>
            </li>
          ))}
        </ul>
      )}
      {focused && input.trim() && !options.some((o) => o.name.toLowerCase() === input.trim().toLowerCase()) && (
        <div className="absolute z-10 mt-1 w-full rounded-xl border border-border bg-surface text-sm shadow-[var(--shadow-soft-lg)]">
          <button
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => select(input)}
            className="w-full px-3 py-1.5 text-left text-accent-hover hover:bg-surface-muted"
          >
            Create &quot;{input.trim()}&quot;
          </button>
        </div>
      )}
    </div>
  );
}
