"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import {
  confirmPublicOrderUseCase,
  PublicOrderCannotBeConfirmedError,
  PublicOrderConfirmationUnavailableError,
} from "@/modules/orders/application/confirm-public-order";
import { safeParseDeliveryFormValues } from "@/modules/orders/application/delivery-form-validation";
import { getAuditEventRepository } from "@/modules/orders/infrastructure/audit-event-repository-factory";
import { getCustomerRepository } from "@/modules/orders/infrastructure/customer-repository-factory";
import { getOrderRepository } from "@/modules/orders/infrastructure/order-repository-factory";
import { deliveryFormValuesFromFormData } from "@/modules/orders/ui/delivery-form-data";
import { getPaymentRepository } from "@/modules/payments/infrastructure/payment-repository-factory";
import { getShipmentRepository } from "@/modules/shipping/infrastructure/shipment-repository-factory";

export type DeliveryActionResult =
  | {
      fieldErrors?: Record<string, string[]>;
      message: string;
      ok: false;
    }
  | {
      message: string;
      ok: true;
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

  try {
    await confirmPublicOrderUseCase(
      {
        ...parsed.data,
        publicToken,
      },
      {
        auditEventRepository: getAuditEventRepository(),
        customerRepository: getCustomerRepository(),
        orderRepository: getOrderRepository(),
        paymentRepository: getPaymentRepository(),
        shipmentRepository: getShipmentRepository(),
      },
    );
  } catch (error) {
    return confirmationErrorResult(error);
  }

  revalidatePath(`/o/${publicToken}`);
  revalidatePath(`/o/${publicToken}/delivery`);

  return {
    message: "Замовлення підтверджено",
    ok: true,
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

  throw error;
}
