import { cn } from "@/lib/cn";

interface PageLayoutProps {
  children: React.ReactNode;
  rail?: React.ReactNode;
  className?: string;
}

/**
 * Two-column page shell: primary content on the left, a sticky rail on the
 * right for secondary widgets (filters, stats, add-item bar, goal card) so
 * they sit beside the content instead of stacking above it. Falls back to a
 * single column with no rail column reserved when a page has no rail content.
 */
export function PageLayout({ children, rail, className }: PageLayoutProps) {
  if (!rail) {
    return <div className={cn("space-y-6", className)}>{children}</div>;
  }

  return (
    <div
      className={cn(
        "grid grid-cols-1 items-start gap-6 lg:grid-cols-[minmax(0,1fr)_320px] xl:grid-cols-[minmax(0,1fr)_360px]",
        className
      )}
    >
      <div className="min-w-0 space-y-6">{children}</div>
      <aside className="space-y-5 lg:sticky lg:top-8">{rail}</aside>
    </div>
  );
}
