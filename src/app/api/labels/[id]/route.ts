import { prisma } from "@/lib/db";
import { ok, notFound } from "@/lib/api-response";

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const label = await prisma.label.findUnique({ where: { id } });
  if (!label) return notFound("Label not found");

  // ItemLabel rows cascade-delete (see schema), leaving items themselves untouched.
  await prisma.label.delete({ where: { id } });
  return ok({ success: true });
}
