import { prisma } from "@/lib/db";
import { getItemById } from "@/lib/items";
import { getSettings } from "@/lib/settings";
import { resolveLabelIdsByName } from "@/lib/labels";
import { resolveGroupIdByName } from "@/lib/groups";
import { computePriceFields } from "@/lib/conversion-service";
import { itemUpdateSchema } from "@/lib/validation";
import { ok, badRequest, notFound, validationError } from "@/lib/api-response";
import type { Prisma } from "@/generated/prisma/client";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const existing = await prisma.item.findUnique({ where: { id } });
  if (!existing) return notFound("Item not found");

  const body = await request.json().catch(() => null);
  if (body === null) return badRequest("Invalid JSON body");

  const parsed = itemUpdateSchema.safeParse(body);
  if (!parsed.success) return validationError(parsed.error);
  const data = parsed.data;

  const settings = await getSettings();
  const data_: Prisma.ItemUpdateInput = {};

  if (data.url !== undefined) data_.url = data.url;
  if (data.title !== undefined) data_.title = data.title;
  if (data.description !== undefined) data_.description = data.description;
  if (data.imageUrl !== undefined) data_.imageUrl = data.imageUrl;
  if (data.status !== undefined) data_.status = data.status;
  if (data.priority !== undefined) data_.priority = data.priority;
  if (data.store !== undefined) data_.store = data.store;
  if (data.notes !== undefined) data_.notes = data.notes;

  const priceRelatedFieldsChanged = data.originalPrice !== undefined || data.originalCurrency !== undefined;
  const manualOverride = data.convertedPrice !== undefined && data.convertedPrice !== null;

  if (data.originalPrice !== undefined) data_.originalPrice = data.originalPrice;
  if (data.originalCurrency !== undefined) data_.originalCurrency = data.originalCurrency;

  if (manualOverride) {
    data_.convertedPrice = data.convertedPrice!.toString();
    data_.conversionStatus = "manual";
    data_.baseCurrency = data.baseCurrency ?? existing.baseCurrency ?? settings.baseCurrency;
  } else if (data.convertedPrice === null) {
    // Explicitly cleared the override — fall back to auto-computed conversion.
    const originalPrice = data.originalPrice !== undefined ? data.originalPrice : existing.originalPrice ? Number(existing.originalPrice) : null;
    const originalCurrency = data.originalCurrency !== undefined ? data.originalCurrency : existing.originalCurrency;
    const targetBase = data.baseCurrency ?? settings.baseCurrency;
    const fields = await computePriceFields(originalPrice, originalCurrency, targetBase);
    data_.convertedPrice = fields.convertedPrice;
    data_.conversionStatus = fields.conversionStatus;
    data_.baseCurrency = fields.baseCurrency;
  } else if (priceRelatedFieldsChanged) {
    const originalPrice = data.originalPrice !== undefined ? data.originalPrice : existing.originalPrice ? Number(existing.originalPrice) : null;
    const originalCurrency = data.originalCurrency !== undefined ? data.originalCurrency : existing.originalCurrency;
    const targetBase = data.baseCurrency ?? existing.baseCurrency ?? settings.baseCurrency;
    const fields = await computePriceFields(originalPrice, originalCurrency, targetBase);
    data_.convertedPrice = fields.convertedPrice;
    data_.conversionStatus = fields.conversionStatus;
    data_.baseCurrency = fields.baseCurrency;
  } else if (data.baseCurrency !== undefined) {
    data_.baseCurrency = data.baseCurrency;
  }

  if (data.labels !== undefined) {
    const labelIds = await resolveLabelIdsByName(data.labels);
    data_.labels = {
      deleteMany: {},
      create: labelIds.map((labelId) => ({ labelId })),
    };
  }

  if (data.group !== undefined) {
    const groupId = await resolveGroupIdByName(data.group);
    data_.group = groupId ? { connect: { id: groupId } } : { disconnect: true };
  }

  await prisma.item.update({ where: { id }, data: data_ });
  const item = await getItemById(id);
  return ok(item);
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const existing = await prisma.item.findUnique({ where: { id } });
  if (!existing) return notFound("Item not found");

  await prisma.item.delete({ where: { id } });
  return ok({ success: true });
}
