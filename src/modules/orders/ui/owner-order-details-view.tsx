import { ArrowLeft, ExternalLink } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import type { OrderTagRecord } from "@/modules/orders/application/order-tag-repository";
import {
  auditActorLabels,
  getAuditEventLabel,
  orderStatusLabels,
  paymentProviderLabels,
  paymentStatusLabels,
  shipmentCarrierLabels,
  shipmentStatusLabels,
} from "@/modules/orders/application/order-labels";
import type { OwnerOrderDetails } from "@/modules/orders/application/owner-order-read-model";
import { isOrderStatus } from "@/modules/orders/domain/status";
import {
  assignOrderTagAction,
  createAndAssignOrderTagAction,
  removeOrderTagAction,
  updateOwnerOrderStatusAction,
} from "@/modules/orders/ui/owner-order-actions";
import {
  formatDateTime,
  formatMoneyMinor,
  shortOrderId,
} from "@/modules/orders/ui/owner-order-formatters";
import { OwnerOrderRetryShipmentForm } from "@/modules/orders/ui/owner-order-retry-shipment-form";
import { OwnerOrderStatusForm } from "@/modules/orders/ui/owner-order-status-form";
import { OwnerOrderTagPanel } from "@/modules/orders/ui/owner-order-tag-panel";
import { retryShipmentCreationAction } from "@/modules/shipping/ui/shipment-actions";
import { Button } from "@/shared/ui/button";

type OwnerOrderDetailsViewProps = {
  availableTags: OrderTagRecord[];
  order: OwnerOrderDetails;
};

export function OwnerOrderDetailsView({
  availableTags,
  order,
}: OwnerOrderDetailsViewProps) {
  const publicUrl = `/o/${order.publicToken}`;

  return (
    <div className="grid gap-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <Button asChild size="sm" variant="outline">
            <Link href="/dashboard/orders">
              <ArrowLeft aria-hidden="true" className="size-4" />
              До списку замовлень
            </Link>
          </Button>
          <h1 className="mt-4 text-2xl font-semibold tracking-normal">
            Замовлення #{shortOrderId(order.id)}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Поточний статус: {orderStatusLabels[order.status]}
          </p>
        </div>
        <Button asChild variant="outline">
          <Link href={publicUrl}>
            <ExternalLink aria-hidden="true" className="size-4" />
            Публічна сторінка
          </Link>
        </Button>
      </div>

      <section className="grid gap-4 rounded-md border p-4">
        <h2 className="text-lg font-semibold">Товари</h2>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] border-collapse text-left text-sm">
            <thead className="bg-muted text-muted-foreground">
              <tr>
                <th className="px-4 py-3 font-medium">Назва</th>
                <th className="px-4 py-3 font-medium">Артикул</th>
                <th className="px-4 py-3 font-medium">Кількість</th>
                <th className="px-4 py-3 font-medium">Ціна</th>
                <th className="px-4 py-3 font-medium">Сума</th>
              </tr>
            </thead>
            <tbody>
              {order.items.map((item) => (
                <tr className="border-t" key={item.id}>
                  <td className="px-4 py-3 font-medium">
                    {item.productNameSnapshot}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {item.productSkuSnapshot}
                  </td>
                  <td className="px-4 py-3">{item.quantity}</td>
                  <td className="px-4 py-3">
                    {formatMoneyMinor(item.unitPriceMinor, order.currency)}
                  </td>
                  <td className="px-4 py-3">
                    {formatMoneyMinor(item.lineTotalMinor, order.currency)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="text-right text-base font-semibold">
          Разом: {formatMoneyMinor(order.totalMinor, order.currency)}
        </p>
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        <InfoSection title="Клієнт">
          <InfoRow label="Ім’я" value={order.customer?.fullName} />
          <InfoRow label="Телефон" value={order.customer?.phone} />
          <InfoRow label="Підтверджено" value={formatDateTime(order.confirmedAt)} />
        </InfoSection>

        <InfoSection title="Доставка">
          {order.shipments.length ? (
            order.shipments.map((shipment) => (
              <div className="grid gap-2" key={shipment.id}>
                <InfoRow
                  label="Служба"
                  value={shipmentCarrierLabels[shipment.carrier]}
                />
                <InfoRow label="Місто" value={shipment.cityName} />
                <InfoRow label="Відділення" value={shipment.addressText} />
                <InfoRow
                  label="Статус"
                  value={shipmentStatusLabels[shipment.status]}
                />
              </div>
            ))
          ) : (
            <p className="text-sm text-muted-foreground">
              Дані доставки ще не вказано.
            </p>
          )}
        </InfoSection>

        <InfoSection title="Оплата">
          {order.payments.length ? (
            order.payments.map((payment) => (
              <div className="grid gap-2" key={payment.id}>
                <InfoRow
                  label="Спосіб"
                  value={paymentProviderLabels[payment.provider]}
                />
                <InfoRow
                  label="Статус"
                  value={paymentStatusLabels[payment.status]}
                />
                <InfoRow
                  label="Сума"
                  value={formatMoneyMinor(payment.amountMinor, payment.currency)}
                />
                <InfoRow
                  label="Ідентифікатор рахунку"
                  value={payment.providerInvoiceId}
                />
              </div>
            ))
          ) : (
            <p className="text-sm text-muted-foreground">
              Дані оплати ще не вказано.
            </p>
          )}
        </InfoSection>

        <InfoSection title="Відправлення">
          {order.shipments.length ? (
            order.shipments.map((shipment) => (
              <div className="grid gap-2" key={shipment.id}>
                <InfoRow
                  label="Номер ТТН"
                  value={shipment.trackingNumber ?? "Ще не створено"}
                />
                <InfoRow
                  label="Документ перевізника"
                  value={shipment.carrierShipmentId}
                />
                <InfoRow label="Посилання на етикетку" value={shipment.labelUrl} />
              </div>
            ))
          ) : (
            <p className="text-sm text-muted-foreground">
              Відправлення ще не підготовлено.
            </p>
          )}
        </InfoSection>
      </div>

      <section className="grid gap-6 rounded-md border p-4">
        <OwnerOrderTagPanel
          actions={{
            assign: assignOrderTagAction.bind(null, order.id),
            createAndAssign: createAndAssignOrderTagAction.bind(null, order.id),
            remove: removeOrderTagAction.bind(null, order.id),
          }}
          assignedTags={order.tags}
          availableTags={availableTags}
        />
      </section>

      <section className="grid gap-6 rounded-md border p-4">
        <OwnerOrderStatusForm
          action={updateOwnerOrderStatusAction.bind(null, order.id)}
          currentStatus={order.status}
        />
      </section>

      <section className="grid gap-6 rounded-md border p-4">
        <OwnerOrderRetryShipmentForm
          action={retryShipmentCreationAction.bind(null, order.id)}
          canRetry={order.shipments.some((shipment) => shipment.status === "FAILED")}
        />
      </section>

      <section className="grid gap-4 rounded-md border p-4">
        <h2 className="text-lg font-semibold">Історія статусів</h2>
        {order.statusHistory.length ? (
          <div className="grid gap-3">
            {order.statusHistory.map((entry) => (
              <div className="rounded-md border px-3 py-2" key={entry.id}>
                <p className="font-medium">{orderStatusLabels[entry.status]}</p>
                <p className="text-sm text-muted-foreground">
                  {formatDateTime(entry.createdAt)} ·{" "}
                  {auditActorLabels[entry.actorType]} ·{" "}
                  {getAuditEventLabel(entry.eventType)}
                </p>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            Історія статусів порожня.
          </p>
        )}
      </section>

      <section className="grid gap-4 rounded-md border p-4">
        <h2 className="text-lg font-semibold">Аудит подій</h2>
        {order.auditEvents.length ? (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] border-collapse text-left text-sm">
              <thead className="bg-muted text-muted-foreground">
                <tr>
                  <th className="px-4 py-3 font-medium">Час</th>
                  <th className="px-4 py-3 font-medium">Подія</th>
                  <th className="px-4 py-3 font-medium">Автор</th>
                  <th className="px-4 py-3 font-medium">Дані</th>
                </tr>
              </thead>
              <tbody>
                {order.auditEvents.map((event) => (
                  <tr className="border-t align-top" key={event.id}>
                    <td className="px-4 py-3 text-muted-foreground">
                      {formatDateTime(event.createdAt)}
                    </td>
                    <td className="px-4 py-3">
                      {getAuditEventLabel(event.eventType)}
                    </td>
                    <td className="px-4 py-3">
                      {auditActorLabels[event.actorType]}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {auditPayloadSummary(event.payload)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">Подій аудиту ще немає.</p>
        )}
      </section>
    </div>
  );
}

function InfoSection({
  children,
  title,
}: {
  children: ReactNode;
  title: string;
}) {
  return (
    <section className="grid gap-3 rounded-md border p-4">
      <h2 className="text-lg font-semibold">{title}</h2>
      <div className="grid gap-2">{children}</div>
    </section>
  );
}

function InfoRow({
  label,
  value,
}: {
  label: string;
  value?: string | null;
}) {
  return (
    <div className="grid gap-1 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span>{value || "Не вказано"}</span>
    </div>
  );
}

function auditPayloadSummary(payload: Record<string, unknown>): string {
  if (typeof payload.message === "string") {
    return payload.message;
  }

  if (typeof payload.status === "string") {
    return `Статус: ${
      isOrderStatus(payload.status)
        ? orderStatusLabels[payload.status]
        : "оновлено"
    }`;
  }

  return "Дані події збережено";
}
