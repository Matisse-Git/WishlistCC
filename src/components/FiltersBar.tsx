"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { Search, X } from "lucide-react";
import { Card } from "./ui/Card";
import { Select } from "./ui/Input";

interface FiltersBarProps {
  stores: string[];
  labels: { id: string; name: string }[];
  showStatusFilter?: boolean;
  showMissingPriceFilter?: boolean;
}

const SORT_OPTIONS = [
  { value: "createdAt", label: "Newest first" },
  { value: "createdAtAsc", label: "Oldest first" },
  { value: "updatedAt", label: "Recently updated" },
  { value: "priceAsc", label: "Price: low to high" },
  { value: "priceDesc", label: "Price: high to low" },
  { value: "titleAsc", label: "Title A-Z" },
];

export function FiltersBar({ stores, labels, showStatusFilter = false, showMissingPriceFilter = true }: FiltersBarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [searchValue, setSearchValue] = useState(searchParams.get("search") ?? "");

  function update(key: string, value: string | null) {
    const params = new URLSearchParams(searchParams.toString());
    if (value) params.set(key, value);
    else params.delete(key);
    router.push(`${pathname}?${params.toString()}`);
  }

  useEffect(() => {
    const current = searchParams.get("search") ?? "";
    if (searchValue === current) return;
    const handle = setTimeout(() => update("search", searchValue || null), 400);
    return () => clearTimeout(handle);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchValue]);

  function toggleMissingPrice() {
    update("missingPrice", searchParams.get("missingPrice") === "true" ? null : "true");
  }

  const hasFilters = ["search", "label", "store", "priority", "missingPrice", "status"].some((k) =>
    searchParams.get(k)
  );

  return (
    <Card padding="sm" className="flex flex-wrap items-center gap-2.5">
      <div className="relative min-w-[11rem] flex-1">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input
          value={searchValue}
          onChange={(e) => setSearchValue(e.target.value)}
          placeholder="Search title, notes, store…"
          className="w-full rounded-xl border border-border bg-surface py-2 pl-9 pr-3 text-sm placeholder:text-muted-foreground/70 focus:outline-none focus:ring-2 focus:ring-ring"
        />
      </div>

      {showStatusFilter && (
        <Select
          value={searchParams.get("status") ?? "wishlist"}
          onChange={(e) => update("status", e.target.value === "wishlist" ? null : e.target.value)}
          className="w-auto py-2"
        >
          <option value="wishlist">Wishlist</option>
          <option value="bought">Bought</option>
          <option value="all">All statuses</option>
        </Select>
      )}

      <Select value={searchParams.get("label") ?? ""} onChange={(e) => update("label", e.target.value || null)} className="w-auto py-2">
        <option value="">All labels</option>
        {labels.map((l) => (
          <option key={l.id} value={l.id}>
            {l.name}
          </option>
        ))}
      </Select>

      <Select value={searchParams.get("store") ?? ""} onChange={(e) => update("store", e.target.value || null)} className="w-auto py-2">
        <option value="">All stores</option>
        {stores.map((s) => (
          <option key={s} value={s}>
            {s}
          </option>
        ))}
      </Select>

      <Select
        value={searchParams.get("priority") ?? ""}
        onChange={(e) => update("priority", e.target.value || null)}
        className="w-auto py-2"
      >
        <option value="">All priorities</option>
        <option value="high">High</option>
        <option value="medium">Medium</option>
        <option value="low">Low</option>
      </Select>

      {showMissingPriceFilter && (
        <label className="flex items-center gap-1.5 whitespace-nowrap px-1 text-sm text-muted-foreground">
          <input
            type="checkbox"
            checked={searchParams.get("missingPrice") === "true"}
            onChange={toggleMissingPrice}
            className="h-4 w-4 rounded border-border text-accent focus:ring-2 focus:ring-ring"
          />
          Missing price
        </label>
      )}

      <Select
        value={searchParams.get("sortBy") ?? "createdAt"}
        onChange={(e) => update("sortBy", e.target.value === "createdAt" ? null : e.target.value)}
        className="w-auto py-2"
      >
        {SORT_OPTIONS.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </Select>

      {hasFilters && (
        <button
          onClick={() => {
            setSearchValue("");
            router.push(pathname);
          }}
          className="ml-auto flex items-center gap-1 whitespace-nowrap rounded-lg px-2.5 py-1.5 text-xs font-medium text-accent-hover hover:bg-accent-soft"
        >
          <X className="h-3 w-3" /> Clear filters
        </button>
      )}
    </Card>
  );
}
