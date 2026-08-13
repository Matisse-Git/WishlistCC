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
      <div className="flex flex-wrap gap-1.5 rounded-md border border-slate-300 px-2 py-1.5 focus-within:ring-2 focus-within:ring-indigo-500">
        {value.map((name) => (
          <span
            key={name}
            className="inline-flex items-center gap-1 rounded-full bg-indigo-50 text-indigo-700 text-xs px-2 py-0.5"
          >
            {name}
            <button type="button" onClick={() => removeTag(name)} aria-label={`Remove ${name}`}>
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
          className="flex-1 min-w-[6rem] text-sm outline-none py-0.5"
        />
      </div>
      {focused && suggestions.length > 0 && (
        <ul className="absolute z-10 mt-1 w-full rounded-md border border-slate-200 bg-white shadow-lg max-h-48 overflow-y-auto text-sm">
          {suggestions.map((o) => (
            <li key={o.id}>
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => addTag(o.name)}
                className="w-full text-left px-3 py-1.5 hover:bg-slate-50"
              >
                {o.name}
              </button>
            </li>
          ))}
        </ul>
      )}
      {focused && input.trim() && !options.some((o) => o.name.toLowerCase() === input.trim().toLowerCase()) && (
        <div className="absolute z-10 mt-1 w-full rounded-md border border-slate-200 bg-white shadow-lg text-sm">
          <button
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => addTag(input)}
            className="w-full text-left px-3 py-1.5 hover:bg-slate-50 text-indigo-600"
          >
            Create &quot;{input.trim()}&quot;
          </button>
        </div>
      )}
    </div>
  );
}
