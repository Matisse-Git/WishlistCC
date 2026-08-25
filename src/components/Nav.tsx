"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, ListChecks, Layers, ShoppingBag, Settings, Gift } from "lucide-react";
import { cn } from "@/lib/cn";

const LINKS = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/items", label: "Wishlist", icon: ListChecks },
  { href: "/groups", label: "Groups", icon: Layers },
  { href: "/bought", label: "Bought", icon: ShoppingBag },
  { href: "/settings", label: "Settings", icon: Settings },
] as const;

function isActive(pathname: string, href: string) {
  return href === "/" ? pathname === "/" : pathname.startsWith(href);
}

function Brand({ iconClassName, className }: { iconClassName?: string; className?: string }) {
  return (
    <Link href="/" className={cn("flex items-center gap-2 font-semibold text-foreground", className)}>
      <span
        className={cn(
          "flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-accent to-violet-500 text-white shadow-sm",
          iconClassName
        )}
      >
        <Gift className="h-4.5 w-4.5" />
      </span>
      <span className="text-[15px] tracking-tight">WishListCC</span>
    </Link>
  );
}

export function Nav() {
  const pathname = usePathname();

  return (
    <>
      {/* Desktop sidebar — primary navigation lives on the side so the top of
          every page is free for actual content instead of a header bar. */}
      <aside className="hidden shrink-0 flex-col border-r border-border bg-surface sm:sticky sm:top-0 sm:flex sm:h-screen sm:w-60">
        <div className="flex h-16 shrink-0 items-center border-b border-border px-5">
          <Brand />
        </div>
        <nav className="flex flex-1 flex-col gap-1 overflow-y-auto p-3">
          {LINKS.map(({ href, label, icon: Icon }) => {
            const active = isActive(pathname, href);
            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  "flex items-center gap-2.5 rounded-xl px-3.5 py-2.5 text-sm font-medium transition-colors duration-150",
                  active
                    ? "bg-accent-soft text-accent-hover"
                    : "text-muted-foreground hover:bg-surface-muted hover:text-foreground"
                )}
              >
                <Icon className="h-4.5 w-4.5" />
                {label}
              </Link>
            );
          })}
        </nav>
      </aside>

      {/* Mobile top bar — just branding; primary nav is the bottom tab bar. */}
      <header className="sticky top-0 z-40 flex h-14 shrink-0 items-center border-b border-border bg-surface/80 px-4 backdrop-blur-md sm:hidden">
        <Brand iconClassName="h-7 w-7 rounded-lg" />
      </header>

      {/* Mobile bottom tab bar */}
      <nav className="fixed inset-x-0 bottom-0 z-40 flex border-t border-border bg-surface/95 backdrop-blur-md pb-[env(safe-area-inset-bottom)] sm:hidden">
        {LINKS.map(({ href, label, icon: Icon }) => {
          const active = isActive(pathname, href);
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex flex-1 flex-col items-center gap-1 py-2.5 text-[11px] font-medium transition-colors duration-150",
                active ? "text-accent-hover" : "text-muted-foreground"
              )}
            >
              <Icon className={cn("h-5 w-5", active && "fill-accent-soft")} strokeWidth={active ? 2.25 : 2} />
              {label}
            </Link>
          );
        })}
      </nav>
    </>
  );
}
