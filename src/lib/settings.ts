import { prisma } from "./db";

/** Settings is conceptually a singleton — this returns the first row, creating it on first use. */
export async function getSettings() {
  const existing = await prisma.setting.findFirst();
  if (existing) return existing;
  return prisma.setting.create({ data: { baseCurrency: "USD" } });
}

export interface SerializedSettings {
  id: number;
  baseCurrency: string;
  goalAmount: string | null;
  savedAmount: string | null;
  updatedAt: string;
}

export function serializeSettings(settings: Awaited<ReturnType<typeof getSettings>>): SerializedSettings {
  return {
    id: settings.id,
    baseCurrency: settings.baseCurrency,
    goalAmount: settings.goalAmount?.toString() ?? null,
    savedAmount: settings.savedAmount?.toString() ?? null,
    updatedAt: settings.updatedAt.toISOString(),
  };
}
