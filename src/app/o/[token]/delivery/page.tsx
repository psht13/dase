import Link from "next/link";
import { lookupPublicOrderUseCase } from "@/modules/orders/application/lookup-public-order";
import { getOrderRepository } from "@/modules/orders/infrastructure/order-repository-factory";
import { PublicOrderUnavailable } from "@/modules/orders/ui/public-order-review";
import { Button } from "@/shared/ui/button";

type PublicDeliveryPageProps = {
  params: Promise<{
    token: string;
  }>;
};

export default async function PublicDeliveryPage({
  params,
}: PublicDeliveryPageProps) {
  const { token } = await params;
  const result = await lookupPublicOrderUseCase(
    {
      publicToken: token,
    },
    {
      orderRepository: getOrderRepository(),
    },
  );

  if (!result.available) {
    return <PublicOrderUnavailable />;
  }

  return (
    <main className="min-h-screen bg-background">
      <section className="mx-auto grid w-full max-w-3xl gap-6 px-5 py-10">
        <div className="grid gap-2">
          <p className="text-sm font-medium uppercase text-muted-foreground">
            Dase
          </p>
          <h1 className="text-3xl font-semibold tracking-normal">
            Доставка та оплата
          </h1>
          <p className="text-sm text-muted-foreground">
            Форма підтвердження буде підключена на наступному етапі. Товари й
            сума замовлення вже зафіксовані.
          </p>
        </div>

        <div className="grid gap-4 rounded-md border bg-card p-4 text-card-foreground">
          <label className="grid gap-2 text-sm font-medium">
            Повне ім’я
            <input
              className="h-10 rounded-md border border-input bg-background px-3 text-sm"
              disabled
              placeholder="Ім’я та прізвище"
            />
          </label>
          <label className="grid gap-2 text-sm font-medium">
            Телефон
            <input
              className="h-10 rounded-md border border-input bg-background px-3 text-sm"
              disabled
              placeholder="+380"
            />
          </label>
          <label className="grid gap-2 text-sm font-medium">
            Спосіб доставки
            <select
              className="h-10 rounded-md border border-input bg-background px-3 text-sm"
              disabled
            >
              <option>Нова Пошта</option>
              <option>Укрпошта</option>
            </select>
          </label>
          <label className="grid gap-2 text-sm font-medium">
            Спосіб оплати
            <select
              className="h-10 rounded-md border border-input bg-background px-3 text-sm"
              disabled
            >
              <option>MonoPay</option>
              <option>Післяплата</option>
            </select>
          </label>
        </div>

        <div className="flex justify-between gap-3">
          <Button asChild variant="outline">
            <Link href={`/o/${result.order.publicToken}`}>Назад</Link>
          </Button>
          <Button disabled type="button">
            Підтвердити замовлення
          </Button>
        </div>
      </section>
    </main>
  );
}
