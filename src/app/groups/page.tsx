import Link from "next/link";
import { Layers, ChevronRight } from "lucide-react";
import { listGroups } from "@/lib/groups";
import { getSettings } from "@/lib/settings";
import { formatMoney } from "@/lib/money";
import { PageHeader } from "@/components/ui/PageHeader";
import { PageLayout } from "@/components/ui/PageLayout";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/EmptyState";
import { NewGroupForm } from "@/components/NewGroupForm";

export const dynamic = "force-dynamic";

export default async function GroupsPage() {
  const [groups, settings] = await Promise.all([listGroups(), getSettings()]);

  return (
    <PageLayout
      rail={
        <Card padding="md" className="space-y-3">
          <div>
            <h2 className="text-sm font-semibold text-foreground">New group</h2>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Groups bundle items into a project, like “Build a PC” — separate from labels, which tag individual
              items.
            </p>
          </div>
          <NewGroupForm />
        </Card>
      }
    >
      <PageHeader title="Groups" subtitle={`${groups.length} group${groups.length === 1 ? "" : "s"}`} />

      {groups.length === 0 ? (
        <EmptyState
          icon={Layers}
          title="No groups yet"
          description="Create your first group from the sidebar — separate from labels, which tag individual items."
        />
      ) : (
        <div className="grid grid-cols-[repeat(auto-fill,minmax(240px,1fr))] gap-5">
          {groups.map((group) => (
            <Link key={group.id} href={`/groups/${group.id}`}>
              <Card hover className="flex h-full flex-col gap-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-accent-soft text-accent-hover">
                      <Layers className="h-4 w-4" />
                    </span>
                    <h3 className="text-sm font-semibold text-foreground">{group.name}</h3>
                  </div>
                  <ChevronRight className="mt-1.5 h-4 w-4 shrink-0 text-muted-foreground" />
                </div>
                <p className="text-xs text-muted-foreground">
                  {group.itemCount} item{group.itemCount === 1 ? "" : "s"}
                </p>
                <div className="mt-auto flex items-baseline gap-3 pt-2 text-sm">
                  <span className="tabular-nums text-foreground">
                    {formatMoney(group.activeTotal, settings.baseCurrency)}
                    <span className="ml-1 text-xs font-normal text-muted-foreground">wishlist</span>
                  </span>
                  {Number(group.boughtTotal) > 0 && (
                    <span className="tabular-nums text-muted-foreground">
                      {formatMoney(group.boughtTotal, settings.baseCurrency)}
                      <span className="ml-1 text-xs font-normal">spent</span>
                    </span>
                  )}
                </div>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </PageLayout>
  );
}
