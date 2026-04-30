"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { z } from "zod";
import {
  confirmPublicOrderUseCase,
  PublicOrderCannotBeConfirmedError,
  PublicOrderConfirmationUnavailableError,
} from "@/modules/orders/application/confirm-public-order";
import { safeParseDeliveryFormValues } from "@/modules/orders/application/delivery-form-validation";
import { getAuditEventRepository } from "@/modules/orders/infrastructure/audit-event-repository-factory";
import { getCustomerRepository } from "@/modules/orders/infrastructure/customer-repository-factory";
import { getCustomerConfirmationUnitOfWork } from "@/modules/orders/infrastructure/customer-confirmation-unit-of-work-factory";
import { getOrderRepository } from "@/modules/orders/infrastructure/order-repository-factory";
import { deliveryFormValuesFromFormData } from "@/modules/orders/ui/delivery-form-data";
import {
  createPaymentInvoiceUseCase,
  PaymentInvoiceCannotBeCreatedError,
} from "@/modules/payments/application/create-payment-invoice";
import {
  PaymentProviderConfigurationError,
  PaymentProviderRequestError,
} from "@/modules/payments/application/payment-provider";
import { getMonobankPaymentProvider } from "@/modules/payments/infrastructure/payment-provider-factory";
import { getPaymentRepository } from "@/modules/payments/infrastructure/payment-repository-factory";
import { getShipmentJobQueue } from "@/modules/shipping/infrastructure/shipment-job-queue-factory";
import { getShipmentRepository } from "@/modules/shipping/infrastructure/shipment-repository-factory";
import { getServerEnv } from "@/shared/config/env";

export type DeliveryActionResult =
  | {
      fieldErrors?: Record<string, string[]>;
      message: string;
      ok: false;
    }
  | {
      message: string;
      ok: true;
      paymentRedirectUrl?: string;
    };

export async function confirmDeliveryAction(
  publicToken: string,
  formData: FormData,
): Promise<DeliveryActionResult> {
  const parsed = safeParseDeliveryFormValues(
    deliveryFormValuesFromFormData(formData),
  );

  if (!parsed.success) {
    return validationErrorResult(parsed.error);
  }

  let paymentRedirectUrl: string | undefined;

  try {
    const confirmation = await confirmPublicOrderUseCase(
      {
        ...parsed.data,
        publicToken,
      },
      {
        auditEventRepository: getAuditEventRepository(),
        customerConfirmationUnitOfWork: getCustomerConfirmationUnitOfWork(),
        customerRepository: getCustomerRepository(),
        orderRepository: getOrderRepository(),
        paymentRepository: getPaymentRepository(),
        shipmentJobQueue: getShipmentJobQueue(),
        shipmentRepository: getShipmentRepository(),
      },
    );

    if (parsed.data.paymentMethod === "MONOBANK") {
      const baseUrl = await getPublicBaseUrl();
      const invoice = await createPaymentInvoiceUseCase(
        {
          orderId: confirmation.orderId,
          redirectUrl: `${baseUrl}/o/${publicToken}`,
          webhookUrl: `${baseUrl}/api/webhooks/monobank`,
        },
        {
          orderRepository: getOrderRepository(),
          paymentProvider: getMonobankPaymentProvider(),
          paymentRepository: getPaymentRepository(),
        },
      );

      paymentRedirectUrl = invoice.paymentRedirectUrl;
    }
  } catch (error) {
    return confirmationErrorResult(error);
  }

  revalidatePath(`/o/${publicToken}`);
  revalidatePath(`/o/${publicToken}/delivery`);

  return {
    message: paymentRedirectUrl
      ? "Замовлення підтверджено. Переходимо до оплати MonoPay."
      : "Замовлення підтверджено. Оплата при отриманні.",
    ok: true,
    paymentRedirectUrl,
  };
}

function validationErrorResult(
  error: z.ZodError,
): Extract<DeliveryActionResult, { ok: false }> {
  const flattenedFieldErrors = error.flatten().fieldErrors as Record<
    string,
    string[] | undefined
  >;
  const fieldErrors = Object.fromEntries(
    Object.entries(flattenedFieldErrors).map(([field, messages = []]) => [
      field,
      messages.filter(Boolean),
    ]),
  );

  return {
    fieldErrors,
    message: "Перевірте дані доставки",
    ok: false,
  };
}

function confirmationErrorResult(
  error: unknown,
): Extract<DeliveryActionResult, { ok: false }> {
  if (error instanceof PublicOrderConfirmationUnavailableError) {
    return {
      message: "Посилання недоступне або термін його дії завершився",
      ok: false,
    };
  }

  if (error instanceof PublicOrderCannotBeConfirmedError) {
    return {
      message: "Замовлення вже не можна підтвердити",
      ok: false,
    };
  }

  if (
    error instanceof PaymentInvoiceCannotBeCreatedError ||
    error instanceof PaymentProviderConfigurationError ||
    error instanceof PaymentProviderRequestError
  ) {
    return {
      message:
        "Замовлення підтверджено, але посилання для оплати MonoPay не створено. Зв’яжіться з продавцем.",
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
