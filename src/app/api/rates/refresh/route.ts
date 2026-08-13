import { getSettings } from "@/lib/settings";
import { refreshExchangeRates } from "@/lib/currency";
import { recalculateAllConversions } from "@/lib/conversion-service";
import { ok, serverError } from "@/lib/api-response";

export async function POST() {
  const settings = await getSettings();
  const result = await refreshExchangeRates(settings.baseCurrency);

  if (!result) {
    return serverError(
      "Could not reach the exchange rate provider. Existing cached rates (if any) are still in use."
    );
  }

  await recalculateAllConversions(settings.baseCurrency);

  return ok({
    baseCurrency: settings.baseCurrency,
    fetchedAt: result.fetchedAt.toISOString(),
    rateCount: Object.keys(result.rates).length,
  });
}
