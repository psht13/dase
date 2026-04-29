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
    <div className="overflow-x-auto rounded-md border">
      <table className="w-full min-w-[980px] border-collapse text-left text-sm">
        <thead className="bg-muted text-muted-foreground">
          <tr>
            <th className="px-4 py-3 font-medium">Замовлення</th>
            <th className="px-4 py-3 font-medium">Клієнт</th>
            <th className="px-4 py-3 font-medium">Телефон</th>
            <th className="px-4 py-3 font-medium">Статус</th>
            <th className="px-4 py-3 font-medium">Доставка</th>
            <th className="px-4 py-3 font-medium">Оплата</th>
            <th className="px-4 py-3 font-medium">Теги</th>
            <th className="px-4 py-3 font-medium">Сума</th>
            <th className="px-4 py-3 font-medium">Створено</th>
            <th className="px-4 py-3 text-right font-medium">Дії</th>
          </tr>
        </thead>
        <tbody>
          {orders.map((order) => (
            <tr className="border-t align-top" key={order.id}>
              <td className="px-4 py-3 font-medium">
                #{shortOrderId(order.id)}
              </td>
              <td className="px-4 py-3">
                {order.customer?.fullName ?? "Клієнт ще не вказаний"}
              </td>
              <td className="px-4 py-3 text-muted-foreground">
                {order.customer?.phone ?? "Не вказано"}
              </td>
              <td className="px-4 py-3">
                <StatusBadge label={orderStatusLabels[order.status]} />
              </td>
              <td className="px-4 py-3 text-muted-foreground">
                {deliveryLabel(order)}
              </td>
              <td className="px-4 py-3 text-muted-foreground">
                {paymentLabel(order)}
              </td>
              <td className="px-4 py-3">
                <TagList tags={order.tags.map((tag) => tag.name)} />
              </td>
              <td className="px-4 py-3">
                {formatMoneyMinor(order.totalMinor, order.currency)}
              </td>
              <td className="px-4 py-3 text-muted-foreground">
                {formatDateTime(order.createdAt)}
              </td>
              <td className="px-4 py-3">
                <div className="flex justify-end">
                  <Button asChild size="sm" variant="outline">
                    <Link href={`/dashboard/orders/${order.id}`}>
                      <ExternalLink className="size-4" />
                      Відкрити
                    </Link>
                  </Button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function StatusBadge({ label }: { label: string }) {
  return (
    <span className="rounded-md bg-secondary px-2 py-1 text-xs font-medium">
      {label}
    </span>
  );
}

function TagList({ tags }: { tags: string[] }) {
  if (!tags.length) {
    return <span className="text-muted-foreground">Без тегів</span>;
  }

  return (
    <div className="flex flex-wrap gap-1">
      {tags.map((tag) => (
        <span
          className="rounded-md border bg-background px-2 py-1 text-xs font-medium"
          key={tag}
        >
          {tag}
        </span>
      ))}
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
