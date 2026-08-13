import { cn } from "@/lib/cn";
import { Card } from "./ui/Card";

type Tone = "accent" | "success" | "warning" | "neutral";

const TONE_CLASSES: Record<Tone, string> = {
  accent: "bg-accent-soft text-accent-hover",
  success: "bg-success-soft text-emerald-600",
  warning: "bg-warning-soft text-amber-600",
  neutral: "bg-surface-muted text-muted-foreground",
};

interface StatCardProps {
  label: string;
  value: string;
  sublabel?: string;
  icon?: React.ElementType;
  tone?: Tone;
  className?: string;
}

export function StatCard({ label, value, sublabel, icon: Icon, tone = "neutral", className }: StatCardProps) {
  return (
    <Card padding="sm" className={cn("flex flex-col gap-3", className)}>
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium text-muted-foreground">{label}</p>
        {Icon && (
          <span className={cn("flex h-8 w-8 shrink-0 items-center justify-center rounded-lg", TONE_CLASSES[tone])}>
            <Icon className="h-4 w-4" />
          </span>
        )}
      </div>
      <div>
        <p className="text-2xl font-semibold tabular-nums tracking-tight text-foreground">{value}</p>
        {sublabel && <p className="mt-0.5 text-xs text-muted-foreground">{sublabel}</p>}
      </div>
    </Card>
  );
}
