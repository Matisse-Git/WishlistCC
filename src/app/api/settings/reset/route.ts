import { prisma } from "@/lib/db";
import { ok } from "@/lib/api-response";

export async function POST() {
  await prisma.itemLabel.deleteMany();
  await prisma.item.deleteMany();
  await prisma.label.deleteMany();
  await prisma.exchangeRateCache.deleteMany();
  await prisma.setting.deleteMany();
  await prisma.setting.create({ data: { baseCurrency: "USD" } });
  return ok({ success: true });
}
