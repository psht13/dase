import { ArrowLeft, ChevronDown, ExternalLink } from "lucide-react";
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
import { canCreateMonobankInvoiceForPayment } from "@/modules/payments/application/create-payment-invoice";
import { retryOwnerMonobankPaymentAction } from "@/modules/payments/ui/payment-actions";
import { PaymentRetryForm } from "@/modules/payments/ui/payment-retry-form";
import {
  shippingLabelCreationDisabledMessage,
  type ShippingLabelCreationMode,
} from "@/modules/shipping/application/shipping-label-creation-mode";
import { isShipmentCreationEnabled } from "@/modules/shipping/application/shipping-carrier-registry";
import { retryShipmentCreationAction } from "@/modules/shipping/ui/shipment-actions";
import { Button } from "@/shared/ui/button";

type OwnerOrderDetailsViewProps = {
  availableTags: OrderTagRecord[];
  order: OwnerOrderDetails;
  shippingLabelCreationMode?: ShippingLabelCreationMode;
};

export function OwnerOrderDetailsView({
  availableTags,
  order,
  shippingLabelCreationMode = "live",
}: OwnerOrderDetailsViewProps) {
  const publicUrl = `/o/${order.publicToken}`;
  const canRetryMonobankPayment = order.payments.some((payment) =>
    canCreateMonobankInvoiceForPayment(order.status, payment),
  );
  const isShippingLabelCreationDisabled =
    shippingLabelCreationMode === "disabled";
  const canRetryShipment =
    !isShippingLabelCreationDisabled &&
    order.shipments.some(
      (shipment) =>
        shipment.status === "FAILED" &&
        isShipmentCreationEnabled(shipment.carrier),
    );

  return (
    <div className="grid min-w-0 gap-6">
      <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <Button asChild size="sm" variant="outline">
            <Link href="/dashboard/orders">
              <ArrowLeft aria-hidden="true" className="size-4" />
              До списку замовлень
            </Link>
          </Button>
          <h1 className="mt-4 break-words font-display text-2xl font-semibold sm:text-3xl">
            Замовлення #{shortOrderId(order.id)}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Поточний статус: {orderStatusLabels[order.status]}
          </p>
        </div>
        <Button asChild className="w-full sm:w-auto" variant="outline">
          <Link href={publicUrl}>
            <ExternalLink aria-hidden="true" className="size-4" />
            Публічна сторінка
          </Link>
        </Button>
      </div>

      <div className="grid min-w-0 gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(20rem,24rem)] xl:items-start">
        <div className="grid min-w-0 gap-6 xl:col-start-2 xl:row-start-1">
          <DetailSection testId="overview" title="Огляд">
            <dl className="grid min-w-0 gap-3 text-sm">
              <InfoRow label="Статус" value={orderStatusLabels[order.status]} />
              <InfoRow
                label="Сума"
                value={formatMoneyMinor(order.totalMinor, order.currency)}
              />
              <InfoRow label="Створено" value={formatDateTime(order.createdAt)} />
              <InfoRow
                label="Підтверджено"
                value={formatDateTime(order.confirmedAt)}
              />
            </dl>
            <OwnerOrderStatusForm
              action={updateOwnerOrderStatusAction.bind(null, order.id)}
              currentStatus={order.status}
            />
          </DetailSection>

          <DetailSection testId="customer" title="Клієнт">
            <dl className="grid min-w-0 gap-3 text-sm">
              <InfoRow label="Ім’я" value={order.customer?.fullName} />
              <InfoRow label="Телефон" value={order.customer?.phone} />
              <InfoRow
                label="Підтверджено"
                value={formatDateTime(order.confirmedAt)}
              />
            </dl>
          </DetailSection>

          <DetailSection testId="delivery" title="Доставка">
            {order.shipments.length ? (
              <div className="grid min-w-0 gap-4">
                {order.shipments.map((shipment) => (
                  <article
                    className="grid min-w-0 gap-3 rounded-md border border-border/70 p-3"
                    key={shipment.id}
                  >
                    <dl className="grid min-w-0 gap-3 text-sm">
                      <InfoRow
                        label="Служба"
                        value={shipmentCarrierLabels[shipment.carrier]}
                      />
                      <InfoRow label="Місто" value={shipment.cityName} />
                      <InfoRow label="Відділення" value={shipment.addressText} />
                      <InfoRow
                        label="Статус відправлення"
                        value={shipmentStatusLabels[shipment.status]}
                      />
                      <InfoRow
                        label="Номер ТТН"
                        value={shipment.trackingNumber ?? "Ще не створено"}
                      />
                      <InfoRow
                        label="Документ перевізника"
                        value={shipment.carrierShipmentId}
                      />
                      <InfoRow
                        label="Посилання на етикетку"
                        value={shipment.labelUrl}
                      />
                    </dl>
                  </article>
                ))}
              </div>
            ) : (
              <EmptyInlineState message="Доставка ще не вказана. Дані зʼявляться після підтвердження замовлення клієнтом." />
            )}

            <OwnerOrderRetryShipmentForm
              action={retryShipmentCreationAction.bind(null, order.id)}
              canRetry={canRetryShipment}
              notice={
                isShippingLabelCreationDisabled
                  ? shippingLabelCreationDisabledMessage
                  : null
              }
            />
          </DetailSection>

          <DetailSection testId="payment" title="Оплата">
            {order.payments.length ? (
              <div className="grid min-w-0 gap-4">
                {order.payments.map((payment) => (
                  <article
                    className="grid min-w-0 gap-3 rounded-md border border-border/70 p-3"
                    key={payment.id}
                  >
                    <dl className="grid min-w-0 gap-3 text-sm">
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
                        value={formatMoneyMinor(
                          payment.amountMinor,
                          payment.currency,
                        )}
                      />
                      <InfoRow
                        label="Ідентифікатор рахунку"
                        value={payment.providerInvoiceId}
                      />
                    </dl>
                  </article>
                ))}
              </div>
            ) : (
              <EmptyInlineState message="Оплата ще не створена. Після підтвердження клієнтом тут буде спосіб оплати та статус рахунку." />
            )}

            <div className="grid min-w-0 gap-3">
              <div>
                <h3 className="text-base font-semibold">
                  Повтор оплати MonoPay
                </h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  Повторне посилання доступне, якщо рахунок MonoPay не створився
                  або попередня оплата завершилась помилкою.
                </p>
              </div>
              {canRetryMonobankPayment ? (
                <PaymentRetryForm
                  action={retryOwnerMonobankPaymentAction.bind(null, order.id)}
                />
              ) : (
                <p className="text-sm text-muted-foreground">
                  Повтор оплати зараз недоступний.
                </p>
              )}
            </div>
          </DetailSection>

          <DetailSection testId="tags" title="Теги">
            <OwnerOrderTagPanel
              actions={{
                assign: assignOrderTagAction.bind(null, order.id),
                createAndAssign: createAndAssignOrderTagAction.bind(
                  null,
                  order.id,
                ),
                remove: removeOrderTagAction.bind(null, order.id),
              }}
              assignedTags={order.tags}
              availableTags={availableTags}
            />
          </DetailSection>
        </div>

        <div className="grid min-w-0 gap-6 xl:col-start-1 xl:row-start-1">
          <DetailSection testId="products" title="Товари">
            {order.items.length ? (
              <>
                <ul
                  className="grid min-w-0 gap-3"
                  data-testid="owner-order-products-list"
                >
                  {order.items.map((item) => (
                    <li
                      className="grid min-w-0 gap-3 rounded-md border border-border/70 p-3 sm:grid-cols-[minmax(0,1fr)_auto]"
                      data-testid="owner-order-product-card"
                      key={item.id}
                    >
                      <div className="min-w-0">
                        <p className="break-words font-medium">
                          {item.productNameSnapshot}
                        </p>
                        <p className="mt-1 break-words text-sm text-muted-foreground">
                          Артикул: {item.productSkuSnapshot}
                        </p>
                      </div>
                      <dl className="grid min-w-0 grid-cols-2 gap-3 text-sm sm:min-w-64">
                        <CompactInfo
                          label="Кількість"
                          value={String(item.quantity)}
                        />
                        <CompactInfo
                          label="Ціна"
                          value={formatMoneyMinor(
                            item.unitPriceMinor,
                            order.currency,
                          )}
                        />
                        <CompactInfo
                          className="col-span-2"
                          label="Сума"
                          value={formatMoneyMinor(
                            item.lineTotalMinor,
                            order.currency,
                          )}
                        />
                      </dl>
                    </li>
                  ))}
                </ul>
                <p className="text-right text-base font-semibold">
                  Разом: {formatMoneyMinor(order.totalMinor, order.currency)}
                </p>
              </>
            ) : (
              <EmptyInlineState message="У замовленні немає товарів. Створіть нове посилання з актуального каталогу." />
            )}
          </DetailSection>

          <DetailSection testId="status-history" title="Історія статусів">
            {order.statusHistory.length ? (
              <ol className="grid min-w-0 gap-3">
                {order.statusHistory.map((entry) => (
                  <li
                    className="grid min-w-0 gap-1 rounded-md border border-border/70 px-3 py-2"
                    key={entry.id}
                  >
                    <p className="font-medium">
                      {orderStatusLabels[entry.status]}
                    </p>
                    <p className="break-words text-sm text-muted-foreground">
                      {formatDateTime(entry.createdAt)} ·{" "}
                      {auditActorLabels[entry.actorType]} ·{" "}
                      {getAuditEventLabel(entry.eventType)}
                    </p>
                  </li>
                ))}
              </ol>
            ) : (
              <EmptyInlineState message="Історія статусів ще порожня. Нові події зʼявляться після підтвердження, оплати або ручної зміни статусу." />
            )}
          </DetailSection>

          <DetailSection testId="audit" title="Аудит">
            <div>
              <h3 className="text-base font-semibold">Аудит подій</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                Події збережені компактно, щоб перевірити зміни без широкої
                таблиці.
              </p>
            </div>
            {order.auditEvents.length ? (
              <ol
                className="grid min-w-0 gap-3"
                data-testid="owner-order-audit-list"
              >
                {order.auditEvents.map((event) => (
                  <li
                    className="grid min-w-0 gap-2 rounded-md border border-border/70 px-3 py-2 sm:grid-cols-[10rem_minmax(0,1fr)]"
                    key={event.id}
                  >
                    <p className="text-sm text-muted-foreground">
                      {formatDateTime(event.createdAt)}
                    </p>
                    <div className="grid min-w-0 gap-1">
                      <p className="break-words font-medium">
                        {getAuditEventLabel(event.eventType)}
                      </p>
                      <p className="break-words text-sm text-muted-foreground">
                        {auditActorLabels[event.actorType]} ·{" "}
                        {auditPayloadSummary(event.payload)}
                      </p>
                    </div>
                  </li>
                ))}
              </ol>
            ) : (
              <EmptyInlineState message="Подій аудиту ще немає. Тут зʼявляться зміни статусів, тегів, оплат і відправлень." />
            )}
          </DetailSection>
        </div>
      </div>
    </div>
  );
}

function DetailSection({
  children,
  testId,
  title,
}: {
  children: ReactNode;
  testId: string;
  title: string;
}) {
  const headingId = `owner-order-${testId}-heading`;

  return (
    <details
      aria-labelledby={headingId}
      className="group min-w-0 rounded-md border border-border/80 bg-card/95 shadow-sm"
      data-testid="owner-order-detail-section"
      data-section={testId}
      open
    >
      <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 [&::-webkit-details-marker]:hidden">
        <h2 className="text-lg font-semibold" id={headingId}>
          {title}
        </h2>
        <ChevronDown
          aria-hidden="true"
          className="size-4 shrink-0 text-muted-foreground transition-transform group-open:rotate-180"
        />
      </summary>
      <div className="grid min-w-0 gap-4 border-t border-border/70 p-4">
        {children}
      </div>
    </details>
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
    <div className="grid min-w-0 gap-1 border-b border-border/60 pb-2 last:border-0 last:pb-0">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="break-words font-medium">{value || "Не вказано"}</dd>
    </div>
  );
}

function CompactInfo({
  className,
  label,
  value,
}: {
  className?: string;
  label: string;
  value: string;
}) {
  return (
    <div className={className}>
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="break-words font-medium">{value}</dd>
    </div>
  );
}

function EmptyInlineState({ message }: { message: string }) {
  return (
    <p
      className="rounded-md border border-dashed bg-muted/20 p-3 text-sm text-muted-foreground"
      role="status"
    >
      {message}
    </p>
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
