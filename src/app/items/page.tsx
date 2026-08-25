import Link from "next/link";
import { SearchX } from "lucide-react";
import { listItems, getDistinctStores, type SortOption } from "@/lib/items";
import { listLabels } from "@/lib/labels";
import { listGroups } from "@/lib/groups";
import { AddItemBar } from "@/components/AddItemBar";
import { FiltersBar } from "@/components/FiltersBar";
import { ItemsGrid } from "@/components/ItemsGrid";
import { EmptyState } from "@/components/EmptyState";
import { PageHeader } from "@/components/ui/PageHeader";
import { PageLayout } from "@/components/ui/PageLayout";

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

  const labelsParam = get("labels");
  const filters = {
    status,
    search: get("search"),
    labels: labelsParam ? labelsParam.split(",").filter(Boolean) : undefined,
    group: get("group"),
    store: get("store"),
    priority: get("priority"),
    missingPrice: get("missingPrice") === "true",
    sortBy,
  };

  const [result, stores, labels, groups] = await Promise.all([
    listItems(filters),
    getDistinctStores(),
    listLabels(),
    listGroups(),
  ]);

  const hasAnyFilter = Boolean(
    filters.search || filters.labels?.length || filters.group || filters.store || filters.priority || filters.missingPrice || rawStatus
  );

  return (
    <PageLayout
      rail={
        <>
          <AddItemBar />
          <FiltersBar stores={stores} labels={labels} groups={groups} showStatusFilter />
        </>
      }
    >
      <PageHeader
        title="Wishlist"
        subtitle={`${result.total} item${result.total === 1 ? "" : "s"}`}
      />

      {result.items.length === 0 ? (
        hasAnyFilter ? (
          <EmptyState
            icon={SearchX}
            title="No items match your filters"
            description="Try adjusting or clearing your filters to see more of your wishlist."
            action={
              <Link
                href="/items"
                className="inline-flex h-10 items-center justify-center rounded-xl border border-border bg-surface px-4 text-sm font-medium text-foreground shadow-sm hover:bg-surface-muted"
              >
                Clear filters
              </Link>
            }
          />
        ) : (
          <EmptyState
            title="Your wishlist is empty"
            description="Paste a product link in the sidebar to add your first item — or add one manually."
          />
        )
      ) : (
        <ItemsGrid items={result.items} allowMarkBought={status !== "bought"} />
      )}
    </PageLayout>
  );
}
