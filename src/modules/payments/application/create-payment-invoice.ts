import type { OrderRepository } from "@/modules/orders/application/order-repository";
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

  assertOrderStatusTransition(order.status, "PAYMENT_PENDING");
  await dependencies.orderRepository.updateStatus(order.id, "PAYMENT_PENDING");

  return {
    invoiceId: invoice.invoiceId,
    paymentId: updatedPayment.id,
    paymentRedirectUrl: invoice.pageUrl,
    status: "PAYMENT_PENDING",
  };
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
