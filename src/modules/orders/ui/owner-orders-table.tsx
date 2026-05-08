import { ExternalLink } from "lucide-react";
import Link from "next/link";
import {
  orderStatusLabels,
  paymentProviderLabels,
  shipmentCarrierLabels,
} from "@/modules/orders/application/order-labels";
import type { OwnerOrderSummary } from "@/modules/orders/application/owner-order-read-model";
import {
  formatDateTime,
  formatMoneyMinor,
  shortOrderId,
} from "@/modules/orders/ui/owner-order-formatters";
import { Button } from "@/shared/ui/button";
import { cn } from "@/shared/utils/cn";

type OwnerOrdersTableProps = {
  orders: OwnerOrderSummary[];
};

export function OwnerOrdersTable({ orders }: OwnerOrdersTableProps) {
  if (!orders.length) {
    return (
      <div className="rounded-md border border-dashed p-8 text-center">
        <h2 className="text-lg font-semibold">Замовлення не знайдено</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Змініть фільтри або створіть нове посилання замовлення.
        </p>
      </div>
    );
  }

  return (
    <>
      <div
        className="grid min-w-0 gap-3 lg:hidden"
        data-testid="owner-orders-mobile-list"
      >
        {orders.map((order) => (
          <OrderCard key={order.id} order={order} />
        ))}
      </div>

      <div
        className="hidden w-full max-w-full overflow-hidden rounded-md border lg:block"
        data-testid="owner-orders-desktop-table"
      >
        <table className="w-full table-fixed border-collapse text-left text-sm">
          <thead className="bg-muted text-muted-foreground">
            <tr>
              <th className="w-[22%] px-4 py-3 font-medium">Замовлення</th>
              <th className="w-[26%] px-4 py-3 font-medium">Клієнт</th>
              <th className="w-[24%] px-4 py-3 font-medium">Статус</th>
              <th className="w-[16%] px-4 py-3 font-medium">Сума і теги</th>
              <th className="w-[12%] px-4 py-3 text-right font-medium">Дії</th>
            </tr>
          </thead>
          <tbody>
            {orders.map((order) => (
              <tr className="border-t align-top" key={order.id}>
                <td className="min-w-0 px-4 py-3">
                  <p className="font-medium">#{shortOrderId(order.id)}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {formatDateTime(order.createdAt)}
                  </p>
                </td>
                <td className="min-w-0 px-4 py-3">
                  <p className="truncate font-medium">
                    {order.customer?.fullName ?? "Клієнт ще не вказаний"}
                  </p>
                  <p className="mt-1 truncate text-xs text-muted-foreground">
                    {order.customer?.phone ?? "Телефон не вказано"}
                  </p>
                </td>
                <td className="min-w-0 px-4 py-3">
                  <StatusBadge label={orderStatusLabels[order.status]} />
                  <p className="mt-2 line-clamp-2 text-xs text-muted-foreground">
                    {deliveryLabel(order)} · {paymentLabel(order)}
                  </p>
                </td>
                <td className="px-4 py-3">
                  <p className="font-medium tabular-nums">
                    {formatMoneyMinor(order.totalMinor, order.currency)}
                  </p>
                  <div className="mt-2">
                    <TagList maxVisible={2} tags={order.tags.map((tag) => tag.name)} />
                  </div>
                </td>
                <td className="px-4 py-3">
                  <OrderActionLink isCompact orderId={order.id} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

function OrderCard({ order }: { order: OwnerOrderSummary }) {
  return (
    <article
      aria-label={`Замовлення #${shortOrderId(order.id)}`}
      className="grid min-w-0 gap-4 rounded-md border bg-card p-4"
      data-testid="owner-orders-mobile-card"
    >
      <div className="flex min-w-0 flex-wrap items-start gap-2">
        <div className="min-w-0 flex-1">
          <h2 className="text-base font-semibold">
            Замовлення #{shortOrderId(order.id)}
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {formatDateTime(order.createdAt)}
          </p>
        </div>
        <StatusBadge label={orderStatusLabels[order.status]} />
      </div>

      <div className="grid min-w-0 gap-1 text-sm">
        <p className="break-words font-medium">
          {order.customer?.fullName ?? "Клієнт ще не вказаний"}
        </p>
        <p className="break-words text-muted-foreground">
          {order.customer?.phone ?? "Телефон не вказано"}
        </p>
      </div>

      <dl className="grid grid-cols-2 gap-3 text-sm">
        <div>
          <dt className="text-xs font-medium uppercase text-muted-foreground">
            Сума
          </dt>
          <dd className="mt-1 font-medium tabular-nums">
            {formatMoneyMinor(order.totalMinor, order.currency)}
          </dd>
        </div>
        <div>
          <dt className="text-xs font-medium uppercase text-muted-foreground">
            Доставка
          </dt>
          <dd className="mt-1 break-words">{deliveryLabel(order)}</dd>
        </div>
      </dl>

      <div className="grid min-w-0 gap-2 text-sm">
        <p className="break-words text-muted-foreground">
          Оплата: {paymentLabel(order)}
        </p>
        <TagList maxVisible={3} tags={order.tags.map((tag) => tag.name)} />
      </div>

      <OrderActionLink orderId={order.id} />
    </article>
  );
}

function StatusBadge({ label }: { label: string }) {
  return (
    <span className="inline-flex shrink-0 rounded-md bg-secondary px-2 py-1 text-xs font-medium">
      {label}
    </span>
  );
}

function TagList({
  maxVisible,
  tags,
}: {
  maxVisible?: number;
  tags: string[];
}) {
  if (!tags.length) {
    return <span className="text-muted-foreground">Без тегів</span>;
  }

  const visibleTags = maxVisible ? tags.slice(0, maxVisible) : tags;
  const hiddenCount = tags.length - visibleTags.length;

  return (
    <div className="flex flex-wrap gap-1">
      {visibleTags.map((tag) => (
        <span
          className="max-w-full break-words rounded-md border bg-background px-2 py-1 text-xs font-medium"
          key={tag}
        >
          {tag}
        </span>
      ))}
      {hiddenCount > 0 ? (
        <span className="rounded-md border bg-muted px-2 py-1 text-xs font-medium text-muted-foreground">
          ще {hiddenCount}
        </span>
      ) : null}
    </div>
  );
}

function OrderActionLink({
  isCompact = false,
  orderId,
}: {
  isCompact?: boolean;
  orderId: string;
}) {
  return (
    <div className={cn("flex", isCompact ? "justify-end" : "w-full")}>
      <Button
        asChild
        className={cn(!isCompact && "w-full")}
        size={isCompact ? "sm" : "default"}
        variant="outline"
      >
        <Link href={`/dashboard/orders/${orderId}`}>
          <ExternalLink aria-hidden="true" className="size-4" />
          Відкрити
        </Link>
      </Button>
    </div>
  );
}

function deliveryLabel(order: OwnerOrderSummary): string {
  const shipment = order.shipments[0];

  if (!shipment) {
    return "Доставку ще не вказано";
  }

  return shipmentCarrierLabels[shipment.carrier];
}

function paymentLabel(order: OwnerOrderSummary): string {
  const payment = order.payments[0];

  if (!payment) {
    return "Оплату ще не вказано";
  }

  return paymentProviderLabels[payment.provider];
}
