import type { AuditActorType } from "@/modules/orders/application/audit-event-repository";
import type { OrderStatus } from "@/modules/orders/domain/status";
import type {
  PaymentProviderCode,
  PaymentStatus,
} from "@/modules/payments/application/payment-repository";
import type {
  ShipmentCarrier,
  ShipmentStatus,
} from "@/modules/shipping/application/shipment-repository";

export const orderStatusLabels: Record<OrderStatus, string> = {
  CANCELLED: "Скасовано",
  COMPLETED: "Завершено",
  CONFIRMED_BY_CUSTOMER: "Підтверджено клієнтом",
  DELIVERED: "Доставлено",
  DRAFT: "Чернетка",
  IN_TRANSIT: "У дорозі",
  PAID: "Оплачено",
  PAYMENT_FAILED: "Оплата не вдалася",
  PAYMENT_PENDING: "Очікує оплату",
  RETURNED: "Повернено",
  RETURN_REQUESTED: "Запитано повернення",
  SENT_TO_CUSTOMER: "Надіслано клієнту",
  SHIPMENT_CREATED: "Відправлення створено",
  SHIPMENT_PENDING: "Готується відправлення",
};

export const shipmentCarrierLabels: Record<ShipmentCarrier, string> = {
  NOVA_POSHTA: "Нова Пошта",
  UKRPOSHTA: "Укрпошта",
};

export const shipmentStatusLabels: Record<ShipmentStatus, string> = {
  CANCELLED: "Скасовано",
  CREATED: "Створено",
  DELIVERED: "Доставлено",
  FAILED: "Помилка створення",
  IN_TRANSIT: "У дорозі",
  PENDING: "Очікує створення",
  RETURNED: "Повернено",
};

export const paymentProviderLabels: Record<PaymentProviderCode, string> = {
  CASH_ON_DELIVERY: "Післяплата",
  MONOBANK: "MonoPay",
};

export const paymentStatusLabels: Record<PaymentStatus, string> = {
  CANCELLED: "Скасовано",
  FAILED: "Помилка оплати",
  PAID: "Оплачено",
  PENDING: "Очікує оплату",
  REFUNDED: "Повернено кошти",
};

export const auditActorLabels: Record<AuditActorType, string> = {
  CUSTOMER: "Клієнт",
  OWNER: "Власник",
  SYSTEM: "Система",
};

const auditEventLabels: Record<string, string> = {
  ORDER_AUTO_COMPLETED: "Замовлення завершено автоматично",
  ORDER_CONFIRMED_BY_CUSTOMER: "Клієнт підтвердив замовлення",
  ORDER_CREATED: "Створено посилання замовлення",
  ORDER_STATUS_UPDATED: "Статус змінено вручну",
  ORDER_TAG_ASSIGNED: "Тег додано до замовлення",
  ORDER_TAG_REMOVED: "Тег знято із замовлення",
  PAYMENT_PAID: "Оплату отримано",
  PAYMENT_UPDATED: "Оплату оновлено",
  SHIPMENT_CREATED: "Відправлення створено",
  SHIPMENT_CREATION_ENQUEUED: "Створення відправлення додано в чергу",
  SHIPMENT_CREATION_FAILED: "Створення відправлення не вдалося",
  SHIPMENT_STATUS_SYNCED: "Статус відправлення синхронізовано",
};

export function getAuditEventLabel(eventType: string): string {
  return auditEventLabels[eventType] ?? "Подію замовлення оновлено";
}
