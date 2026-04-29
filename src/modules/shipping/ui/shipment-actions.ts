"use server";

import { revalidatePath } from "next/cache";
import {
  retryShipmentCreationUseCase,
  ShipmentCreationRetryUnavailableError,
  ShipmentRetryOrderNotFoundError,
} from "@/modules/shipping/application/retry-shipment-creation";
import { getAuditEventRepository } from "@/modules/orders/infrastructure/audit-event-repository-factory";
import { getOrderRepository } from "@/modules/orders/infrastructure/order-repository-factory";
import { getPaymentRepository } from "@/modules/payments/infrastructure/payment-repository-factory";
import { getShipmentJobQueue } from "@/modules/shipping/infrastructure/shipment-job-queue-factory";
import { getShipmentRepository } from "@/modules/shipping/infrastructure/shipment-repository-factory";
import { requireOwnerSession } from "@/modules/users/ui/require-owner-session";

export type ShipmentRetryActionResult =
  | {
      message: string;
      ok: false;
    }
  | {
      message: string;
      ok: true;
    };

export async function retryShipmentCreationAction(
  orderId: string,
): Promise<ShipmentRetryActionResult> {
  const owner = await requireOwnerSession();

  try {
    await retryShipmentCreationUseCase(
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
    if (
      error instanceof ShipmentCreationRetryUnavailableError ||
      error instanceof ShipmentRetryOrderNotFoundError
    ) {
      return {
        message: "Повторну спробу створення відправлення недоступно",
        ok: false,
      };
    }

    throw error;
  }

  revalidatePath("/dashboard");

  return {
    message: "Повторне створення відправлення заплановано",
    ok: true,
  };
}
