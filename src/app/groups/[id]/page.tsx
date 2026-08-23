import { notFound } from "next/navigation";
import { Layers, Wallet, ShoppingBag, SearchX } from "lucide-react";
import { listItems, getDistinctStores, type SortOption } from "@/lib/items";
import { getGroupById } from "@/lib/groups";
import { listLabels } from "@/lib/labels";
import { getSettings } from "@/lib/settings";
import { formatMoney } from "@/lib/money";
import { AddItemBar } from "@/components/AddItemBar";
import { FiltersBar } from "@/components/FiltersBar";
import { ItemsGrid } from "@/components/ItemsGrid";
import { EmptyState } from "@/components/EmptyState";
import { StatCard } from "@/components/StatCard";
import { PageHeader } from "@/components/ui/PageHeader";

export const dynamic = "force-dynamic";

const VALID_SORTS = new Set<SortOption>([
  "createdAt",
  "createdAtAsc",
  "updatedAt",
  "priceAsc",
  "priceDesc",
  "titleAsc",
]);

export default async function GroupDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { id } = await params;
  const group = await getGroupById(id);
  if (!group) notFound();

  const sp = await searchParams;
  const get = (key: string) => {
    const v = sp[key];
    return typeof v === "string" && v.length > 0 ? v : undefined;
  };

  const rawStatus = get("status");
  const status = rawStatus === "wishlist" ? "wishlist" : rawStatus === "bought" ? "bought" : undefined;
  const sortByParam = get("sortBy");
  const sortBy: SortOption = sortByParam && VALID_SORTS.has(sortByParam as SortOption) ? (sortByParam as SortOption) : "createdAt";
  const labelsParam = get("labels");

  const filters = {
    status,
    group: id,
    search: get("search"),
    labels: labelsParam ? labelsParam.split(",").filter(Boolean) : undefined,
    store: get("store"),
    priority: get("priority"),
    missingPrice: get("missingPrice") === "true",
    sortBy,
  };

  const [result, stores, labels, settings] = await Promise.all([
    listItems(filters),
    getDistinctStores(),
    listLabels(),
    getSettings(),
  ]);

  const hasAnyFilter = Boolean(
    filters.search ||
      filters.labels?.length ||
      filters.store ||
      filters.priority ||
      filters.missingPrice ||
      (rawStatus && rawStatus !== "all")
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title={group.name}
        subtitle={`${group.itemCount} item${group.itemCount === 1 ? "" : "s"} in this group`}
      />

      <div className="grid grid-cols-2 gap-4">
        <StatCard
          label="Wishlist total"
          value={formatMoney(group.activeTotal, settings.baseCurrency)}
          icon={Wallet}
          tone="accent"
        />
        <StatCard
          label="Already spent"
          value={formatMoney(group.boughtTotal, settings.baseCurrency)}
          icon={ShoppingBag}
          tone="success"
        />
      </div>

      <AddItemBar defaultGroup={group.name} />
      <FiltersBar stores={stores} labels={labels} showStatusFilter showGroupFilter={false} defaultStatus="all" />

      {result.items.length === 0 ? (
        hasAnyFilter ? (
          <EmptyState
            icon={SearchX}
            title="No items match your filters"
            description="Try adjusting or clearing your filters to see more of this group."
          />
        ) : (
          <EmptyState
            icon={Layers}
            title="Nothing in this group yet"
            description={`Add an item above, or assign an existing item to “${group.name}” from its edit form.`}
          />
        )
      ) : (
        <ItemsGrid items={result.items} allowMarkBought={status !== "bought"} />
      )}
    </div>
  );
}
