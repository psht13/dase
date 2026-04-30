import type { OrderRepository } from "@/modules/orders/application/order-repository";
import type { OrderStatus } from "@/modules/orders/domain/status";
import { assertOrderStatusTransition } from "@/modules/orders/domain/status";
import type { PaymentProvider } from "@/modules/payments/application/payment-provider";
import type {
  PaymentRecord,
  PaymentRepository,
} from "@/modules/payments/application/payment-repository";

export type CreatePaymentInvoiceInput = {
  orderId: string;
  redirectUrl: string;
  webhookUrl: string;
};

export type CreatePaymentInvoiceResult = {
  invoiceId: string;
  paymentId: string;
  paymentRedirectUrl: string;
  status: "PAYMENT_PENDING";
};

type CreatePaymentInvoiceDependencies = {
  orderRepository: OrderRepository;
  paymentProvider: PaymentProvider;
  paymentRepository: PaymentRepository;
};

export class PaymentInvoiceCannotBeCreatedError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PaymentInvoiceCannotBeCreatedError";
  }
}

export async function createPaymentInvoiceUseCase(
  input: CreatePaymentInvoiceInput,
  dependencies: CreatePaymentInvoiceDependencies,
): Promise<CreatePaymentInvoiceResult> {
  const order = await dependencies.orderRepository.findById(input.orderId);

  if (!order) {
    throw new PaymentInvoiceCannotBeCreatedError("Order not found");
  }

  const payment = await findMonobankPayment(
    input.orderId,
    dependencies.paymentRepository,
  );

  if (!payment) {
    throw new PaymentInvoiceCannotBeCreatedError(
      "Monobank payment record not found",
    );
  }

  if (!canCreateMonobankInvoiceForPayment(order.status, payment)) {
    throw new PaymentInvoiceCannotBeCreatedError(
      "Monobank payment cannot be retried",
    );
  }

  const invoice = await dependencies.paymentProvider.createInvoice({
    amountMinor: payment.amountMinor,
    currency: payment.currency,
    description: `Оплата замовлення Dase ${order.id}`,
    items: order.items.map((item) => ({
      code: item.productSkuSnapshot,
      name: item.productNameSnapshot,
      quantity: item.quantity,
      totalMinor: item.lineTotalMinor,
      unitPriceMinor: item.unitPriceMinor,
    })),
    orderId: order.id,
    redirectUrl: input.redirectUrl,
    reference: order.id,
    webhookUrl: input.webhookUrl,
  });

  const updatedPayment =
    await dependencies.paymentRepository.updateProviderInvoice({
      paymentId: payment.id,
      providerInvoiceId: invoice.invoiceId,
      providerModifiedAt: invoice.providerModifiedAt,
    });

  if (
    updatedPayment.status !== "PENDING" ||
    updatedPayment.failureReason ||
    updatedPayment.paidAt
  ) {
    await dependencies.paymentRepository.updateStatus({
      failureReason: null,
      paidAt: null,
      paymentId: updatedPayment.id,
      providerModifiedAt: invoice.providerModifiedAt,
      status: "PENDING",
    });
  }

  if (order.status !== "PAYMENT_PENDING") {
    assertOrderStatusTransition(order.status, "PAYMENT_PENDING");
    await dependencies.orderRepository.updateStatus(order.id, "PAYMENT_PENDING");
  }

  return {
    invoiceId: invoice.invoiceId,
    paymentId: updatedPayment.id,
    paymentRedirectUrl: invoice.pageUrl,
    status: "PAYMENT_PENDING",
  };
}

export function canCreateMonobankInvoiceForPayment(
  orderStatus: OrderStatus,
  payment: PaymentRecord,
): boolean {
  if (payment.provider !== "MONOBANK") {
    return false;
  }

  if (["PAID", "CANCELLED", "REFUNDED"].includes(payment.status)) {
    return false;
  }

  if (
    !["CONFIRMED_BY_CUSTOMER", "PAYMENT_PENDING", "PAYMENT_FAILED"].includes(
      orderStatus,
    )
  ) {
    return false;
  }

  return (
    payment.providerInvoiceId === null ||
    payment.status === "FAILED" ||
    orderStatus === "PAYMENT_FAILED"
  );
}

async function findMonobankPayment(
  orderId: string,
  paymentRepository: PaymentRepository,
): Promise<PaymentRecord | null> {
  const payments = await paymentRepository.findByOrderId(orderId);

  return (
    payments.find((payment) => payment.provider === "MONOBANK") ?? null
  );
}
