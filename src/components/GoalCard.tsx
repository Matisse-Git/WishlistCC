import { Target } from "lucide-react";
import { formatMoney, formatPercent } from "@/lib/money";
import Decimal from "decimal.js";

interface GoalCardProps {
  baseCurrency: string;
  goalAmount: string | null;
  savedAmount: string | null;
  activeWishlistTotal: string;
}

export function GoalCard({ baseCurrency, goalAmount, savedAmount, activeWishlistTotal }: GoalCardProps) {
  if (!goalAmount) {
    return (
      <div className="bg-white border border-slate-200 rounded-xl p-4">
        <div className="flex items-center gap-1.5 text-xs font-medium text-slate-500">
          <Target className="h-4 w-4 text-slate-300" />
          Savings goal
        </div>
        <p className="text-sm text-slate-400 mt-2">
          No goal set yet.{" "}
          <a href="/settings" className="text-indigo-600 hover:underline">
            Set one in Settings
          </a>
          .
        </p>
      </div>
    );
  }

  const goal = new Decimal(goalAmount);
  const saved = new Decimal(savedAmount || "0");
  const ratio = goal.isZero() ? 0 : Math.min(1, saved.dividedBy(goal).toNumber());
  const remaining = Decimal.max(0, goal.minus(saved));
  const reached = saved.greaterThanOrEqualTo(goal);
  const remainingWishlist = Decimal.max(0, new Decimal(activeWishlistTotal).minus(saved));

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-4 sm:col-span-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-xs font-medium text-slate-500">
          <Target className="h-4 w-4 text-slate-300" />
          Savings goal
        </div>
        {reached && (
          <span className="text-xs font-medium text-emerald-700 bg-emerald-50 rounded-full px-2 py-0.5">
            Goal reached 🎉
          </span>
        )}
      </div>

      <div className="mt-2 flex items-baseline gap-2">
        <span className="text-2xl font-semibold text-slate-900">{formatMoney(saved, baseCurrency)}</span>
        <span className="text-sm text-slate-400">of {formatMoney(goal, baseCurrency)}</span>
      </div>

      <div className="mt-2 h-2 rounded-full bg-slate-100 overflow-hidden">
        <div
          className="h-full bg-indigo-600 rounded-full transition-all"
          style={{ width: `${ratio * 100}%` }}
        />
      </div>

      <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500">
        <span>{formatPercent(ratio)} funded</span>
        {!reached && <span>{formatMoney(remaining, baseCurrency)} remaining</span>}
        {remainingWishlist.greaterThan(0) && (
          <span>{formatMoney(remainingWishlist, baseCurrency)} of wishlist still unfunded</span>
        )}
      </div>
    </div>
  );
}
