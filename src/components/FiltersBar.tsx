"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { Search, X } from "lucide-react";

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
    <div className="bg-white border border-slate-200 rounded-xl p-3 flex flex-wrap gap-2 items-center">
      <div className="relative flex-1 min-w-[10rem]">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
        <input
          value={searchValue}
          onChange={(e) => setSearchValue(e.target.value)}
          placeholder="Search title, notes, store…"
          className="w-full pl-8 pr-3 py-1.5 text-sm rounded-md border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
      </div>

      {showStatusFilter && (
        <select
          value={searchParams.get("status") ?? "wishlist"}
          onChange={(e) => update("status", e.target.value === "wishlist" ? null : e.target.value)}
          className="text-sm rounded-md border border-slate-300 px-2 py-1.5"
        >
          <option value="wishlist">Wishlist</option>
          <option value="bought">Bought</option>
          <option value="all">All statuses</option>
        </select>
      )}

      <select
        value={searchParams.get("label") ?? ""}
        onChange={(e) => update("label", e.target.value || null)}
        className="text-sm rounded-md border border-slate-300 px-2 py-1.5"
      >
        <option value="">All labels</option>
        {labels.map((l) => (
          <option key={l.id} value={l.id}>
            {l.name}
          </option>
        ))}
      </select>

      <select
        value={searchParams.get("store") ?? ""}
        onChange={(e) => update("store", e.target.value || null)}
        className="text-sm rounded-md border border-slate-300 px-2 py-1.5"
      >
        <option value="">All stores</option>
        {stores.map((s) => (
          <option key={s} value={s}>
            {s}
          </option>
        ))}
      </select>

      <select
        value={searchParams.get("priority") ?? ""}
        onChange={(e) => update("priority", e.target.value || null)}
        className="text-sm rounded-md border border-slate-300 px-2 py-1.5"
      >
        <option value="">All priorities</option>
        <option value="high">High</option>
        <option value="medium">Medium</option>
        <option value="low">Low</option>
      </select>

      {showMissingPriceFilter && (
        <label className="flex items-center gap-1.5 text-sm text-slate-600 px-1">
          <input
            type="checkbox"
            checked={searchParams.get("missingPrice") === "true"}
            onChange={toggleMissingPrice}
          />
          Missing price
        </label>
      )}

      <select
        value={searchParams.get("sortBy") ?? "createdAt"}
        onChange={(e) => update("sortBy", e.target.value === "createdAt" ? null : e.target.value)}
        className="text-sm rounded-md border border-slate-300 px-2 py-1.5"
      >
        {SORT_OPTIONS.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>

      {hasFilters && (
        <button
          onClick={() => {
            setSearchValue("");
            router.push(pathname);
          }}
          className="text-xs text-indigo-600 hover:underline flex items-center gap-1 ml-auto"
        >
          <X className="h-3 w-3" /> Clear filters
        </button>
      )}
    </div>
  );
}
