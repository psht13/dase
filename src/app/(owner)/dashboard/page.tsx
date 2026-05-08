import { AlertTriangle, CreditCard, Package, ShoppingBag } from "lucide-react";
import Link from "next/link";
import { listActivePaymentRequisitesForOwnerUseCase } from "@/modules/payments/application/manage-payment-requisites";
import { getPaymentRequisiteRepository } from "@/modules/payments/infrastructure/payment-requisite-repository-factory";
import { requireOwnerSession } from "@/modules/users/ui/require-owner-session";
import { Button } from "@/shared/ui/button";
import { PageHeader } from "@/shared/ui/page-layout";

export default async function DashboardPage() {
  const owner = await requireOwnerSession();
  const activePaymentRequisites =
    await listActivePaymentRequisitesForOwnerUseCase(
      {
        ownerId: owner.id,
      },
      {
        paymentRequisiteRepository: getPaymentRequisiteRepository(),
      },
    );

  return (
    <div className="grid min-w-0 gap-6">
      <PageHeader
        actions={
          <Button asChild>
            <Link href="/dashboard/products/new">
              <Package aria-hidden="true" className="size-4" />
              Додати товар
            </Link>
          </Button>
        }
        description="Керуйте товарами, посиланнями замовлень і виконанням доставок."
        title="Панель власника"
        titleClassName="sm:text-3xl"
      />

      {!activePaymentRequisites.length ? (
        <section className="grid min-w-0 gap-4 rounded-md border border-amber-200 bg-amber-50 p-4 text-amber-950 shadow-sm sm:grid-cols-[auto_minmax(0,1fr)_auto] sm:items-center">
          <AlertTriangle aria-hidden="true" className="size-5" />
          <div className="min-w-0">
            <h2 className="font-semibold">
              Немає активних реквізитів для оплати картою
            </h2>
            <p className="mt-1 text-sm">
              Покупці не зможуть обрати оплату картою онлайн, доки ви не
              додасте або не увімкнете реквізити.
            </p>
          </div>
          <Button asChild className="w-full sm:w-auto" variant="outline">
            <Link href="/dashboard/settings/payment">
              <CreditCard aria-hidden="true" className="size-4" />
              Налаштувати оплату
            </Link>
          </Button>
        </section>
      ) : null}

      <section className="grid min-w-0 gap-4 sm:grid-cols-2">
        <Link
          className="min-w-0 rounded-md border border-border/80 bg-card/95 p-5 shadow-sm transition-colors hover:bg-accent/30"
          href="/dashboard/products"
        >
          <Package
            aria-hidden="true"
            className="size-5 text-muted-foreground"
          />
          <h2 className="mt-4 font-display text-xl font-semibold">
            Каталог товарів
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Додавайте вироби, ціни, залишки та посилання на зображення.
          </p>
        </Link>

        <Link
          className="min-w-0 rounded-md border border-border/80 bg-card/95 p-5 shadow-sm transition-colors hover:bg-accent/30"
          href="/dashboard/orders"
        >
          <ShoppingBag
            aria-hidden="true"
            className="size-5 text-muted-foreground"
          />
          <h2 className="mt-4 font-display text-xl font-semibold">
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
