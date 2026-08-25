import { prisma } from "@/lib/db";
import { listItems, getItemById, ITEM_INCLUDE } from "@/lib/items";
import { getSettings } from "@/lib/settings";
import { resolveLabelIdsByName } from "@/lib/labels";
import { resolveGroupIdByName } from "@/lib/groups";
import { computePriceFields } from "@/lib/conversion-service";
import { attachVariant } from "@/lib/variants";
import { itemCreateSchema, itemQuerySchema } from "@/lib/validation";
import { ok, badRequest, validationError } from "@/lib/api-response";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const parsed = itemQuerySchema.safeParse(Object.fromEntries(searchParams.entries()));
  if (!parsed.success) return validationError(parsed.error);

  const result = await listItems(parsed.data);
  return ok(result);
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  if (body === null) return badRequest("Invalid JSON body");

  const parsed = itemCreateSchema.safeParse(body);
  if (!parsed.success) return validationError(parsed.error);
  const data = parsed.data;

  const settings = await getSettings();
  const labelIds = data.labels ? await resolveLabelIdsByName(data.labels) : [];
  const groupId = await resolveGroupIdByName(data.group);

  const manualOverride = data.convertedPrice !== undefined && data.convertedPrice !== null;
  const priceFields = manualOverride
    ? {
        convertedPrice: data.convertedPrice!.toString(),
        conversionStatus: "manual",
        baseCurrency: data.baseCurrency ?? settings.baseCurrency,
      }
    : await computePriceFields(data.originalPrice, data.originalCurrency, data.baseCurrency ?? settings.baseCurrency);

  const created = await prisma.item.create({
    data: {
      url: data.url ?? null,
      title: data.title,
      description: data.description ?? null,
      imageUrl: data.imageUrl ?? null,
      originalPrice: data.originalPrice ?? null,
      originalCurrency: data.originalCurrency ?? null,
      convertedPrice: priceFields.convertedPrice,
      baseCurrency: priceFields.baseCurrency,
      conversionStatus: priceFields.conversionStatus,
      status: data.status ?? "wishlist",
      priority: data.priority ?? null,
      store: data.store ?? null,
      notes: data.notes ?? null,
      labels: { create: labelIds.map((labelId) => ({ labelId })) },
      groupId,
    },
    include: ITEM_INCLUDE,
  });

  if (data.variantOf) {
    try {
      await attachVariant(created.id, data.variantOf);
    } catch (err) {
      return badRequest(err instanceof Error ? err.message : "Failed to link variant");
    }
  }

  const item = await getItemById(created.id);
  return ok(item, 201);
}
