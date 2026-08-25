import { prisma } from "@/lib/db";
import { getItemById } from "@/lib/items";
import { resolveSetOnPurchase } from "@/lib/variants";
import { markBoughtSchema } from "@/lib/validation";
import { ok, notFound, validationError } from "@/lib/api-response";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const existing = await prisma.item.findUnique({ where: { id } });
  if (!existing) return notFound("Item not found");

  const body = await request.json().catch(() => ({}));
  const parsed = markBoughtSchema.safeParse(body);
  if (!parsed.success) return validationError(parsed.error);
  const data = parsed.data;

  let boughtPrice = data.boughtPrice ?? undefined;
  let boughtCurrency = data.boughtCurrency ?? undefined;

  if (boughtPrice === undefined) {
    if (existing.convertedPrice !== null) {
      boughtPrice = Number(existing.convertedPrice);
      boughtCurrency = boughtCurrency ?? existing.baseCurrency ?? undefined;
    } else if (existing.originalPrice !== null) {
      boughtPrice = Number(existing.originalPrice);
      boughtCurrency = boughtCurrency ?? existing.originalCurrency ?? undefined;
    }
  }

  const updated = await prisma.item.update({
    where: { id },
    data: {
      status: "bought",
      boughtAt: data.boughtAt ?? new Date(),
      boughtPrice: boughtPrice ?? null,
      boughtCurrency: boughtCurrency ?? null,
      ...(data.notes !== undefined ? { notes: data.notes } : {}),
    },
  });

  // Buying one option resolves the choice — the alternatives stop being
  // suppressed from totals and go back to being independent items.
  if (existing.variantGroupId) {
    await resolveSetOnPurchase(existing.variantGroupId);
  }

  const item = await getItemById(updated.id);
  return ok(item);
}
