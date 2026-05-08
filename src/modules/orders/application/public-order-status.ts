import type { OrderStatus } from "@/modules/orders/domain/status";

export const publicOrderStatusMessages: Record<OrderStatus, string> = {
  CANCELLED: "Замовлення скасовано.",
  COMPLETED: "Замовлення завершено.",
  CONFIRMED_BY_CUSTOMER: "Ваше замовлення обробляється.",
  DELIVERED: "Замовлення доставлено.",
  DRAFT: "Замовлення ще не готове до підтвердження.",
  IN_TRANSIT: "Замовлення вже в дорозі.",
  PAID: "Оплату отримано. Ваше замовлення обробляється.",
  PAYMENT_FAILED: "Оплата не підтверджена. Зверніться до продавця в чаті.",
  PAYMENT_PENDING: "Очікуємо оплату картою.",
  RETURNED: "Замовлення повернено.",
  RETURN_REQUESTED: "Повернення опрацьовується.",
  SENT_TO_CUSTOMER: "Перевірте товари та підтвердьте замовлення.",
  SHIPMENT_CREATED: "Відправлення створено.",
  SHIPMENT_PENDING: "Ваше замовлення обробляється. Готуємо відправлення.",
};

export function getPublicOrderStatusMessage(status: OrderStatus): string {
  return publicOrderStatusMessages[status];
}
