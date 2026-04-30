"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { getOrderRepository } from "@/modules/orders/infrastructure/order-repository-factory";
import { PaymentInvoiceCannotBeCreatedError } from "@/modules/payments/application/create-payment-invoice";
import {
  retryOwnerMonobankInvoiceUseCase,
  retryPublicMonobankInvoiceUseCase,
} from "@/modules/payments/application/retry-payment-invoice";
import {
  PaymentProviderConfigurationError,
  PaymentProviderRequestError,
} from "@/modules/payments/application/payment-provider";
import { getMonobankPaymentProvider } from "@/modules/payments/infrastructure/payment-provider-factory";
import { getPaymentRepository } from "@/modules/payments/infrastructure/payment-repository-factory";
import { requireOwnerSession } from "@/modules/users/ui/require-owner-session";
import { getServerEnv } from "@/shared/config/env";

export type PaymentRetryActionResult =
  | {
      message: string;
      ok: false;
    }
  | {
      message: string;
      ok: true;
      paymentRedirectUrl: string;
    };

export async function retryPublicMonobankPaymentAction(
  publicToken: string,
): Promise<PaymentRetryActionResult> {
  const baseUrl = await getPublicBaseUrl();

  try {
    const invoice = await retryPublicMonobankInvoiceUseCase(
      {
        publicToken,
        redirectUrl: `${baseUrl}/o/${publicToken}`,
        webhookUrl: `${baseUrl}/api/webhooks/monobank`,
      },
      paymentRetryDependencies(),
    );

    revalidatePath(`/o/${publicToken}`);

    return {
      message: "Нове посилання для оплати MonoPay створено.",
      ok: true,
      paymentRedirectUrl: invoice.paymentRedirectUrl,
    };
  } catch (error) {
    return paymentRetryErrorResult(error);
  }
}

export async function retryOwnerMonobankPaymentAction(
  orderId: string,
): Promise<PaymentRetryActionResult> {
  const [owner, baseUrl] = await Promise.all([
    requireOwnerSession(),
    getPublicBaseUrl(),
  ]);

  try {
    const invoice = await retryOwnerMonobankInvoiceUseCase(
      {
        orderId,
        ownerId: owner.id,
        publicBaseUrl: baseUrl,
        webhookUrl: `${baseUrl}/api/webhooks/monobank`,
      },
      paymentRetryDependencies(),
    );

    revalidatePath(`/dashboard/orders/${orderId}`);
    revalidatePath(`/o/${invoice.publicToken}`);

    return {
      message: "Нове посилання для оплати MonoPay створено.",
      ok: true,
      paymentRedirectUrl: invoice.paymentRedirectUrl,
    };
  } catch (error) {
    return paymentRetryErrorResult(error);
  }
}

function paymentRetryDependencies() {
  return {
    orderRepository: getOrderRepository(),
    paymentProvider: getMonobankPaymentProvider(),
    paymentRepository: getPaymentRepository(),
  };
}

function paymentRetryErrorResult(error: unknown): PaymentRetryActionResult {
  if (
    error instanceof PaymentInvoiceCannotBeCreatedError ||
    error instanceof PaymentProviderConfigurationError ||
    error instanceof PaymentProviderRequestError
  ) {
    return {
      message: "Повторити оплату MonoPay зараз неможливо.",
      ok: false,
    };
  }

  throw error;
}

async function getPublicBaseUrl(): Promise<string> {
  const requestHeaders = await headers();
  const host =
    requestHeaders.get("x-forwarded-host") ?? requestHeaders.get("host");
  const env = getServerEnv();

  if (!host) {
    return env.BETTER_AUTH_URL ?? "http://localhost:3000";
  }

  const protocol =
    requestHeaders.get("x-forwarded-proto") ??
    (host.startsWith("localhost") || host.startsWith("127.") ? "http" : "https");

  return `${protocol}://${host}`;
}
