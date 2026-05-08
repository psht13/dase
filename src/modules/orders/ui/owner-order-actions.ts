"use server";

import { revalidatePath } from "next/cache";
import {
  assignOrderTagUseCase,
  createAndAssignOrderTagUseCase,
  OrderTagNotFoundError,
  OrderTagOwnerOrderNotFoundError,
  OrderTagValidationError,
  removeOrderTagUseCase,
} from "@/modules/orders/application/manage-order-tags";
import {
  OwnerOrderStatusUpdateInvalidStatusError,
  OwnerOrderStatusUpdateNotAllowedError,
  OwnerOrderStatusUpdateNotFoundError,
  updateOwnerOrderStatusUseCase,
} from "@/modules/orders/application/update-owner-order-status";
import { getAuditEventRepository } from "@/modules/orders/infrastructure/audit-event-repository-factory";
import { getOrderRepository } from "@/modules/orders/infrastructure/order-repository-factory";
import { getOrderTagRepository } from "@/modules/orders/infrastructure/order-tag-repository-factory";
import {
  ManualCardPaymentCannotBeMarkedPaidError,
  ManualCardPaymentNotFoundError,
  markManualCardPaymentPaidUseCase,
} from "@/modules/payments/application/mark-manual-card-payment-paid";
import { getPaymentRepository } from "@/modules/payments/infrastructure/payment-repository-factory";
import { getShipmentJobQueue } from "@/modules/shipping/infrastructure/shipment-job-queue-factory";
import { getShipmentRepository } from "@/modules/shipping/infrastructure/shipment-repository-factory";
import { requireOwnerSession } from "@/modules/users/ui/require-owner-session";

export type OwnerOrderActionResult = {
  message: string;
  ok: boolean;
};

export async function createAndAssignOrderTagAction(
  orderId: string,
  formData: FormData,
): Promise<OwnerOrderActionResult> {
  const owner = await requireOwnerSession();

  try {
    await createAndAssignOrderTagUseCase(
      {
        name: formValue(formData, "tagName"),
        orderId,
        ownerId: owner.id,
      },
      tagDependencies(),
    );
  } catch (error) {
    return tagErrorResult(error);
  }

  revalidateOrderPages(orderId);

  return {
    message: "Тег додано до замовлення",
    ok: true,
  };
}

export async function assignOrderTagAction(
  orderId: string,
  formData: FormData,
): Promise<OwnerOrderActionResult> {
  const owner = await requireOwnerSession();

  try {
    await assignOrderTagUseCase(
      {
        orderId,
        ownerId: owner.id,
        tagId: formValue(formData, "tagId"),
      },
      tagDependencies(),
    );
  } catch (error) {
    return tagErrorResult(error);
  }

  revalidateOrderPages(orderId);

  return {
    message: "Тег додано до замовлення",
    ok: true,
  };
}

export async function removeOrderTagAction(
  orderId: string,
  formData: FormData,
): Promise<OwnerOrderActionResult> {
  const owner = await requireOwnerSession();

  try {
    await removeOrderTagUseCase(
      {
        orderId,
        ownerId: owner.id,
        tagId: formValue(formData, "tagId"),
      },
      tagDependencies(),
    );
  } catch (error) {
    return tagErrorResult(error);
  }

  revalidateOrderPages(orderId);

  return {
    message: "Тег знято із замовлення",
    ok: true,
  };
}

export async function updateOwnerOrderStatusAction(
  orderId: string,
  formData: FormData,
): Promise<OwnerOrderActionResult> {
  const owner = await requireOwnerSession();

  try {
    await updateOwnerOrderStatusUseCase(
      {
        nextStatus: formValue(formData, "status"),
        orderId,
        ownerId: owner.id,
      },
      {
        auditEventRepository: getAuditEventRepository(),
        orderRepository: getOrderRepository(),
      },
    );
  } catch (error) {
    if (error instanceof OwnerOrderStatusUpdateInvalidStatusError) {
      return {
        message: "Оберіть коректний статус замовлення",
        ok: false,
      };
    }

    if (error instanceof OwnerOrderStatusUpdateNotAllowedError) {
      return {
        message: "Такий перехід статусу недоступний",
        ok: false,
      };
    }

    if (error instanceof OwnerOrderStatusUpdateNotFoundError) {
      return {
        message: "Замовлення не знайдено",
        ok: false,
      };
    }

    throw error;
  }

  revalidateOrderPages(orderId);

  return {
    message: "Статус замовлення оновлено",
    ok: true,
  };
}

export async function markManualCardPaymentPaidAction(
  orderId: string,
): Promise<OwnerOrderActionResult> {
  const owner = await requireOwnerSession();

  try {
    await markManualCardPaymentPaidUseCase(
      {
        orderId,
        ownerId: owner.id,
      },
      {
        auditEventRepository: getAuditEventRepository(),
        orderRepository: getOrderRepository(),
        paymentRepository: getPaymentRepository(),
        shipmentJobQueue: getShipmentJobQueue(),
        shipmentRepository: getShipmentRepository(),
      },
    );
  } catch (error) {
    if (error instanceof ManualCardPaymentNotFoundError) {
      return {
        message: "Оплату для цього замовлення не знайдено",
        ok: false,
      };
    }

    if (error instanceof ManualCardPaymentCannotBeMarkedPaidError) {
      return {
        message: "Цю оплату не можна позначити отриманою",
        ok: false,
      };
    }

    throw error;
  }

  revalidateOrderPages(orderId);

  return {
    message: "Оплату позначено отриманою",
    ok: true,
  };
}

function tagDependencies() {
  return {
    auditEventRepository: getAuditEventRepository(),
    orderRepository: getOrderRepository(),
    orderTagRepository: getOrderTagRepository(),
  };
}

function tagErrorResult(error: unknown): OwnerOrderActionResult {
  if (error instanceof OrderTagValidationError) {
    return {
      message: "Назва тегу має містити від 2 до 40 символів",
      ok: false,
    };
  }

  if (error instanceof OrderTagNotFoundError) {
    return {
      message: "Тег не знайдено",
      ok: false,
    };
  }

  if (error instanceof OrderTagOwnerOrderNotFoundError) {
    return {
      message: "Замовлення не знайдено",
      ok: false,
    };
  }

  throw error;
}

function formValue(formData: FormData, key: string): string {
  const value = formData.get(key);

  return typeof value === "string" ? value : "";
}

function revalidateOrderPages(orderId: string): void {
  revalidatePath("/dashboard/orders");
  revalidatePath(`/dashboard/orders/${orderId}`);
}
