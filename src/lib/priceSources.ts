import { prisma } from "./db";

/**
 * Makes `sourceId` the item's active listing by swapping its price/url/store
 * fields with the item's own — the item's current listing becomes a price
 * source in its place, rather than tracking a separate "which one is
 * active" flag. Keeps every other part of the app (totals, sorting,
 * filtering, the bought flow) working against the item's own fields
 * unchanged, since there's always exactly one active listing per item.
 */
export async function activatePriceSource(itemId: string, sourceId: string): Promise<void> {
  await prisma.$transaction(async (tx) => {
    const [item, source] = await Promise.all([
      tx.item.findUnique({ where: { id: itemId } }),
      tx.priceSource.findUnique({ where: { id: sourceId } }),
    ]);
    if (!item) throw new Error("Item not found.");
    if (!source || source.itemId !== itemId) throw new Error("Price source not found.");

    await tx.item.update({
      where: { id: itemId },
      data: {
        url: source.url,
        store: source.store,
        originalPrice: source.originalPrice,
        originalCurrency: source.originalCurrency,
        convertedPrice: source.convertedPrice,
        baseCurrency: source.baseCurrency,
        conversionStatus: source.conversionStatus,
      },
    });

    await tx.priceSource.update({
      where: { id: sourceId },
      data: {
        url: item.url,
        store: item.store,
        originalPrice: item.originalPrice,
        originalCurrency: item.originalCurrency,
        convertedPrice: item.convertedPrice,
        baseCurrency: item.baseCurrency,
        conversionStatus: item.conversionStatus,
      },
    });
  });
}
