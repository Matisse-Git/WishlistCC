import Decimal from "decimal.js";
import { prisma } from "./db";
import { toDecimal } from "./money";

export interface SerializedGroup {
  id: string;
  name: string;
  color: string | null;
  createdAt: string;
  itemCount: number;
  activeTotal: string;
  boughtTotal: string;
}

export async function listGroups(): Promise<SerializedGroup[]> {
  const groups = await prisma.group.findMany({
    orderBy: { name: "asc" },
    include: { items: { select: { status: true, convertedPrice: true, boughtPrice: true, originalPrice: true } } },
  });

  return groups.map((g) => {
    let activeTotal = new Decimal(0);
    let boughtTotal = new Decimal(0);
    for (const item of g.items) {
      if (item.status === "bought") {
        boughtTotal = boughtTotal.plus(toDecimal(item.boughtPrice) ?? toDecimal(item.convertedPrice) ?? toDecimal(item.originalPrice) ?? 0);
      } else {
        activeTotal = activeTotal.plus(toDecimal(item.convertedPrice) ?? 0);
      }
    }
    return {
      id: g.id,
      name: g.name,
      color: g.color,
      createdAt: g.createdAt.toISOString(),
      itemCount: g.items.length,
      activeTotal: activeTotal.toFixed(2),
      boughtTotal: boughtTotal.toFixed(2),
    };
  });
}

export async function getGroupById(id: string): Promise<SerializedGroup | null> {
  const groups = await listGroups();
  return groups.find((g) => g.id === id) ?? null;
}

/** Finds-or-creates a group by name (case-sensitive match on the unique name) and returns its id. Empty/null clears the group. */
export async function resolveGroupIdByName(name: string | null | undefined): Promise<string | null> {
  if (!name || !name.trim()) return null;
  const trimmed = name.trim();

  const existing = await prisma.group.findUnique({ where: { name: trimmed } });
  if (existing) return existing.id;

  const created = await prisma.group.create({ data: { name: trimmed } });
  return created.id;
}
