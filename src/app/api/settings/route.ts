import { prisma } from "@/lib/db";
import { getSettings, serializeSettings } from "@/lib/settings";
import { settingsUpdateSchema } from "@/lib/validation";
import { ok, validationError, serverError } from "@/lib/api-response";
import { recalculateAllConversions } from "@/lib/conversion-service";

export async function GET() {
  const settings = await getSettings();
  return ok(serializeSettings(settings));
}

export async function PATCH(request: Request) {
  const body = await request.json().catch(() => null);
  if (body === null) return serverError("Invalid JSON body");

  const parsed = settingsUpdateSchema.safeParse(body);
  if (!parsed.success) return validationError(parsed.error);

  const current = await getSettings();
  const baseCurrencyChanged =
    parsed.data.baseCurrency !== undefined && parsed.data.baseCurrency !== current.baseCurrency;

  const updated = await prisma.setting.update({
    where: { id: current.id },
    data: {
      baseCurrency: parsed.data.baseCurrency,
      goalAmount: parsed.data.goalAmount === undefined ? undefined : parsed.data.goalAmount,
      savedAmount: parsed.data.savedAmount === undefined ? undefined : parsed.data.savedAmount,
    },
  });

  if (baseCurrencyChanged) {
    // Fire-and-forget: don't block the settings save on re-converting every item.
    recalculateAllConversions(updated.baseCurrency).catch((err) => {
      console.error("Failed to recalculate conversions after base currency change:", err);
    });
  }

  return ok(serializeSettings(updated));
}
