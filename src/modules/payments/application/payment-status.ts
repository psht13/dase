import type { OrderStatus } from "@/modules/orders/domain/status";
import type { PaymentStatus } from "@/modules/payments/application/payment-repository";

export type PaymentStatusTransition = {
  failureReason: string | null;
  orderStatus: OrderStatus | null;
  paidAt: Date | null;
  paymentStatus: PaymentStatus;
};

export function mapProviderStatusToPaymentTransition(
  rawStatus: string,
  input: {
    failureReason: string | null;
    paidAt: Date | null;
  },
): PaymentStatusTransition {
  const normalizedStatus = rawStatus.toLowerCase();

  if (normalizedStatus === "success") {
    return {
      failureReason: null,
      orderStatus: "PAID",
      paidAt: input.paidAt,
      paymentStatus: "PAID",
    };
  }

  if (
    normalizedStatus === "failure" ||
    normalizedStatus === "fail" ||
    normalizedStatus === "expired"
  ) {
    return {
      failureReason: input.failureReason,
      orderStatus: "PAYMENT_FAILED",
      paidAt: null,
      paymentStatus: "FAILED",
    };
  }

  if (normalizedStatus === "reversed") {
    return {
      failureReason: input.failureReason,
      orderStatus: null,
      paidAt: input.paidAt,
      paymentStatus: "REFUNDED",
    };
  }

  if (normalizedStatus === "cancelled" || normalizedStatus === "canceled") {
    return {
      failureReason: input.failureReason,
      orderStatus: "PAYMENT_FAILED",
      paidAt: null,
      paymentStatus: "CANCELLED",
    };
  }

  return {
    failureReason: null,
    orderStatus: "PAYMENT_PENDING",
    paidAt: null,
    paymentStatus: "PENDING",
  };
}

export function getCustomerPaymentStatusMessage(
  orderStatus: string,
): string | null {
  if (orderStatus === "PAYMENT_PENDING") {
    return "Очікуємо підтвердження оплати MonoPay.";
  }

  if (orderStatus === "PAID") {
    return "Оплату MonoPay успішно підтверджено.";
  }

  if (orderStatus === "PAYMENT_FAILED") {
    return "Оплату MonoPay не вдалося провести. Зв’яжіться з продавцем.";
  }

  return null;
}
