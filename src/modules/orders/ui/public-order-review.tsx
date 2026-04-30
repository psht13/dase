import { ImageIcon, Truck } from "lucide-react";
import Link from "next/link";
import type { PublicOrderReview as PublicOrderReviewData } from "@/modules/orders/application/lookup-public-order";
import { getCustomerPaymentStatusMessage } from "@/modules/payments/application/payment-status";
import { BrandMark } from "@/shared/ui/brand-mark";
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
    <main
      className="min-h-screen bg-[hsl(var(--brand-shell))]"
      id="main-content"
    >
      <section className="mx-auto grid w-full max-w-4xl gap-8 px-5 py-10">
        <div className="grid gap-2">
          <BrandMark subtitle="підтвердження замовлення" />
          <h1 className="font-display text-4xl font-semibold">
            Ваше замовлення
          </h1>
          <p className="text-sm text-muted-foreground">
            Перевірте товари, кількість і суму перед заповненням доставки та
            оплати.
          </p>
        </div>

        <PaymentStatusNotice order={order} />

        <div className="grid gap-4">
          {order.items.map((item) => (
            <article
              className="grid gap-4 rounded-md border border-border/80 bg-card/95 p-4 text-card-foreground shadow-sm sm:grid-cols-[5rem_1fr_auto]"
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

        <div className="flex flex-col gap-4 rounded-md border border-accent bg-accent/25 p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm text-muted-foreground">Разом</p>
            <p className="font-display text-3xl font-semibold">
              {formatPrice(order.totalMinor, order.currency)}
            </p>
          </div>
          <Button asChild>
            <Link href={deliveryHref}>
              <Truck aria-hidden="true" className="size-4" />
              Перейти до доставки й оплати
            </Link>
          </Button>
        </div>
      </section>
    </main>
  );
}

function PaymentStatusNotice({ order }: { order: PublicOrderReviewData }) {
  const message = getCustomerPaymentStatusMessage(order.status, {
    provider: order.paymentProvider,
    status: order.paymentStatus,
  });

  if (!message) {
    return null;
  }

  return (
    <p
      aria-live="polite"
      className="rounded-md border border-accent bg-accent/25 px-4 py-3 text-sm text-foreground shadow-sm"
      role="status"
    >
      {message}
    </p>
  );
}

export function PublicOrderUnavailable() {
  return (
    <main
      className="min-h-screen bg-[hsl(var(--brand-shell))]"
      id="main-content"
    >
      <section className="mx-auto flex min-h-screen w-full max-w-xl flex-col justify-center gap-4 px-5 py-10 text-center">
        <BrandMark
          className="justify-center"
          subtitle="підтвердження замовлення"
        />
        <h1 className="font-display text-4xl font-semibold">
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
      <div className="flex size-20 items-center justify-center rounded-md border border-input bg-muted">
        <ImageIcon
          aria-hidden="true"
          className="size-7 text-muted-foreground"
        />
      </div>
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      alt={item.productNameSnapshot}
      className="size-20 rounded-md border border-input object-cover"
      height="80"
      loading="lazy"
      src={imageUrl}
      width="80"
    />
  );
}

function formatPrice(priceMinor: number, currency: string): string {
  return new Intl.NumberFormat("uk-UA", {
    currency,
    style: "currency",
  }).format(priceMinor / 100);
}
