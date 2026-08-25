import { prisma } from "@/lib/db";
import { getItemById } from "@/lib/items";
import { ok, notFound } from "@/lib/api-response";

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string; sourceId: string }> }) {
  const { id, sourceId } = await params;
  const source = await prisma.priceSource.findUnique({ where: { id: sourceId } });
  if (!source || source.itemId !== id) return notFound("Price source not found");

  await prisma.priceSource.delete({ where: { id: sourceId } });
  const item = await getItemById(id);
  return ok(item);
}
