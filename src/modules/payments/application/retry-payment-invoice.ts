import type { OrderRepository } from "@/modules/orders/application/order-repository";
import { isValidPublicOrderToken } from "@/modules/orders/application/public-order-token";
import {
  createPaymentInvoiceUseCase,
  type CreatePaymentInvoiceResult,
  PaymentInvoiceCannotBeCreatedError,
} from "@/modules/payments/application/create-payment-invoice";
import type { PaymentProvider } from "@/modules/payments/application/payment-provider";
import type { PaymentRepository } from "@/modules/payments/application/payment-repository";

type RetryPaymentInvoiceDependencies = {
  orderRepository: OrderRepository;
  paymentProvider: PaymentProvider;
  paymentRepository: PaymentRepository;
};

export type RetryPaymentInvoiceResult = CreatePaymentInvoiceResult & {
  publicToken: string;
};

export async function retryPublicMonobankInvoiceUseCase(
  input: {
    now?: Date;
    publicToken: string;
    redirectUrl: string;
    webhookUrl: string;
  },
  dependencies: RetryPaymentInvoiceDependencies,
): Promise<RetryPaymentInvoiceResult> {
  if (!isValidPublicOrderToken(input.publicToken)) {
    throw new PaymentInvoiceCannotBeCreatedError("Public order not found");
  }

  const order = await dependencies.orderRepository.findByPublicToken(
    input.publicToken,
  );

  if (!order || order.status === "CANCELLED") {
    throw new PaymentInvoiceCannotBeCreatedError("Public order not found");
  }

  const now = input.now ?? new Date();

  if (order.publicTokenExpiresAt.getTime() <= now.getTime()) {
    throw new PaymentInvoiceCannotBeCreatedError("Public order expired");
  }

  const invoice = await createPaymentInvoiceUseCase(
    {
      orderId: order.id,
      redirectUrl: input.redirectUrl,
      webhookUrl: input.webhookUrl,
    },
    dependencies,
  );

  return {
    ...invoice,
    publicToken: order.publicToken,
  };
}

export async function retryOwnerMonobankInvoiceUseCase(
  input: {
    orderId: string;
    ownerId: string;
    publicBaseUrl: string;
    webhookUrl: string;
  },
  dependencies: RetryPaymentInvoiceDependencies,
): Promise<RetryPaymentInvoiceResult> {
  const order = await dependencies.orderRepository.findById(input.orderId);

  if (!order || order.ownerId !== input.ownerId) {
    throw new PaymentInvoiceCannotBeCreatedError("Owner order not found");
  }

  const invoice = await createPaymentInvoiceUseCase(
    {
      orderId: order.id,
      redirectUrl: `${input.publicBaseUrl}/o/${order.publicToken}`,
      webhookUrl: input.webhookUrl,
    },
    dependencies,
  );

  return {
    ...invoice,
    publicToken: order.publicToken,
  };
}
