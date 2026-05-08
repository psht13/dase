import { ExternalLink } from "lucide-react";
import Link from "next/link";
import { formatInstagramUsername } from "@/modules/orders/application/customer-instagram";
import { orderStatusLabels } from "@/modules/orders/application/order-labels";
import type { OwnerOrderSummary } from "@/modules/orders/application/owner-order-read-model";
import {
  displayOrderNumber,
  formatDateTime,
  formatMoneyMinor,
} from "@/modules/orders/ui/owner-order-formatters";
import { Button } from "@/shared/ui/button";
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
              <th className="w-[84%] px-4 py-3 font-medium">Замовлення</th>
              <th className="w-[16%] px-4 py-3 text-right font-medium">Дії</th>
            </tr>
          </thead>
          <tbody>
            {orders.map((order) => (
              <tr className="border-t align-top" key={order.id}>
                <td className="min-w-0 px-4 py-3">
                  <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-2">
                    <p className="font-medium">{displayOrderNumber(order.id)}</p>
                    <StatusBadge label={orderStatusLabels[order.status]} />
                    <p className="font-medium tabular-nums">
                      {formatMoneyMinor(order.totalMinor, order.currency)}
                    </p>
                  </div>
                  <p className="mt-2 truncate text-xs text-muted-foreground">
                    {customerSummary(order)}
                  </p>
                  {order.tags.length ? (
                    <div className="mt-2">
                      <TagList
                        maxVisible={2}
                        tags={order.tags.map((tag) => tag.name)}
                      />
                    </div>
                  ) : null}
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
      <div className="flex min-w-0 flex-col justify-center gap-3 sm:flex-row">
        {hasActiveFilters ? (
          <Button asChild variant="outline">
            <Link href="/dashboard/orders">Скинути фільтри</Link>
          </Button>
        ) : null}
        <Button asChild>
          <Link href="/dashboard/orders/new">Створити замовлення</Link>
        </Button>
      </div>
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
        {order.customer?.instagramUsername ? (
          <p className="break-words text-muted-foreground">
            {formatInstagramUsername(order.customer.instagramUsername)}
          </p>
        ) : null}
        <p className="break-words text-muted-foreground">
          {order.customer?.phone ?? "Телефон не вказано"}
        </p>
      </div>

      <div className="flex min-w-0 flex-wrap items-center justify-between gap-3 text-sm">
        <p className="font-medium tabular-nums">
          {formatMoneyMinor(order.totalMinor, order.currency)}
        </p>
        {order.tags.length ? (
          <TagList maxVisible={3} tags={order.tags.map((tag) => tag.name)} />
        ) : null}
      </div>

      <OrderActionLink orderId={order.id} />
    </article>
  );
}

function customerSummary(order: OwnerOrderSummary): string {
  const parts = [
    order.customer?.fullName ?? "Клієнт ще не вказаний",
    order.customer?.instagramUsername
      ? formatInstagramUsername(order.customer.instagramUsername)
      : null,
    formatDateTime(order.createdAt),
  ].filter((part): part is string => Boolean(part));

  return parts.join(" · ");
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
