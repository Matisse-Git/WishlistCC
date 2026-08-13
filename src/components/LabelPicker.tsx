"use client";

import { useEffect, useMemo, useState } from "react";
import { X } from "lucide-react";

interface LabelOption {
  id: string;
  name: string;
}

interface LabelPickerProps {
  value: string[];
  onChange: (names: string[]) => void;
}

export function LabelPicker({ value, onChange }: LabelPickerProps) {
  const [options, setOptions] = useState<LabelOption[]>([]);
  const [input, setInput] = useState("");
  const [focused, setFocused] = useState(false);

  useEffect(() => {
    fetch("/api/labels")
      .then((res) => (res.ok ? res.json() : []))
      .then((data: LabelOption[]) => setOptions(data))
      .catch(() => setOptions([]));
  }, []);

  const suggestions = useMemo(() => {
    const q = input.trim().toLowerCase();
    return options
      .filter((o) => !value.includes(o.name))
      .filter((o) => (q ? o.name.toLowerCase().includes(q) : true))
      .slice(0, 8);
  }, [options, input, value]);

  function addTag(name: string) {
    const trimmed = name.trim();
    if (!trimmed || value.includes(trimmed)) return;
    onChange([...value, trimmed]);
    setInput("");
  }

  function removeTag(name: string) {
    onChange(value.filter((v) => v !== name));
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      addTag(input);
    } else if (e.key === "Backspace" && input === "" && value.length > 0) {
      removeTag(value[value.length - 1]);
    }
  }

  return (
    <div className="relative">
      <div className="flex flex-wrap gap-1.5 rounded-xl border border-border bg-surface px-2.5 py-2 focus-within:ring-2 focus-within:ring-ring">
        {value.map((name) => (
          <span
            key={name}
            className="inline-flex items-center gap-1 rounded-full bg-accent-soft px-2 py-0.5 text-xs font-medium text-accent-hover"
          >
            {name}
            <button type="button" onClick={() => removeTag(name)} aria-label={`Remove ${name}`} className="hover:opacity-70">
              <X className="h-3 w-3" />
            </button>
          </span>
        ))}
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => setFocused(true)}
          onBlur={() => setTimeout(() => setFocused(false), 120)}
          placeholder={value.length === 0 ? "Add labels…" : ""}
          className="min-w-[6rem] flex-1 bg-transparent py-0.5 text-sm outline-none placeholder:text-muted-foreground/70"
        />
      </div>
      {focused && suggestions.length > 0 && (
        <ul className="absolute z-10 mt-1 max-h-48 w-full overflow-y-auto rounded-xl border border-border bg-surface text-sm shadow-[var(--shadow-soft-lg)]">
          {suggestions.map((o) => (
            <li key={o.id}>
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => addTag(o.name)}
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
            onClick={() => addTag(input)}
            className="w-full px-3 py-1.5 text-left text-accent-hover hover:bg-surface-muted"
          >
            Create &quot;{input.trim()}&quot;
          </button>
        </div>
      )}
    </div>
  );
}
