import { cn } from "@/lib/cn";
import { Card } from "./Card";

interface SettingsSectionProps {
  title: string;
  description?: string;
  children: React.ReactNode;
  danger?: boolean;
  icon?: React.ElementType;
  footer?: React.ReactNode;
  className?: string;
  id?: string;
}

export function SettingsSection({
  title,
  description,
  children,
  danger = false,
  icon: Icon,
  footer,
  className,
  id,
}: SettingsSectionProps) {
  return (
    <Card
      id={id}
      padding="lg"
      className={cn("scroll-mt-8 space-y-5", danger && "border-destructive/30 bg-destructive-soft/40", className)}
    >
      <div>
        <h2 className={cn("flex items-center gap-1.5 text-sm font-semibold", danger ? "text-rose-700" : "text-foreground")}>
          {Icon && <Icon className="h-4 w-4" />}
          {title}
        </h2>
        {description && <p className="mt-1 text-sm text-muted-foreground">{description}</p>}
      </div>
      {children}
      {footer && <div className="flex justify-end gap-2 border-t border-border pt-4">{footer}</div>}
    </Card>
  );
}
