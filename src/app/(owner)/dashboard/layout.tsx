import {
  LayoutDashboard,
  LogOut,
  Package,
  ShoppingBag,
  ShoppingCart,
} from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import { requireOwnerSession } from "@/modules/users/ui/require-owner-session";
import { BrandMark } from "@/shared/ui/brand-mark";

const navigationItems = [
  {
    href: "/dashboard",
    icon: LayoutDashboard,
    label: "Огляд",
  },
  {
    href: "/dashboard/products",
    icon: Package,
    label: "Каталог товарів",
  },
  {
    href: "/dashboard/orders",
    icon: ShoppingBag,
    label: "Замовлення",
  },
  {
    href: "/dashboard/orders/new",
    icon: ShoppingCart,
    label: "Створити замовлення",
  },
];

export default async function DashboardLayout({
  children,
}: {
  children: ReactNode;
}) {
  const owner = await requireOwnerSession();

  return (
    <main
      className="min-h-screen bg-[hsl(var(--brand-shell))]"
      id="main-content"
    >
      <div className="grid min-h-screen w-full md:grid-cols-[17rem_minmax(0,1fr)]">
        <aside className="border-b border-border/80 bg-[hsl(var(--brand-blush))] px-5 py-5 md:sticky md:top-0 md:h-screen md:border-b-0 md:border-r">
          <Link
            className="inline-flex rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            href="/dashboard"
          >
            <BrandMark subtitle="ювелірний кабінет" />
          </Link>
          <nav className="mt-8 grid gap-1">
            {navigationItems.map((item) => {
              const Icon = item.icon;

              return (
                <Link
                  className="group flex items-center gap-3 rounded-md border border-transparent px-3 py-2.5 text-sm font-medium text-foreground/85 transition-colors hover:border-border hover:bg-background/85 hover:text-foreground"
                  href={item.href}
                  key={item.href}
                >
                  <Icon
                    aria-hidden="true"
                    className="size-4 text-muted-foreground transition-colors group-hover:text-[hsl(var(--brand-gold))]"
                  />
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </aside>

        <section className="min-w-0">
          <header className="border-b border-border/80 bg-card/90 px-5 py-4 shadow-sm sm:px-8">
            <div className="mx-auto flex max-w-6xl flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm text-muted-foreground">
                  Кабінет власника
                </p>
                <p className="font-medium">{owner.email}</p>
              </div>
              <div className="flex items-center gap-3">
                <p className="text-sm text-muted-foreground">Роль: власник</p>
                <Link
                  className="inline-flex items-center gap-2 rounded-md border border-border bg-background px-3 py-2 text-sm font-medium transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  href="/logout"
                >
                  <LogOut aria-hidden="true" className="size-4" />
                  Вийти
                </Link>
              </div>
            </div>
          </header>
          <div className="mx-auto w-full max-w-6xl px-5 py-7 sm:px-8">
            {children}
          </div>
        </section>
      </div>
    </main>
  );
}
