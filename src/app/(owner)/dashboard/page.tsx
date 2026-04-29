import { Package, ShoppingBag } from "lucide-react";
import Link from "next/link";
import { Button } from "@/shared/ui/button";

export default function DashboardPage() {
  return (
    <div className="grid gap-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-normal">
            Панель власника
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Керуйте товарами, посиланнями замовлень і виконанням доставок.
          </p>
        </div>
        <Button asChild>
          <Link href="/dashboard/products/new">
            <Package aria-hidden="true" className="size-4" />
            Додати товар
          </Link>
        </Button>
      </div>

      <section className="grid gap-4 sm:grid-cols-2">
        <Link
          className="rounded-md border p-5 transition-colors hover:bg-accent"
          href="/dashboard/products"
        >
          <Package
            aria-hidden="true"
            className="size-5 text-muted-foreground"
          />
          <h2 className="mt-4 text-lg font-semibold">Каталог товарів</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Додавайте вироби, ціни, залишки та посилання на зображення.
          </p>
        </Link>

        <Link
          className="rounded-md border p-5 transition-colors hover:bg-accent"
          href="/dashboard/orders"
        >
          <ShoppingBag
            aria-hidden="true"
            className="size-5 text-muted-foreground"
          />
          <h2 className="mt-4 text-lg font-semibold">
            Замовлення
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Фільтруйте замовлення, керуйте статусами, тегами та відправленнями.
          </p>
        </Link>
      </section>
    </div>
  );
}
