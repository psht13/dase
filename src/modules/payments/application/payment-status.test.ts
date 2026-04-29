import {
  getCustomerPaymentStatusMessage,
  mapProviderStatusToPaymentTransition,
} from "@/modules/payments/application/payment-status";

describe("payment status mapping", () => {
  it("maps Monobank success and failure statuses to internal transitions", () => {
    const paidAt = new Date("2026-04-30T12:00:00.000Z");

    expect(
      mapProviderStatusToPaymentTransition("success", {
        failureReason: null,
        paidAt,
      }),
    ).toMatchObject({
      orderStatus: "PAID",
      paymentStatus: "PAID",
    });
    expect(
      mapProviderStatusToPaymentTransition("fail", {
        failureReason: "Помилка банку",
        paidAt,
      }),
    ).toMatchObject({
      paymentStatus: "FAILED",
    });
    expect(
      mapProviderStatusToPaymentTransition("expired", {
        failureReason: "Термін дії рахунку завершився",
        paidAt,
      }),
    ).toMatchObject({
      orderStatus: "PAYMENT_FAILED",
      paymentStatus: "FAILED",
    });
    expect(
      mapProviderStatusToPaymentTransition("reversed", {
        failureReason: "Повернення",
        paidAt,
      }),
    ).toMatchObject({
      orderStatus: null,
      paymentStatus: "REFUNDED",
    });
    expect(
      mapProviderStatusToPaymentTransition("cancelled", {
        failureReason: "Скасовано",
        paidAt,
      }),
    ).toMatchObject({
      orderStatus: "PAYMENT_FAILED",
      paymentStatus: "CANCELLED",
    });
    expect(
      mapProviderStatusToPaymentTransition("created", {
        failureReason: null,
        paidAt,
      }),
    ).toMatchObject({
      orderStatus: "PAYMENT_PENDING",
      paymentStatus: "PENDING",
    });
    expect(
      mapProviderStatusToPaymentTransition("failure", {
        failureReason: "Недостатньо коштів",
        paidAt,
      }),
    ).toMatchObject({
      failureReason: "Недостатньо коштів",
      orderStatus: "PAYMENT_FAILED",
      paymentStatus: "FAILED",
    });
  });

  it("returns Ukrainian customer-facing payment messages", () => {
    expect(getCustomerPaymentStatusMessage("PAYMENT_PENDING")).toBe(
      "Очікуємо підтвердження оплати MonoPay.",
    );
    expect(
      getCustomerPaymentStatusMessage("PAID", {
        provider: "MONOBANK",
        status: "PAID",
      }),
    ).toBe("Оплату MonoPay успішно підтверджено.");
    expect(
      getCustomerPaymentStatusMessage("SHIPMENT_PENDING", {
        provider: "MONOBANK",
        status: "PAID",
      }),
    ).toBe(
      "Оплату MonoPay успішно підтверджено.",
    );
    expect(
      getCustomerPaymentStatusMessage("PAYMENT_FAILED", {
        provider: "MONOBANK",
        status: "FAILED",
      }),
    ).toBe(
      "Оплату MonoPay не вдалося провести. Зв’яжіться з продавцем.",
    );
    expect(
      getCustomerPaymentStatusMessage("SHIPMENT_PENDING", {
        provider: "CASH_ON_DELIVERY",
        status: "PENDING",
      }),
    ).toBeNull();
    expect(getCustomerPaymentStatusMessage("SENT_TO_CUSTOMER")).toBeNull();
  });
});
