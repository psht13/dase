import { CheckCircle2, ImageIcon, Truck } from "lucide-react";
import Link from "next/link";
import type {
  PublicOrderReview as PublicOrderReviewData,
  PublicOrderStatus as PublicOrderStatusData,
} from "@/modules/orders/application/lookup-public-order";
import { BrandMark } from "@/shared/ui/brand-mark";
import { Button } from "@/shared/ui/button";
import { ActionBar, PageHeader, PageShell } from "@/shared/ui/page-layout";
import { formatMoneyMinor } from "@/shared/utils/format-money";

type PublicOrderReviewProps = {
  deliveryHref: string;
  order: PublicOrderReviewData;
};

export function PublicOrderReview({
  deliveryHref,
  order,
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
        <ActionBar>
          <Button asChild>
            <Link href={deliveryHref}>
              <Truck aria-hidden="true" className="size-4" />
              Перейти до доставки й оплати
            </Link>
          </Button>
        </ActionBar>
      </div>
    </PageShell>
  );
}

export function PublicOrderStatus({
  order,
}: {
  order: PublicOrderStatusData;
}) {
  return (
    <PageShell contentClassName="grid gap-6 sm:gap-8" maxWidth="lg">
      <div className="grid gap-2">
        <BrandMark subtitle="статус замовлення" />
        <PageHeader
          description="Ваші дані вже передані продавцю. Повторно заповнювати форму не потрібно."
          title={`Замовлення ${order.displayNumber}`}
        />
      </div>

      <section
        aria-labelledby="public-order-status-heading"
        className="grid gap-4 rounded-md border border-accent bg-accent/25 p-4 shadow-sm sm:p-5"
      >
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="grid gap-2">
            <p className="text-sm font-medium text-muted-foreground">
              Поточний статус
            </p>
            <h2
              className="flex items-center gap-2 text-xl font-semibold"
              id="public-order-status-heading"
            >
              <CheckCircle2 aria-hidden="true" className="size-5" />
              {order.statusLabel}
            </h2>
          </div>
          <span className="inline-flex min-h-9 w-fit items-center rounded-md border border-border bg-background px-3 text-sm font-medium">
            {order.displayNumber}
          </span>
        </div>

        <p className="text-base font-medium">{order.statusMessage}</p>
        <p className="text-sm text-muted-foreground">
          Якщо маєте питання, зверніться до продавця в чаті.
        </p>
      </section>

      <ManualCardPaymentNotice order={order} />

      <section
        aria-labelledby="public-order-summary-heading"
        className="rounded-md border border-border/80 bg-card/95 text-card-foreground shadow-sm"
      >
        <div className="border-b border-border/80 p-4 sm:p-5">
          <h2 className="font-semibold" id="public-order-summary-heading">
            Товари у замовленні
          </h2>
        </div>
        <ul className="divide-y divide-border/80">
          {order.items.map((item) => (
            <li
              className="grid min-w-0 gap-3 p-4 sm:grid-cols-[5rem_1fr_auto] sm:p-5"
              key={`${item.productSkuSnapshot}-${item.productNameSnapshot}`}
            >
              <PublicOrderItemImage item={item} />
              <div className="grid min-w-0 gap-1">
                <p className="break-words font-medium">
                  {item.productNameSnapshot}
                </p>
                <p className="text-sm text-muted-foreground">
                  Артикул: {item.productSkuSnapshot}
                </p>
                <p className="text-sm">Кількість: {item.quantity}</p>
              </div>
              <p className="font-semibold sm:min-w-28 sm:text-right">
                {formatMoneyMinor(item.lineTotalMinor, order.currency)}
              </p>
            </li>
          ))}
        </ul>
        <div className="flex flex-col gap-1 border-t border-border/80 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
          <p className="text-sm text-muted-foreground">Разом</p>
          <p className="font-display text-2xl font-semibold">
            {formatMoneyMinor(order.totalMinor, order.currency)}
          </p>
        </div>
      </section>
    </PageShell>
  );
}

function ManualCardPaymentNotice({ order }: { order: PublicOrderStatusData }) {
  if (order.paymentProvider !== "MANUAL_CARD_TRANSFER") {
    return null;
  }

  return (
    <section
      aria-labelledby="manual-card-payment-heading"
      className="grid gap-4 rounded-md border border-accent bg-card/95 p-4 shadow-sm sm:p-5"
    >
      <div className="grid gap-1">
        <h2 className="font-semibold" id="manual-card-payment-heading">
          Оплата картою онлайн
        </h2>
        <p className="text-sm text-muted-foreground">
          Переказ можна зробити на одну з карток нижче. Після оплати надішліть
          квитанцію продавцю в Instagram чат.
        </p>
      </div>

      {order.paymentRequisites.length ? (
        <ul className="grid gap-3">
          {order.paymentRequisites.map((requisite) => (
            <li
              className="grid min-w-0 gap-2 rounded-md border border-border/80 bg-background p-3"
              key={requisite.id}
            >
              <p className="break-words font-semibold">{requisite.label}</p>
              {requisite.bankName ? (
                <p className="break-words text-sm text-muted-foreground">
                  Банк: {requisite.bankName}
                </p>
              ) : null}
              {requisite.recipientName ? (
                <p className="break-words text-sm text-muted-foreground">
                  Отримувач: {requisite.recipientName}
                </p>
              ) : null}
              <p className="break-all rounded-md bg-muted px-3 py-2 text-sm font-semibold">
                {requisite.displayValue}
              </p>
              {requisite.note ? (
                <p className="break-words text-sm text-muted-foreground">
                  {requisite.note}
                </p>
              ) : null}
            </li>
          ))}
        </ul>
      ) : (
        <p className="rounded-md border border-dashed p-3 text-sm text-muted-foreground">
          Активні реквізити зараз недоступні. Напишіть продавцю в Instagram чат.
        </p>
      )}
    </section>
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
