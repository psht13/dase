"use client";

import {
  LayoutDashboard,
  LogOut,
  type LucideIcon,
  Package,
  Settings,
  ShoppingBag,
  ShoppingCart,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { BrandMark } from "@/shared/ui/brand-mark";
import { cn } from "@/shared/utils/cn";

type NavigationItem = {
  href: string;
  icon: LucideIcon;
  label: string;
  shortLabel: string;
};

const navigationItems: NavigationItem[] = [
  {
    href: "/dashboard",
    icon: LayoutDashboard,
    label: "Огляд",
    shortLabel: "Огляд",
  },
  {
    href: "/dashboard/products",
    icon: Package,
    label: "Каталог товарів",
    shortLabel: "Каталог",
  },
  {
    href: "/dashboard/orders",
    icon: ShoppingBag,
    label: "Замовлення",
    shortLabel: "Замовлення",
  },
  {
    href: "/dashboard/orders/new",
    icon: ShoppingCart,
    label: "Створити замовлення",
    shortLabel: "Створити",
  },
  {
    href: "/dashboard/settings/payment",
    icon: Settings,
    label: "Налаштування",
    shortLabel: "Налашт.",
  },
];

type DashboardShellProps = {
  children: ReactNode;
  ownerEmail: string;
};

export function DashboardShell({ children, ownerEmail }: DashboardShellProps) {
  const pathname = normalizePathname(usePathname());
  const currentItem = getCurrentNavigationItem(pathname);

  return (
    <main
      className="min-h-dvh overflow-x-clip bg-[hsl(var(--brand-shell))]"
      id="main-content"
    >
      <div className="grid min-h-dvh w-full min-w-0 lg:grid-cols-[17rem_minmax(0,1fr)]">
        <DesktopSidebar currentHref={currentItem.href} />

        <section className="min-w-0">
          <MobileDashboardHeader
            currentItem={currentItem}
            ownerEmail={ownerEmail}
          />
          <DesktopAccountHeader ownerEmail={ownerEmail} />
          <div className="mx-auto w-full max-w-6xl min-w-0 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
            {children}
          </div>
        </section>
      </div>
    </main>
  );
}

function DesktopSidebar({ currentHref }: { currentHref: string }) {
  return (
    <aside className="hidden border-r border-border/80 bg-[hsl(var(--brand-blush))] px-5 py-5 lg:sticky lg:top-0 lg:flex lg:h-dvh lg:flex-col">
      <Link
        className="inline-flex rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        href="/dashboard"
      >
        <BrandMark subtitle="ювелірний кабінет" />
      </Link>
      <nav aria-label="Основна навігація кабінету" className="mt-8 grid gap-1">
        {navigationItems.map((item) => (
          <DashboardNavLink
            current={currentHref === item.href}
            item={item}
            key={item.href}
            variant="desktop"
          />
        ))}
      </nav>
    </aside>
  );
}

function DesktopAccountHeader({ ownerEmail }: { ownerEmail: string }) {
  return (
    <header className="hidden border-b border-border/80 bg-card/90 px-8 py-4 shadow-sm lg:block">
      <div className="mx-auto flex max-w-6xl min-w-0 items-center justify-between gap-6">
        <div className="min-w-0">
          <p className="text-sm text-muted-foreground">Кабінет власника</p>
          <p className="break-words font-medium">{ownerEmail}</p>
        </div>
        <div className="flex shrink-0 items-center gap-3">
          <p className="text-sm text-muted-foreground">Роль: власник</p>
          <LogoutForm />
        </div>
      </div>
    </header>
  );
}

function MobileDashboardHeader({
  currentItem,
  ownerEmail,
}: {
  currentItem: NavigationItem;
  ownerEmail: string;
}) {
  return (
    <header className="sticky top-0 z-30 border-b border-border/80 bg-card/95 px-3 pb-3 pt-3 shadow-sm backdrop-blur lg:hidden">
      <div className="flex min-w-0 items-center justify-between gap-3">
        <Link
          className="min-w-0 rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          href="/dashboard"
        >
          <BrandMark
            className="gap-2"
            markClassName="size-10 text-xs"
            subtitle="кабінет"
          />
        </Link>
        <LogoutForm />
      </div>

      <div className="mt-3 flex min-w-0 items-center justify-between gap-3 rounded-md border border-border bg-background/85 px-3 py-2">
        <div className="min-w-0">
          <p className="text-xs font-medium uppercase tracking-normal text-muted-foreground">
            Поточний розділ
          </p>
          <p className="truncate text-sm font-semibold">{currentItem.label}</p>
        </div>
        <p className="max-w-[9rem] truncate text-xs text-muted-foreground">
          {ownerEmail}
        </p>
      </div>

      <nav
        aria-label="Розділи кабінету"
        className="mt-3 grid grid-cols-5 gap-1"
        data-testid="mobile-dashboard-nav"
      >
        {navigationItems.map((item) => (
          <DashboardNavLink
            current={currentItem.href === item.href}
            item={item}
            key={item.href}
            variant="mobile"
          />
        ))}
      </nav>
    </header>
  );
}

function DashboardNavLink({
  current,
  item,
  variant,
}: {
  current: boolean;
  item: NavigationItem;
  variant: "desktop" | "mobile";
}) {
  const Icon = item.icon;

  return (
    <Link
      aria-current={current ? "page" : undefined}
      aria-label={item.label}
      className={cn(
        "group rounded-md border border-transparent font-medium text-foreground/85 transition-colors hover:border-border hover:bg-background/85 hover:text-foreground",
        current &&
          "border-border bg-background text-foreground shadow-sm ring-1 ring-border/70",
        variant === "desktop" &&
          "flex min-h-11 items-center gap-3 px-3 py-2.5 text-sm",
        variant === "mobile" &&
          "grid min-h-12 place-items-center gap-1 px-1 py-2 text-center text-[0.7rem] leading-tight",
      )}
      href={item.href}
    >
      <Icon
        aria-hidden="true"
        className={cn(
          "size-4 text-muted-foreground transition-colors group-hover:text-[hsl(var(--brand-gold))]",
          current && "text-[hsl(var(--brand-gold))]",
        )}
      />
      <span>{variant === "mobile" ? item.shortLabel : item.label}</span>
    </Link>
  );
}

function LogoutForm() {
  return (
    <form action="/logout" method="post">
      <button
        className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md border border-border bg-background px-3 py-2 text-sm font-medium transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        type="submit"
      >
        <LogOut aria-hidden="true" className="size-4" />
        Вийти
      </button>
    </form>
  );
}

function normalizePathname(pathname: string | null): string {
  if (!pathname || pathname === "/") {
    return "/dashboard";
  }

  return pathname.endsWith("/") ? pathname.slice(0, -1) : pathname;
}

function getCurrentNavigationItem(pathname: string): NavigationItem {
  const exactMatch = navigationItems.find((item) => item.href === pathname);

  if (exactMatch) {
    return exactMatch;
  }

  const prefixMatch = [...navigationItems]
    .sort((a, b) => b.href.length - a.href.length)
    .find(
      (item) => item.href !== "/dashboard" && pathname.startsWith(`${item.href}/`),
    );

  return prefixMatch ?? navigationItems[0];
}
