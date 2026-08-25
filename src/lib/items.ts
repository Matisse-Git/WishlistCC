import Decimal from "decimal.js";
import { prisma } from "./db";
import { toDecimal } from "./money";
import type { Prisma } from "@/generated/prisma/client";

function ci(value: string): Prisma.StringFilter {
  return { contains: value, mode: "insensitive" };
}

const VARIANT_SIBLING_INCLUDE = {
  labels: { include: { label: true } },
  group: true,
  priceSources: true,
} as const;

type ItemWithLabels = Prisma.ItemGetPayload<{
  include: {
    labels: { include: { label: true } };
    group: true;
    priceSources: true;
    variantGroup: { include: { items: { include: typeof VARIANT_SIBLING_INCLUDE } } };
  };
}>;

type VariantSiblingRow = Prisma.ItemGetPayload<{ include: typeof VARIANT_SIBLING_INCLUDE }>;

export interface SerializedLabel {
  id: string;
  name: string;
  color: string | null;
}

export interface SerializedGroupRef {
  id: string;
  name: string;
  color: string | null;
}

export interface SerializedPriceSource {
  id: string;
  url: string | null;
  store: string | null;
  originalPrice: string | null;
  originalCurrency: string | null;
  convertedPrice: string | null;
  baseCurrency: string | null;
  conversionStatus: string;
  createdAt: string;
}

export interface SerializedItem {
  id: string;
  url: string | null;
  title: string;
  description: string | null;
  imageUrl: string | null;
  originalPrice: string | null;
  originalCurrency: string | null;
  convertedPrice: string | null;
  baseCurrency: string | null;
  conversionStatus: string;
  status: string;
  priority: string | null;
  store: string | null;
  notes: string | null;
  boughtAt: string | null;
  boughtPrice: string | null;
  boughtCurrency: string | null;
  createdAt: string;
  updatedAt: string;
  labels: SerializedLabel[];
  group: SerializedGroupRef | null;
  /** Null when this item isn't part of a variant set. */
  variantGroupId: string | null;
  /** Whether this item's price counts toward wishlist/group totals. Always true outside a variant set. */
  isSelected: boolean;
  /**
   * Every member of this item's variant set, including itself, sorted
   * selected-first then oldest-first — empty when not part of a set.
   * Siblings never carry their own nested `variants` (always `[]`) to avoid
   * duplicating the whole set at every level.
   */
  variants: SerializedItem[];
  /** Other places to buy this exact item, sorted oldest-first — see PriceSource. Empty if none have been added. */
  priceSources: SerializedPriceSource[];
}

function serializePriceSource(source: VariantSiblingRow["priceSources"][number]): SerializedPriceSource {
  return {
    id: source.id,
    url: source.url,
    store: source.store,
    originalPrice: source.originalPrice?.toString() ?? null,
    originalCurrency: source.originalCurrency,
    convertedPrice: source.convertedPrice?.toString() ?? null,
    baseCurrency: source.baseCurrency,
    conversionStatus: source.conversionStatus,
    createdAt: source.createdAt.toISOString(),
  };
}

function serializeItemBase(item: VariantSiblingRow): Omit<SerializedItem, "variants"> {
  return {
    id: item.id,
    url: item.url,
    title: item.title,
    description: item.description,
    imageUrl: item.imageUrl,
    originalPrice: item.originalPrice?.toString() ?? null,
    originalCurrency: item.originalCurrency,
    convertedPrice: item.convertedPrice?.toString() ?? null,
    baseCurrency: item.baseCurrency,
    conversionStatus: item.conversionStatus,
    status: item.status,
    priority: item.priority,
    store: item.store,
    notes: item.notes,
    boughtAt: item.boughtAt?.toISOString() ?? null,
    boughtPrice: item.boughtPrice?.toString() ?? null,
    boughtCurrency: item.boughtCurrency,
    createdAt: item.createdAt.toISOString(),
    updatedAt: item.updatedAt.toISOString(),
    labels: item.labels.map((l) => ({ id: l.label.id, name: l.label.name, color: l.label.color })),
    group: item.group ? { id: item.group.id, name: item.group.name, color: item.group.color } : null,
    variantGroupId: item.variantGroupId,
    isSelected: item.isSelected,
    priceSources: [...item.priceSources]
      .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())
      .map(serializePriceSource),
  };
}

function sortVariants(items: VariantSiblingRow[]): VariantSiblingRow[] {
  return [...items].sort((a, b) => {
    if (a.isSelected !== b.isSelected) return a.isSelected ? -1 : 1;
    return a.createdAt.getTime() - b.createdAt.getTime();
  });
}

export function serializeItem(item: ItemWithLabels): SerializedItem {
  const siblings = item.variantGroup?.items ?? [];
  const variants = siblings.length > 1 ? sortVariants(siblings).map((s) => ({ ...serializeItemBase(s), variants: [] })) : [];
  return { ...serializeItemBase(item), variants };
}

export const ITEM_INCLUDE = {
  labels: { include: { label: true } },
  group: true,
  priceSources: true,
  variantGroup: { include: { items: { include: VARIANT_SIBLING_INCLUDE } } },
} as const;

export type SortOption =
  | "createdAt"
  | "createdAtAsc"
  | "updatedAt"
  | "priceAsc"
  | "priceDesc"
  | "titleAsc";

export interface ListItemsFilters {
  status?: string;
  search?: string;
  labels?: string[];
  group?: string;
  store?: string;
  missingPrice?: boolean;
  priority?: string;
  sortBy?: SortOption;
  page?: number;
  pageSize?: number;
}

export interface ListItemsResult {
  items: SerializedItem[];
  total: number;
  page: number;
  pageSize: number;
}

export async function listItems(filters: ListItemsFilters): Promise<ListItemsResult> {
  const where: Prisma.ItemWhereInput = {};
  if (filters.status) where.status = filters.status;
  if (filters.store) where.store = filters.store;
  if (filters.priority) where.priority = filters.priority;
  if (filters.missingPrice) where.convertedPrice = null;
  if (filters.labels?.length) where.labels = { some: { labelId: { in: filters.labels } } };
  if (filters.group) where.groupId = filters.group;
  if (filters.search?.trim()) {
    const s = filters.search.trim();
    where.OR = [{ title: ci(s) }, { description: ci(s) }, { store: ci(s) }, { notes: ci(s) }];
  }

  const items = await prisma.item.findMany({ where, include: ITEM_INCLUDE });
  const sorted = sortItems(items, filters.sortBy ?? "createdAt");

  const page = filters.page && filters.page > 0 ? filters.page : 1;
  const pageSize = filters.pageSize && filters.pageSize > 0 ? filters.pageSize : 60;
  const start = (page - 1) * pageSize;
  const pageItems = sorted.slice(start, start + pageSize);

  return { items: pageItems.map(serializeItem), total: sorted.length, page, pageSize };
}

function sortItems(items: ItemWithLabels[], sortBy: SortOption): ItemWithLabels[] {
  const arr = [...items];
  switch (sortBy) {
    case "createdAtAsc":
      return arr.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
    case "updatedAt":
      return arr.sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
    case "priceAsc":
      return arr.sort((a, b) => comparePriceNullsLast(a, b, true));
    case "priceDesc":
      return arr.sort((a, b) => comparePriceNullsLast(a, b, false));
    case "titleAsc":
      return arr.sort((a, b) => a.title.localeCompare(b.title));
    case "createdAt":
    default:
      return arr.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }
}

function comparePriceNullsLast(a: ItemWithLabels, b: ItemWithLabels, asc: boolean): number {
  const av = a.convertedPrice === null ? null : Number(a.convertedPrice);
  const bv = b.convertedPrice === null ? null : Number(b.convertedPrice);
  if (av === null && bv === null) return 0;
  if (av === null) return 1;
  if (bv === null) return -1;
  return asc ? av - bv : bv - av;
}

export async function getItemById(id: string): Promise<SerializedItem | null> {
  const item = await prisma.item.findUnique({ where: { id }, include: ITEM_INCLUDE });
  return item ? serializeItem(item) : null;
}

export interface DashboardStats {
  activeCount: number;
  activeTotal: string;
  activeMissingPriceCount: number;
  isEstimatedTotal: boolean;
  boughtCount: number;
  boughtTotal: string;
  boughtTotalThisMonth: string;
}

export async function getDashboardStats(): Promise<DashboardStats> {
  const [activeItems, boughtItems] = await Promise.all([
    prisma.item.findMany({ where: { status: "wishlist", isSelected: true } }),
    prisma.item.findMany({ where: { status: "bought", isSelected: true } }),
  ]);

  let activeTotal = new Decimal(0);
  let activeMissingPriceCount = 0;
  for (const item of activeItems) {
    if (item.convertedPrice === null) {
      activeMissingPriceCount += 1;
    } else {
      activeTotal = activeTotal.plus(toDecimal(item.convertedPrice) ?? 0);
    }
  }

  let boughtTotal = new Decimal(0);
  let boughtTotalThisMonth = new Decimal(0);
  const now = new Date();
  for (const item of boughtItems) {
    const spent =
      toDecimal(item.boughtPrice) ?? toDecimal(item.convertedPrice) ?? toDecimal(item.originalPrice) ?? new Decimal(0);
    boughtTotal = boughtTotal.plus(spent);
    if (
      item.boughtAt &&
      item.boughtAt.getFullYear() === now.getFullYear() &&
      item.boughtAt.getMonth() === now.getMonth()
    ) {
      boughtTotalThisMonth = boughtTotalThisMonth.plus(spent);
    }
  }

  return {
    activeCount: activeItems.length,
    activeTotal: activeTotal.toFixed(2),
    activeMissingPriceCount,
    isEstimatedTotal: activeMissingPriceCount > 0,
    boughtCount: boughtItems.length,
    boughtTotal: boughtTotal.toFixed(2),
    boughtTotalThisMonth: boughtTotalThisMonth.toFixed(2),
  };
}

export async function getRecentItems(limit = 6): Promise<SerializedItem[]> {
  const items = await prisma.item.findMany({
    where: { status: "wishlist" },
    include: ITEM_INCLUDE,
    orderBy: { createdAt: "desc" },
    take: limit,
  });
  return items.map(serializeItem);
}

export async function getMostExpensiveItems(limit = 5): Promise<SerializedItem[]> {
  const items = await prisma.item.findMany({
    where: { status: "wishlist", convertedPrice: { not: null }, isSelected: true },
    include: ITEM_INCLUDE,
  });
  const sorted = items.sort((a, b) => Number(b.convertedPrice) - Number(a.convertedPrice));
  return sorted.slice(0, limit).map(serializeItem);
}

export async function getDistinctStores(): Promise<string[]> {
  const rows = await prisma.item.findMany({
    where: { store: { not: null } },
    select: { store: true },
    distinct: ["store"],
  });
  return rows.map((r) => r.store!).filter(Boolean).sort((a, b) => a.localeCompare(b));
}
