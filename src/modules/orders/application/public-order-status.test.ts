import { getPublicOrderStatusMessage } from "@/modules/orders/application/public-order-status";

describe("getPublicOrderStatusMessage", () => {
  it.each([
    ["CONFIRMED_BY_CUSTOMER", "Ваше замовлення обробляється."],
    ["PAYMENT_PENDING", "Очікуємо оплату картою."],
    ["PAID", "Оплату отримано. Ваше замовлення обробляється."],
    ["SHIPMENT_PENDING", "Ваше замовлення обробляється. Готуємо відправлення."],
    ["SHIPMENT_CREATED", "Відправлення створено."],
    ["IN_TRANSIT", "Замовлення вже в дорозі."],
    ["DELIVERED", "Замовлення доставлено."],
    ["COMPLETED", "Замовлення завершено."],
    ["PAYMENT_FAILED", "Оплата не підтверджена. Зверніться до продавця в чаті."],
    ["RETURN_REQUESTED", "Повернення опрацьовується."],
    ["RETURNED", "Замовлення повернено."],
    ["CANCELLED", "Замовлення скасовано."],
  ] as const)("returns Ukrainian public copy for %s", (status, message) => {
    expect(getPublicOrderStatusMessage(status)).toBe(message);
  });
});
