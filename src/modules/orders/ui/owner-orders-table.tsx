import { ExternalLink } from "lucide-react";
import Link from "next/link";
import { formatInstagramUsername } from "@/modules/orders/application/customer-instagram";
import {
  orderStatusLabels,
  paymentProviderLabels,
  paymentStatusLabels,
  shipmentCarrierLabels,
  shipmentStatusLabels,
} from "@/modules/orders/application/order-labels";
import type { OwnerOrderSummary } from "@/modules/orders/application/owner-order-read-model";
import {
  displayOrderNumber,
  formatDateTime,
  formatMoneyMinor,
} from "@/modules/orders/ui/owner-order-formatters";
import { Button } from "@/shared/ui/button";
import { ActionBar } from "@/shared/ui/page-layout";
import { cn } from "@/shared/utils/cn";

type OwnerOrdersTableProps = {
  hasActiveFilters?: boolean;
  hasSearchFilter?: boolean;
  orders: OwnerOrderSummary[];
};

export function OwnerOrdersTable({
  hasActiveFilters = false,
  hasSearchFilter = false,
  orders,
}: OwnerOrdersTableProps) {
  if (!orders.length) {
    return (
      <EmptyOrdersState
        hasActiveFilters={hasActiveFilters}
        hasSearchFilter={hasSearchFilter}
      />
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
              <th className="w-[15%] px-4 py-3 font-medium">Замовлення</th>
              <th className="w-[19%] px-4 py-3 font-medium">Клієнт</th>
              <th className="w-[16%] px-4 py-3 font-medium">Оплата</th>
              <th className="w-[18%] px-4 py-3 font-medium">Доставка</th>
              <th className="w-[10%] px-4 py-3 text-right font-medium">Сума</th>
              <th className="w-[10%] px-4 py-3 font-medium">Дата</th>
              <th className="w-[12%] px-4 py-3 text-right font-medium">Дія</th>
            </tr>
          </thead>
          <tbody>
            {orders.map((order) => (
              <tr className="border-t align-top" key={order.id}>
                <td className="min-w-0 px-4 py-3">
                  <p className="font-medium">{displayOrderNumber(order.id)}</p>
                  <StatusBadge
                    className="mt-2"
                    label={orderStatusLabels[order.status]}
                  />
                </td>
                <td className="min-w-0 px-4 py-3">
                  <CustomerSummary order={order} />
                </td>
                <td className="min-w-0 px-4 py-3">
                  <PaymentSummary order={order} />
                </td>
                <td className="min-w-0 px-4 py-3">
                  <DeliverySummary order={order} />
                </td>
                <td className="px-4 py-3 text-right font-medium tabular-nums">
                  {formatMoneyMinor(order.totalMinor, order.currency)}
                </td>
                <td className="px-4 py-3 text-xs text-muted-foreground">
                  {formatDateTime(order.createdAt)}
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

function EmptyOrdersState({
  hasActiveFilters,
  hasSearchFilter,
}: {
  hasActiveFilters: boolean;
  hasSearchFilter: boolean;
}) {
  return (
    <div className="grid min-w-0 gap-3 rounded-md border border-dashed p-6 text-center sm:p-8">
      <h2 className="text-lg font-semibold">
        {hasSearchFilter
          ? "За цим пошуком замовлень не знайдено"
          : hasActiveFilters
            ? "За фільтрами нічого не знайдено"
            : "Замовлень ще немає"}
      </h2>
      <p className="mx-auto max-w-xl text-sm text-muted-foreground">
        {hasSearchFilter
          ? "Спробуйте інший ID, Instagram, телефон або ТТН."
          : hasActiveFilters
            ? "Змініть або скиньте фільтри, щоб побачити інші замовлення."
            : "Створіть посилання замовлення і надішліть його клієнту для підтвердження."}
      </p>
      <ActionBar align="center">
        {hasActiveFilters ? (
          <Button asChild variant="outline">
            <Link href="/dashboard/orders">Скинути фільтри</Link>
          </Button>
        ) : null}
        <Button asChild>
          <Link href="/dashboard/orders/new">Створити замовлення</Link>
        </Button>
      </ActionBar>
    </div>
  );
}

function OrderCard({ order }: { order: OwnerOrderSummary }) {
  return (
    <article
      aria-label={`Замовлення ${displayOrderNumber(order.id)}`}
      className="grid min-w-0 gap-4 rounded-md border bg-card p-4"
      data-testid="owner-orders-mobile-card"
    >
      <div className="flex min-w-0 flex-wrap items-start gap-2">
        <div className="min-w-0 flex-1">
          <h2 className="text-base font-semibold">
            Замовлення {displayOrderNumber(order.id)}
          </h2>
        </div>
        <StatusBadge label={orderStatusLabels[order.status]} />
      </div>

      <div className="grid min-w-0 gap-1 text-sm">
        <p className="break-words font-medium">
          {order.customer?.fullName ?? "Клієнт ще не вказаний"}
        </p>
        {order.customer?.instagramUsername ? (
          <p className="break-words text-muted-foreground">
            {formatInstagramUsername(order.customer.instagramUsername)}
          </p>
        ) : null}
      </div>

      <div className="grid min-w-0 gap-2 text-sm">
        <PaymentSummary order={order} prefix="Оплата" />
        <DeliverySummary order={order} prefix="Доставка" />
      </div>

      <div className="flex min-w-0 items-center justify-between gap-3 text-sm">
        <span className="text-muted-foreground">Сума</span>
        <p className="font-medium tabular-nums">
          {formatMoneyMinor(order.totalMinor, order.currency)}
        </p>
      </div>

      <OrderActionLink orderId={order.id} />
    </article>
  );
}

function CustomerSummary({ order }: { order: OwnerOrderSummary }) {
  const instagram = formatInstagramUsername(order.customer?.instagramUsername);

  return (
    <div className="grid min-w-0 gap-1">
      <p className="truncate font-medium">
        {order.customer?.fullName ?? "Клієнт ще не вказаний"}
      </p>
      {instagram ? (
        <p className="truncate text-xs text-muted-foreground">{instagram}</p>
      ) : null}
    </div>
  );
}

function PaymentSummary({
  order,
  prefix,
}: {
  order: OwnerOrderSummary;
  prefix?: string;
}) {
  const payment = latestByUpdatedAt(order.payments);

  if (!payment) {
    return (
      <p className="text-xs text-muted-foreground">
        {prefix ? `${prefix}: ` : null}Оплату ще не створено
      </p>
    );
  }

  return (
    <div className="grid min-w-0 gap-1">
      <p className="truncate font-medium">
        {prefix ? `${prefix}: ` : null}
        {paymentProviderLabels[payment.provider]}
      </p>
      <StatusBadge
        label={paymentStatusLabels[payment.status]}
        tone={
          payment.status === "PAID"
            ? "success"
            : payment.status === "FAILED" || payment.status === "CANCELLED"
              ? "danger"
              : "neutral"
        }
      />
    </div>
  );
}

function DeliverySummary({
  order,
  prefix,
}: {
  order: OwnerOrderSummary;
  prefix?: string;
}) {
  const shipment = latestByUpdatedAt(order.shipments);

  if (!shipment) {
    return (
      <p className="text-xs text-muted-foreground">
        {prefix ? `${prefix}: ` : null}Доставку ще не вказано
      </p>
    );
  }

  return (
    <div className="grid min-w-0 gap-1">
      <p className="truncate font-medium">
        {prefix ? `${prefix}: ` : null}
        {shipmentCarrierLabels[shipment.carrier]}
      </p>
      <div className="flex min-w-0 flex-wrap items-center gap-2">
        <StatusBadge
          label={shipmentStatusLabels[shipment.status]}
          tone={
            shipment.status === "DELIVERED"
              ? "success"
              : shipment.status === "FAILED" || shipment.status === "CANCELLED"
                ? "danger"
                : "neutral"
          }
        />
        {shipment.trackingNumber ? (
          <span className="min-w-0 truncate text-xs text-muted-foreground">
            ТТН: {shipment.trackingNumber}
          </span>
        ) : null}
      </div>
    </div>
  );
}

function StatusBadge({
  className,
  label,
  tone = "neutral",
}: {
  className?: string;
  label: string;
  tone?: "danger" | "neutral" | "success";
}) {
  return (
    <span
      className={cn(
        "inline-flex w-fit shrink-0 rounded-md px-2 py-1 text-xs font-medium",
        tone === "success"
          ? "bg-emerald-100 text-emerald-800"
          : tone === "danger"
            ? "bg-red-100 text-red-800"
            : "bg-secondary text-secondary-foreground",
        className,
      )}
    >
      {label}
    </span>
  );
}

function latestByUpdatedAt<T extends { updatedAt: Date }>(records: T[]): T | null {
  return records.reduce<T | null>((latest, record) => {
    if (!latest || record.updatedAt.getTime() > latest.updatedAt.getTime()) {
      return record;
    }

    return latest;
  }, null);
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
