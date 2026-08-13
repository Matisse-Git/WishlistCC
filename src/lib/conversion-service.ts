import { prisma } from "./db";
import { toDecimal } from "./money";
import { computeConversion } from "./currency";

export interface ComputedPriceFields {
  convertedPrice: string | null;
  conversionStatus: string;
  baseCurrency: string | null;
}

/** Computes convertedPrice/conversionStatus/baseCurrency for a (possibly missing) price+currency pair. */
export async function computePriceFields(
  originalPrice: number | null | undefined,
  originalCurrency: string | null | undefined,
  targetBaseCurrency: string
): Promise<ComputedPriceFields> {
  const priceDecimal = toDecimal(originalPrice ?? null);
  const { convertedPrice, conversionStatus } = await computeConversion(
    priceDecimal,
    originalCurrency ?? null,
    targetBaseCurrency
  );
  return {
    convertedPrice: convertedPrice ? convertedPrice.toString() : null,
    conversionStatus,
    baseCurrency: priceDecimal ? targetBaseCurrency : null,
  };
}

/**
 * Re-converts every item's price into a new base currency. Skips items with
 * conversionStatus "manual" since those reflect an explicit user override
 * that a currency-settings change shouldn't silently clobber.
 */
export async function recalculateAllConversions(baseCurrency: string): Promise<void> {
  const items = await prisma.item.findMany({ where: { conversionStatus: { not: "manual" } } });

  await Promise.all(
    items.map(async (item) => {
      const fields = await computePriceFields(
        item.originalPrice ? Number(item.originalPrice) : null,
        item.originalCurrency,
        baseCurrency
      );
      await prisma.item.update({
        where: { id: item.id },
        data: fields,
      });
    })
  );
}
