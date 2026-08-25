import { getSettings, serializeSettings } from "@/lib/settings";
import { prisma } from "@/lib/db";
import { SettingsForm } from "@/components/SettingsForm";
import { LabelManager } from "@/components/LabelManager";
import { GroupManager } from "@/components/GroupManager";
import { listLabels } from "@/lib/labels";
import { listGroups } from "@/lib/groups";
import { PageHeader } from "@/components/ui/PageHeader";

export const dynamic = "force-dynamic";

const SECTIONS = [
  { id: "general", label: "General" },
  { id: "exchange-rates", label: "Exchange rates" },
  { id: "labels", label: "Labels" },
  { id: "groups", label: "Groups" },
  { id: "danger-zone", label: "Danger zone" },
];

export default async function SettingsPage() {
  const settings = await getSettings();
  const rateCache = await prisma.exchangeRateCache.findUnique({
    where: { baseCurrency: settings.baseCurrency },
  });
  const labels = await listLabels();
  const groups = await listGroups();

  return (
    <div className="space-y-6">
      <PageHeader title="Settings" subtitle="Configure your base currency, savings goal, and manage exchange rates." />

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-[200px_minmax(0,1fr)]">
        <nav className="hidden lg:sticky lg:top-8 lg:flex lg:h-fit lg:flex-col lg:gap-1">
          {SECTIONS.map((s) => (
            <a
              key={s.id}
              href={`#${s.id}`}
              className="rounded-xl px-3 py-2 text-sm font-medium text-muted-foreground transition-colors duration-150 hover:bg-surface-muted hover:text-foreground"
            >
              {s.label}
            </a>
          ))}
        </nav>

        <div className="max-w-2xl space-y-6">
          <SettingsForm
            initialSettings={serializeSettings(settings)}
            rateInfo={
              rateCache
                ? { fetchedAt: rateCache.fetchedAt.toISOString(), expiresAt: rateCache.expiresAt.toISOString() }
                : null
            }
          />

          <LabelManager initialLabels={labels} />
          <GroupManager initialGroups={groups} />
        </div>
      </div>
    </div>
  );
}
