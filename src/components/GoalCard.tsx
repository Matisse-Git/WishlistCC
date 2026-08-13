import { PartyPopper, Target } from "lucide-react";
import { formatMoney, formatPercent } from "@/lib/money";
import Decimal from "decimal.js";
import { Card } from "./ui/Card";
import { Progress } from "./ui/Progress";
import { Badge } from "./ui/Badge";

interface GoalCardProps {
  baseCurrency: string;
  goalAmount: string | null;
  savedAmount: string | null;
  activeWishlistTotal: string;
  className?: string;
}

export function GoalCard({ baseCurrency, goalAmount, savedAmount, activeWishlistTotal, className }: GoalCardProps) {
  if (!goalAmount) {
    return (
      <Card className={className}>
        <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
          <Target className="h-4 w-4" />
          Savings goal
        </div>
        <p className="mt-2 text-sm text-muted-foreground">
          No goal set yet.{" "}
          <a href="/settings" className="font-medium text-accent-hover hover:underline">
            Set one in Settings
          </a>
          .
        </p>
      </Card>
    );
  }

  const goal = new Decimal(goalAmount);
  const saved = new Decimal(savedAmount || "0");
  const ratio = goal.isZero() ? 0 : Math.min(1, saved.dividedBy(goal).toNumber());
  const remaining = Decimal.max(0, goal.minus(saved));
  const reached = saved.greaterThanOrEqualTo(goal);
  const remainingWishlist = Decimal.max(0, new Decimal(activeWishlistTotal).minus(saved));

  return (
    <Card className={className}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
          <Target className="h-4 w-4" />
          Savings goal
        </div>
        {reached && (
          <Badge tone="success">
            <PartyPopper className="h-3 w-3" />
            Goal reached
          </Badge>
        )}
      </div>

      <div className="mt-2 flex items-baseline gap-2">
        <span className="text-2xl font-semibold tabular-nums tracking-tight text-foreground">
          {formatMoney(saved, baseCurrency)}
        </span>
        <span className="text-sm text-muted-foreground">of {formatMoney(goal, baseCurrency)}</span>
      </div>

      <Progress
        value={ratio * 100}
        className="mt-3"
        barClassName={reached ? "bg-success" : "bg-gradient-to-r from-accent to-violet-500"}
      />

      <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
        <span className="font-medium text-foreground">{formatPercent(ratio)} funded</span>
        {!reached && <span>{formatMoney(remaining, baseCurrency)} remaining</span>}
        {remainingWishlist.greaterThan(0) && (
          <span>{formatMoney(remainingWishlist, baseCurrency)} of wishlist still unfunded</span>
        )}
      </div>
    </Card>
  );
}
