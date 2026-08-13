import Link from "next/link";
import { listItems, getDistinctStores, type SortOption } from "@/lib/items";
import { listLabels } from "@/lib/labels";
import { AddItemBar } from "@/components/AddItemBar";
import { FiltersBar } from "@/components/FiltersBar";
import { ItemsGrid } from "@/components/ItemsGrid";
import { EmptyState } from "@/components/EmptyState";

export const dynamic = "force-dynamic";

const VALID_SORTS = new Set<SortOption>([
  "createdAt",
  "createdAtAsc",
  "updatedAt",
  "priceAsc",
  "priceDesc",
  "titleAsc",
]);

export default async function ItemsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const get = (key: string) => {
    const v = sp[key];
    return typeof v === "string" && v.length > 0 ? v : undefined;
  };

  const rawStatus = get("status");
  const status = rawStatus === "bought" ? "bought" : rawStatus === "all" ? undefined : "wishlist";
  const sortByParam = get("sortBy");
  const sortBy: SortOption = sortByParam && VALID_SORTS.has(sortByParam as SortOption) ? (sortByParam as SortOption) : "createdAt";

  const filters = {
    status,
    search: get("search"),
    label: get("label"),
    store: get("store"),
    priority: get("priority"),
    missingPrice: get("missingPrice") === "true",
    sortBy,
  };

  const [result, stores, labels] = await Promise.all([listItems(filters), getDistinctStores(), listLabels()]);

  const hasAnyFilter = Boolean(
    filters.search || filters.label || filters.store || filters.priority || filters.missingPrice || rawStatus
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-slate-900">Wishlist</h1>
        <p className="text-sm text-slate-500 mt-1">
          {result.total} item{result.total === 1 ? "" : "s"}
        </p>
      </div>

      <AddItemBar />
      <FiltersBar stores={stores} labels={labels} showStatusFilter />

      {result.items.length === 0 ? (
        hasAnyFilter ? (
          <EmptyState
            title="No items match your filters"
            description="Try adjusting or clearing your filters."
            action={
              <Link href="/items" className="text-indigo-600 text-sm hover:underline">
                Clear filters
              </Link>
            }
          />
        ) : (
          <EmptyState
            title="Your wishlist is empty"
            description="Paste a product URL above to add your first item — or add one manually."
          />
        )
      ) : (
        <ItemsGrid items={result.items} allowMarkBought={status !== "bought"} />
      )}
    </div>
  );
}
