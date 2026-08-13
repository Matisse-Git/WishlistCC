import { cn } from "@/lib/cn";

type Tone = "neutral" | "accent" | "success" | "warning" | "destructive";

const TONE_CLASSES: Record<Tone, string> = {
  neutral: "bg-surface-muted text-muted-foreground",
  accent: "bg-accent-soft text-accent-hover",
  success: "bg-success-soft text-emerald-700",
  warning: "bg-warning-soft text-amber-700",
  destructive: "bg-destructive-soft text-rose-700",
};

interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  tone?: Tone;
}

export function Badge({ tone = "neutral", className, children, ...rest }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium whitespace-nowrap",
        TONE_CLASSES[tone],
        className
      )}
      {...rest}
    >
      {children}
    </span>
  );
}
