import { ImageIcon, Truck } from "lucide-react";
import Link from "next/link";
import type { PublicOrderReview as PublicOrderReviewData } from "@/modules/orders/application/lookup-public-order";
import { getCustomerPaymentStatusMessage } from "@/modules/payments/application/payment-status";
import { Button } from "@/shared/ui/button";

type PublicOrderReviewProps = {
  deliveryHref: string;
  order: PublicOrderReviewData;
};

export function PublicOrderReview({
  deliveryHref,
  order,
}: PublicOrderReviewProps) {
  return (
    <main className="min-h-screen bg-background">
      <section className="mx-auto grid w-full max-w-4xl gap-8 px-5 py-10">
        <div className="grid gap-2">
          <p className="text-sm font-medium uppercase text-muted-foreground">
            Dase
          </p>
          <h1 className="text-3xl font-semibold tracking-normal">
            Ваше замовлення
          </h1>
          <p className="text-sm text-muted-foreground">
            Перевірте товари, кількість і суму перед заповненням доставки та
            оплати.
          </p>
        </div>

        <PaymentStatusNotice status={order.status} />

        <div className="grid gap-4">
          {order.items.map((item) => (
            <article
              className="grid gap-4 rounded-md border bg-card p-4 text-card-foreground sm:grid-cols-[5rem_1fr_auto]"
              key={`${item.productSkuSnapshot}-${item.productNameSnapshot}`}
            >
              <PublicOrderItemImage item={item} />
              <div className="grid gap-1">
                <h2 className="font-semibold">{item.productNameSnapshot}</h2>
                <p className="text-sm text-muted-foreground">
                  Артикул: {item.productSkuSnapshot}
                </p>
                <p className="text-sm">Кількість: {item.quantity}</p>
                <p className="text-sm">
                  Ціна: {formatPrice(item.unitPriceMinor, order.currency)}
                </p>
              </div>
              <p className="text-right font-semibold sm:min-w-28">
                {formatPrice(item.lineTotalMinor, order.currency)}
              </p>
            </article>
          ))}
        </div>

        <div className="flex flex-col gap-4 rounded-md border bg-muted/40 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm text-muted-foreground">Разом</p>
            <p className="text-2xl font-semibold tracking-normal">
              {formatPrice(order.totalMinor, order.currency)}
            </p>
          </div>
          <Button asChild>
            <Link href={deliveryHref}>
              <Truck className="size-4" />
              Перейти до доставки й оплати
            </Link>
          </Button>
        </div>
      </section>
    </main>
  );
}

function PaymentStatusNotice({ status }: { status: string }) {
  const message = getCustomerPaymentStatusMessage(status);

  if (!message) {
    return null;
  }

  return (
    <p className="rounded-md border border-primary/20 bg-primary/5 px-4 py-3 text-sm text-foreground">
      {message}
    </p>
  );
}

export function PublicOrderUnavailable() {
  return (
    <main className="min-h-screen bg-background">
      <section className="mx-auto flex min-h-screen w-full max-w-xl flex-col justify-center gap-4 px-5 py-10 text-center">
        <p className="text-sm font-medium uppercase text-muted-foreground">
          Dase
        </p>
        <h1 className="text-3xl font-semibold tracking-normal">
          Посилання недоступне
        </h1>
        <p className="text-muted-foreground">
          Замовлення не знайдено, посилання вже неактивне або термін його дії
          завершився.
        </p>
      </section>
    </main>
  );
}

function PublicOrderItemImage({
  item,
}: {
  item: PublicOrderReviewData["items"][number];
}) {
  const imageUrl = item.productImageUrlsSnapshot[0];

  if (!imageUrl) {
    return (
      <div className="flex size-20 items-center justify-center rounded-md bg-muted">
        <ImageIcon className="size-7 text-muted-foreground" />
      </div>
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      alt={item.productNameSnapshot}
      className="size-20 rounded-md object-cover"
      src={imageUrl}
    />
  );
}

function formatPrice(priceMinor: number, currency: string): string {
  return new Intl.NumberFormat("uk-UA", {
    currency,
    style: "currency",
  }).format(priceMinor / 100);
}
