import { prisma } from "@/lib/db";
import { ok, notFound } from "@/lib/api-response";

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const group = await prisma.group.findUnique({ where: { id } });
  if (!group) return notFound("Group not found");

  // Items keep existing (groupId set to null — see schema onDelete: SetNull).
  await prisma.group.delete({ where: { id } });
  return ok({ success: true });
}
