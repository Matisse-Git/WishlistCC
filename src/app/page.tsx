import Link from "next/link";
import { Package, ShoppingBag, Wallet, AlertCircle, ArrowRight } from "lucide-react";
import { getSettings } from "@/lib/settings";
import { getDashboardStats, getRecentItems, getMostExpensiveItems } from "@/lib/items";
import { formatMoney } from "@/lib/money";
import { StatCard } from "@/components/StatCard";
import { GoalCard } from "@/components/GoalCard";
import { AddItemBar } from "@/components/AddItemBar";
import { ItemsGrid } from "@/components/ItemsGrid";
import { EmptyState } from "@/components/EmptyState";
import { PageHeader, SectionHeader } from "@/components/ui/PageHeader";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const [settings, stats, recentItems, expensiveItems] = await Promise.all([
    getSettings(),
    getDashboardStats(),
    getRecentItems(6),
    getMostExpensiveItems(5),
  ]);

  return (
    <div className="space-y-7">
      <PageHeader title="My Wishlist" subtitle="Track what you want, what it costs, and what you've bought." />

      <AddItemBar />

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatCard label="Active items" value={String(stats.activeCount)} icon={Package} tone="accent" />
        <StatCard
          label={stats.isEstimatedTotal ? "Est. wishlist total" : "Wishlist total"}
          value={formatMoney(stats.activeTotal, settings.baseCurrency)}
          sublabel={
            stats.activeMissingPriceCount > 0 ? `${stats.activeMissingPriceCount} missing price` : "Ready to shop"
          }
          icon={Wallet}
          tone="neutral"
        />
        <StatCard label="Bought items" value={String(stats.boughtCount)} icon={ShoppingBag} tone="success" />
        {stats.activeMissingPriceCount > 0 ? (
          <StatCard
            label="Missing prices"
            value={String(stats.activeMissingPriceCount)}
            sublabel="Fill these in for a precise total"
            icon={AlertCircle}
            tone="warning"
          />
        ) : (
          <StatCard
            label="Total spent"
            value={formatMoney(stats.boughtTotal, settings.baseCurrency)}
            icon={ShoppingBag}
            tone="success"
          />
        )}
      </div>

      <GoalCard
        baseCurrency={settings.baseCurrency}
        goalAmount={settings.goalAmount?.toString() ?? null}
        savedAmount={settings.savedAmount?.toString() ?? null}
        activeWishlistTotal={stats.activeTotal}
      />

      <section className="space-y-3">
        <SectionHeader
          title="Recently added"
          action={
            recentItems.length > 0 && (
              <Link
                href="/items"
                className="flex items-center gap-1 text-xs font-medium text-accent-hover hover:underline"
              >
                View all <ArrowRight className="h-3 w-3" />
              </Link>
            )
          }
        />
        {recentItems.length === 0 ? (
          <EmptyState
            title="Your wishlist is empty"
            description="Paste a product link above to add your first item — or add one manually."
          />
        ) : (
          <ItemsGrid items={recentItems} />
        )}
      </section>

      {expensiveItems.length > 0 && (
        <section className="space-y-3">
          <SectionHeader title="Most expensive remaining" />
          <ItemsGrid items={expensiveItems} />
        </section>
      )}
    </div>
  );
}
