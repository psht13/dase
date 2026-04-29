import { Gem, LayoutDashboard, Package, ShoppingCart } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import { requireOwnerSession } from "@/modules/users/ui/require-owner-session";

export default async function DashboardLayout({
  children,
}: {
  children: ReactNode;
}) {
  const owner = await requireOwnerSession();

  return (
    <main className="min-h-screen bg-background">
      <div className="mx-auto grid min-h-screen w-full max-w-7xl md:grid-cols-[16rem_1fr]">
        <aside className="border-b bg-muted/30 px-5 py-4 md:border-b-0 md:border-r">
          <Link
            className="flex items-center gap-2 text-lg font-semibold"
            href="/dashboard"
          >
            <Gem className="size-5" />
            Dase
          </Link>
          <nav className="mt-6 grid gap-1">
            <Link
              className="flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium hover:bg-accent"
              href="/dashboard"
            >
              <LayoutDashboard className="size-4" />
              Огляд
            </Link>
            <Link
              className="flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium hover:bg-accent"
              href="/dashboard/products"
            >
              <Package className="size-4" />
              Каталог товарів
            </Link>
            <Link
              className="flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium hover:bg-accent"
              href="/dashboard/orders/new"
            >
              <ShoppingCart className="size-4" />
              Створити замовлення
            </Link>
          </nav>
        </aside>

        <section className="min-w-0">
          <header className="flex flex-col gap-1 border-b px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Кабінет власника</p>
              <p className="font-medium">{owner.email}</p>
            </div>
            <p className="text-sm text-muted-foreground">Роль: власник</p>
          </header>
          <div className="px-5 py-6">{children}</div>
        </section>
      </div>
    </main>
  );
}
