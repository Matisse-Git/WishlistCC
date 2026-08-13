import { getSettings, serializeSettings } from "@/lib/settings";
import { prisma } from "@/lib/db";
import { SettingsForm } from "@/components/SettingsForm";
import { LabelManager } from "@/components/LabelManager";
import { listLabels } from "@/lib/labels";
import { PageHeader } from "@/components/ui/PageHeader";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const settings = await getSettings();
  const rateCache = await prisma.exchangeRateCache.findUnique({
    where: { baseCurrency: settings.baseCurrency },
  });
  const labels = await listLabels();

  return (
    <div className="max-w-2xl space-y-6">
      <PageHeader title="Settings" subtitle="Configure your base currency, savings goal, and manage exchange rates." />

      <SettingsForm
        initialSettings={serializeSettings(settings)}
        rateInfo={
          rateCache
            ? { fetchedAt: rateCache.fetchedAt.toISOString(), expiresAt: rateCache.expiresAt.toISOString() }
            : null
        }
      />

      <LabelManager initialLabels={labels} />
    </div>
  );
}
