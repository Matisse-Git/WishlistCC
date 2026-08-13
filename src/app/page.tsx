import Link from "next/link";
import { Package, ShoppingBag, DollarSign } from "lucide-react";
import { getSettings } from "@/lib/settings";
import { getDashboardStats, getRecentItems, getMostExpensiveItems } from "@/lib/items";
import { formatMoney } from "@/lib/money";
import { StatCard } from "@/components/StatCard";
import { GoalCard } from "@/components/GoalCard";
import { AddItemBar } from "@/components/AddItemBar";
import { ItemsGrid } from "@/components/ItemsGrid";
import { EmptyState } from "@/components/EmptyState";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const [settings, stats, recentItems, expensiveItems] = await Promise.all([
    getSettings(),
    getDashboardStats(),
    getRecentItems(6),
    getMostExpensiveItems(5),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-slate-900">Dashboard</h1>
        <p className="text-sm text-slate-500 mt-1">
          Everything you still want, and how close you are to affording it.
        </p>
      </div>

      <AddItemBar />

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <StatCard label="Active items" value={String(stats.activeCount)} icon={Package} />
        <StatCard
          label={stats.isEstimatedTotal ? "Est. wishlist total" : "Wishlist total"}
          value={formatMoney(stats.activeTotal, settings.baseCurrency)}
          sublabel={stats.activeMissingPriceCount > 0 ? `${stats.activeMissingPriceCount} missing price` : undefined}
          icon={DollarSign}
        />
        <StatCard label="Bought items" value={String(stats.boughtCount)} icon={ShoppingBag} />
        <StatCard label="Total spent" value={formatMoney(stats.boughtTotal, settings.baseCurrency)} icon={ShoppingBag} />
      </div>

      <GoalCard
        baseCurrency={settings.baseCurrency}
        goalAmount={settings.goalAmount?.toString() ?? null}
        savedAmount={settings.savedAmount?.toString() ?? null}
        activeWishlistTotal={stats.activeTotal}
      />

      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-slate-900">Recently added</h2>
          {recentItems.length > 0 && (
            <Link href="/items" className="text-xs text-indigo-600 hover:underline">
              View all
            </Link>
          )}
        </div>
        {recentItems.length === 0 ? (
          <EmptyState
            title="Your wishlist is empty"
            description="Paste a product URL above to add your first item — or add one manually."
          />
        ) : (
          <ItemsGrid items={recentItems} />
        )}
      </section>

      {expensiveItems.length > 0 && (
        <section>
          <h2 className="text-sm font-semibold text-slate-900 mb-3">Most expensive remaining</h2>
          <ItemsGrid items={expensiveItems} />
        </section>
      )}
    </div>
  );
}
