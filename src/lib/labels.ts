import { prisma } from "./db";

export interface SerializedLabelFull {
  id: string;
  name: string;
  color: string | null;
  createdAt: string;
  itemCount: number;
}

export async function listLabels(): Promise<SerializedLabelFull[]> {
  const labels = await prisma.label.findMany({
    orderBy: { name: "asc" },
    include: { _count: { select: { items: true } } },
  });
  return labels.map((l) => ({
    id: l.id,
    name: l.name,
    color: l.color,
    createdAt: l.createdAt.toISOString(),
    itemCount: l._count.items,
  }));
}

/** Finds-or-creates labels by name (case-sensitive match on the unique name) and returns their ids. */
export async function resolveLabelIdsByName(names: string[]): Promise<string[]> {
  const trimmed = [...new Set(names.map((n) => n.trim()).filter(Boolean))];
  if (trimmed.length === 0) return [];

  const existing = await prisma.label.findMany({ where: { name: { in: trimmed } } });
  const existingNames = new Set(existing.map((l) => l.name));
  const toCreate = trimmed.filter((n) => !existingNames.has(n));

  const created = await Promise.all(
    toCreate.map((name) => prisma.label.create({ data: { name } }))
  );

  return [...existing, ...created].map((l) => l.id);
}
