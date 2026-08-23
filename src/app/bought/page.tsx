import Link from "next/link";
import { listItems, getDistinctStores, getDashboardStats, type SortOption } from "@/lib/items";
import { listLabels } from "@/lib/labels";
import { listGroups } from "@/lib/groups";
import { getSettings } from "@/lib/settings";
import { formatMoney } from "@/lib/money";
import { FiltersBar } from "@/components/FiltersBar";
import { ItemsGrid } from "@/components/ItemsGrid";
import { EmptyState } from "@/components/EmptyState";
import { StatCard } from "@/components/StatCard";
import { PageHeader } from "@/components/ui/PageHeader";
import { ShoppingBag, CalendarClock, SearchX } from "lucide-react";

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

  const labelsParam = get("labels");
  const filters = {
    status: "bought" as const,
    search: get("search"),
    labels: labelsParam ? labelsParam.split(",").filter(Boolean) : undefined,
    group: get("group"),
    store: get("store"),
    priority: get("priority"),
    sortBy,
  };

  const [result, stores, labels, groups, stats, settings] = await Promise.all([
    listItems(filters),
    getDistinctStores(),
    listLabels(),
    listGroups(),
    getDashboardStats(),
    getSettings(),
  ]);

  const hasAnyFilter = Boolean(filters.search || filters.labels?.length || filters.group || filters.store || filters.priority);

  return (
    <div className="space-y-6">
      <PageHeader title="Bought" subtitle={`${result.total} item${result.total === 1 ? "" : "s"} purchased`} />

      <div className="grid grid-cols-2 gap-4">
        <StatCard
          label="Total spent"
          value={formatMoney(stats.boughtTotal, settings.baseCurrency)}
          icon={ShoppingBag}
          tone="success"
        />
        <StatCard
          label="Spent this month"
          value={formatMoney(stats.boughtTotalThisMonth, settings.baseCurrency)}
          icon={CalendarClock}
          tone="accent"
        />
      </div>

      <FiltersBar stores={stores} labels={labels} groups={groups} showMissingPriceFilter={false} />

      {result.items.length === 0 ? (
        hasAnyFilter ? (
          <EmptyState
            icon={SearchX}
            title="No bought items match your filters"
            description="Try adjusting or clearing your filters."
            action={
              <Link
                href="/bought"
                className="inline-flex h-10 items-center justify-center rounded-xl border border-border bg-surface px-4 text-sm font-medium text-foreground shadow-sm hover:bg-surface-muted"
              >
                Clear filters
              </Link>
            }
          />
        ) : (
          <EmptyState
            icon={ShoppingBag}
            title="Nothing bought yet"
            description="Items you mark as bought from your wishlist will show up here."
            action={
              <Link
                href="/items"
                className="inline-flex h-10 items-center justify-center rounded-xl bg-accent px-4 text-sm font-medium text-accent-foreground shadow-sm hover:bg-accent-hover"
              >
                Go to wishlist
              </Link>
            }
          />
        )
      ) : (
        <ItemsGrid items={result.items} allowMarkBought={false} />
      )}
    </div>
  );
}
