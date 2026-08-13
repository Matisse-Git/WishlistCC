import Link from "next/link";
import { listItems, getDistinctStores, getDashboardStats, type SortOption } from "@/lib/items";
import { listLabels } from "@/lib/labels";
import { getSettings } from "@/lib/settings";
import { formatMoney } from "@/lib/money";
import { FiltersBar } from "@/components/FiltersBar";
import { ItemsGrid } from "@/components/ItemsGrid";
import { EmptyState } from "@/components/EmptyState";
import { StatCard } from "@/components/StatCard";
import { ShoppingBag, CalendarClock } from "lucide-react";

export const dynamic = "force-dynamic";

const VALID_SORTS = new Set<SortOption>([
  "createdAt",
  "createdAtAsc",
  "updatedAt",
  "priceAsc",
  "priceDesc",
  "titleAsc",
]);

export default async function BoughtPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const get = (key: string) => {
    const v = sp[key];
    return typeof v === "string" && v.length > 0 ? v : undefined;
  };
  const sortByParam = get("sortBy");
  const sortBy: SortOption =
    sortByParam && VALID_SORTS.has(sortByParam as SortOption) ? (sortByParam as SortOption) : "createdAt";

  const filters = {
    status: "bought" as const,
    search: get("search"),
    label: get("label"),
    store: get("store"),
    priority: get("priority"),
    sortBy,
  };

  const [result, stores, labels, stats, settings] = await Promise.all([
    listItems(filters),
    getDistinctStores(),
    listLabels(),
    getDashboardStats(),
    getSettings(),
  ]);

  const hasAnyFilter = Boolean(filters.search || filters.label || filters.store || filters.priority);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-slate-900">Bought</h1>
        <p className="text-sm text-slate-500 mt-1">
          {result.total} item{result.total === 1 ? "" : "s"} purchased
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <StatCard label="Total spent" value={formatMoney(stats.boughtTotal, settings.baseCurrency)} icon={ShoppingBag} />
        <StatCard
          label="Spent this month"
          value={formatMoney(stats.boughtTotalThisMonth, settings.baseCurrency)}
          icon={CalendarClock}
        />
      </div>

      <FiltersBar stores={stores} labels={labels} showMissingPriceFilter={false} />

      {result.items.length === 0 ? (
        hasAnyFilter ? (
          <EmptyState
            title="No bought items match your filters"
            description="Try adjusting or clearing your filters."
            action={
              <Link href="/bought" className="text-indigo-600 text-sm hover:underline">
                Clear filters
              </Link>
            }
          />
        ) : (
          <EmptyState
            title="Nothing bought yet"
            description="Items you mark as bought from your wishlist will show up here."
          />
        )
      ) : (
        <ItemsGrid items={result.items} allowMarkBought={false} />
      )}
    </div>
  );
}
