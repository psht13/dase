import { ImageIcon, Truck } from "lucide-react";
import Link from "next/link";
import type { PublicOrderReview as PublicOrderReviewData } from "@/modules/orders/application/lookup-public-order";
import { getCustomerPaymentStatusMessage } from "@/modules/payments/application/payment-status";
import type { PaymentRetryActionResult } from "@/modules/payments/ui/payment-actions";
import { PaymentRetryForm } from "@/modules/payments/ui/payment-retry-form";
import { BrandMark } from "@/shared/ui/brand-mark";
import { Button } from "@/shared/ui/button";
import { PageHeader, PageShell } from "@/shared/ui/page-layout";
import { formatMoneyMinor } from "@/shared/utils/format-money";

type PublicOrderReviewProps = {
  deliveryHref: string;
  order: PublicOrderReviewData;
  paymentRetryAction?: () => Promise<PaymentRetryActionResult>;
};

export function PublicOrderReview({
  deliveryHref,
  order,
  paymentRetryAction,
}: PublicOrderReviewProps) {
  return (
    <PageShell contentClassName="grid gap-6 sm:gap-8" maxWidth="xl">
        <div className="grid gap-2">
          <BrandMark subtitle="підтвердження замовлення" />
          <PageHeader
            description="Перевірте товари, кількість і суму перед заповненням доставки та оплати."
            title="Ваше замовлення"
          />
        </div>

        <PaymentStatusNotice order={order} />

        {order.canRetryMonobankPayment && paymentRetryAction ? (
          <div className="rounded-md border border-accent bg-card/95 p-4 shadow-sm">
            <PaymentRetryForm action={paymentRetryAction} />
          </div>
        ) : null}

        <div className="grid gap-4">
          {order.items.map((item) => (
            <article
              className="grid min-w-0 gap-4 rounded-md border border-border/80 bg-card/95 p-4 text-card-foreground shadow-sm sm:grid-cols-[5rem_1fr_auto]"
              key={`${item.productSkuSnapshot}-${item.productNameSnapshot}`}
            >
              <PublicOrderItemImage item={item} />
              <div className="grid min-w-0 gap-1">
                <h2 className="break-words font-semibold">
                  {item.productNameSnapshot}
                </h2>
                <p className="text-sm text-muted-foreground">
                  Артикул: {item.productSkuSnapshot}
                </p>
                <p className="text-sm">Кількість: {item.quantity}</p>
                <p className="text-sm">
                  Ціна: {formatMoneyMinor(item.unitPriceMinor, order.currency)}
                </p>
              </div>
              <p className="font-semibold sm:min-w-28 sm:text-right">
                {formatMoneyMinor(item.lineTotalMinor, order.currency)}
              </p>
            </article>
          ))}
        </div>

        <div className="flex flex-col gap-4 rounded-md border border-accent bg-accent/25 p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm text-muted-foreground">Разом</p>
            <p className="font-display text-3xl font-semibold">
              {formatMoneyMinor(order.totalMinor, order.currency)}
            </p>
          </div>
          <Button asChild>
            <Link href={deliveryHref}>
              <Truck aria-hidden="true" className="size-4" />
              Перейти до доставки й оплати
            </Link>
          </Button>
        </div>
    </PageShell>
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
    <PageShell
      contentClassName="flex min-h-dvh flex-col justify-center gap-4 text-center"
      maxWidth="md"
    >
        <BrandMark
          className="justify-center"
          subtitle="підтвердження замовлення"
        />
        <PageHeader
          className="items-center text-center sm:items-center"
          description="Замовлення не знайдено, посилання вже неактивне або термін його дії завершився."
          title="Посилання недоступне"
        />
    </PageShell>
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
