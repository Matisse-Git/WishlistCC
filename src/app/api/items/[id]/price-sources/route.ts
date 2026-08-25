import { prisma } from "@/lib/db";
import { getItemById } from "@/lib/items";
import { getSettings } from "@/lib/settings";
import { computePriceFields } from "@/lib/conversion-service";
import { priceSourceCreateSchema } from "@/lib/validation";
import { ok, badRequest, notFound, validationError } from "@/lib/api-response";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const existing = await prisma.item.findUnique({ where: { id } });
  if (!existing) return notFound("Item not found");

  const body = await request.json().catch(() => null);
  if (body === null) return badRequest("Invalid JSON body");

  const parsed = priceSourceCreateSchema.safeParse(body);
  if (!parsed.success) return validationError(parsed.error);
  const data = parsed.data;

  const settings = await getSettings();
  const manualOverride = data.convertedPrice !== undefined && data.convertedPrice !== null;
  const priceFields = manualOverride
    ? {
        convertedPrice: data.convertedPrice!.toString(),
        conversionStatus: "manual",
        baseCurrency: data.baseCurrency ?? settings.baseCurrency,
      }
    : await computePriceFields(data.originalPrice, data.originalCurrency, data.baseCurrency ?? settings.baseCurrency);

  await prisma.priceSource.create({
    data: {
      itemId: id,
      url: data.url ?? null,
      store: data.store ?? null,
      originalPrice: data.originalPrice ?? null,
      originalCurrency: data.originalCurrency ?? null,
      convertedPrice: priceFields.convertedPrice,
      baseCurrency: priceFields.baseCurrency,
      conversionStatus: priceFields.conversionStatus,
    },
  });

  const item = await getItemById(id);
  return ok(item, 201);
}
