import type { AuditEventRepository } from "@/modules/orders/application/audit-event-repository";
import type { OrderRepository } from "@/modules/orders/application/order-repository";
import type { OrderStatus } from "@/modules/orders/domain/status";
import { canTransitionOrderStatus } from "@/modules/orders/domain/status";
import type {
  AutoCompleteDeliveredOrderJobData,
  ShipmentJobQueue,
  SyncShipmentStatusJobData,
} from "@/modules/shipping/application/shipment-job-queue";
import type {
  ShippingCarrier,
  ShippingCarrierResolver,
} from "@/modules/shipping/application/shipping-carrier";
import {
  shipmentSettingsIncompleteSyncMessage,
  ShippingCarrierSettingsUnavailableError,
} from "@/modules/shipping/application/shipping-carrier";
import { isShipmentCreationEnabled } from "@/modules/shipping/application/shipping-carrier-registry";
import type {
  ShipmentRecord,
  ShipmentRepository,
  ShipmentStatus,
} from "@/modules/shipping/application/shipment-repository";

type SyncShipmentStatusDependencies = {
  auditEventRepository: AuditEventRepository;
  autoCompleteAfterDeliveredHours: number;
  getShippingCarrier: ShippingCarrierResolver;
  now?: () => Date;
  orderRepository: OrderRepository;
  shipmentJobQueue: ShipmentJobQueue;
  shipmentRepository: ShipmentRepository;
};

export async function syncShipmentStatusJobUseCase(
  input: SyncShipmentStatusJobData,
  dependencies: SyncShipmentStatusDependencies,
): Promise<ShipmentRecord> {
  const order = await dependencies.orderRepository.findById(input.orderId);
  const shipment = await findShipment(input, dependencies.shipmentRepository);

  if (!order || !shipment) {
    throw new Error("Order or shipment not found");
  }

  if (!isShipmentCreationEnabled(shipment.carrier)) {
    await dependencies.auditEventRepository.append({
      actorCustomerId: null,
      actorType: "SYSTEM",
      actorUserId: null,
      eventType: "SHIPMENT_STATUS_SYNCED",
      orderId: order.id,
      payload: {
        carrier: shipment.carrier,
        message:
          "Службу доставки вимкнено. Автоматичне оновлення не виконується.",
        shipmentStatus: shipment.status,
        trackingNumber: shipment.trackingNumber,
      },
    });

    return shipment;
  }

  let carrier: ShippingCarrier;

  try {
    carrier = await dependencies.getShippingCarrier(shipment.carrier, {
      ownerId: order.ownerId,
    });
  } catch (error) {
    if (error instanceof ShippingCarrierSettingsUnavailableError) {
      await dependencies.auditEventRepository.append({
        actorCustomerId: null,
        actorType: "SYSTEM",
        actorUserId: null,
        eventType: "SHIPMENT_STATUS_SYNCED",
        orderId: order.id,
        payload: {
          carrier: shipment.carrier,
          message: shipmentSettingsIncompleteSyncMessage,
          shipmentStatus: shipment.status,
          trackingNumber: shipment.trackingNumber,
        },
      });

      return shipment;
    }

    throw error;
  }

  const carrierStatus = await carrier.getShipmentStatus(
    shipment.carrierShipmentId
      ? {
          carrierShipmentId: shipment.carrierShipmentId,
          trackingNumber: shipment.trackingNumber ?? undefined,
        }
      : {
          trackingNumber: shipment.trackingNumber ?? "",
        },
  );
  const now = dependencies.now?.() ?? new Date();
  const deliveredAt =
    carrierStatus.status === "DELIVERED"
      ? carrierStatus.updatedAt ?? shipment.deliveredAt ?? now
      : shipment.deliveredAt;
  const updatedShipment = await dependencies.shipmentRepository.updateStatus({
    deliveredAt,
    shipmentId: shipment.id,
    status: carrierStatus.status,
    trackingNumber: carrierStatus.trackingNumber ?? shipment.trackingNumber,
  });
  const targetOrderStatus = mapShipmentStatusToOrderStatus(carrierStatus.status);

  if (targetOrderStatus) {
    const path = getOrderStatusPath(order.status, targetOrderStatus);

    for (const status of path) {
      await dependencies.orderRepository.updateStatus(order.id, status);
    }
  }

  await dependencies.auditEventRepository.append({
    actorCustomerId: null,
    actorType: "SYSTEM",
    actorUserId: null,
    eventType: "SHIPMENT_STATUS_SYNCED",
    orderId: order.id,
    payload: {
      carrier: shipment.carrier,
      message: "Статус доставки оновлено",
      shipmentStatus: carrierStatus.status,
      statusText: carrierStatus.statusText,
      trackingNumber: carrierStatus.trackingNumber ?? shipment.trackingNumber,
    },
  });

  if (carrierStatus.status === "DELIVERED" && deliveredAt) {
    const autoCompleteData: AutoCompleteDeliveredOrderJobData = {
      deliveredAt: deliveredAt.toISOString(),
      orderId: order.id,
      requestedAt: now.toISOString(),
      shipmentId: shipment.id,
    };

    await dependencies.shipmentJobQueue.enqueueAutoCompleteDeliveredOrder(
      autoCompleteData,
      {
        startAfter: new Date(
          deliveredAt.getTime() +
            dependencies.autoCompleteAfterDeliveredHours * 60 * 60 * 1000,
        ),
      },
    );
  } else if (carrierStatus.status === "CREATED" || carrierStatus.status === "IN_TRANSIT") {
    await dependencies.shipmentJobQueue.enqueueSyncShipmentStatus(
      {
        orderId: order.id,
        requestedAt: now.toISOString(),
        shipmentId: shipment.id,
      },
      { startAfter: new Date(now.getTime() + 60 * 60 * 1000) },
    );
  }

  return updatedShipment;
}

function mapShipmentStatusToOrderStatus(
  shipmentStatus: ShipmentStatus,
): OrderStatus | null {
  if (shipmentStatus === "CREATED") {
    return "SHIPMENT_CREATED";
  }

  if (shipmentStatus === "IN_TRANSIT") {
    return "IN_TRANSIT";
  }

  if (shipmentStatus === "DELIVERED") {
    return "DELIVERED";
  }

  if (shipmentStatus === "RETURNED") {
    return "RETURNED";
  }

  return null;
}

function getOrderStatusPath(
  currentStatus: OrderStatus,
  targetStatus: OrderStatus,
): OrderStatus[] {
  if (currentStatus === targetStatus) {
    return [];
  }

  if (canTransitionOrderStatus(currentStatus, targetStatus)) {
    return [targetStatus];
  }

  if (
    targetStatus === "RETURNED" &&
    canTransitionOrderStatus(currentStatus, "RETURN_REQUESTED")
  ) {
    return ["RETURN_REQUESTED", "RETURNED"];
  }

  if (
    targetStatus === "DELIVERED" &&
    canTransitionOrderStatus(currentStatus, "IN_TRANSIT") &&
    canTransitionOrderStatus("IN_TRANSIT", "DELIVERED")
  ) {
    return ["IN_TRANSIT", "DELIVERED"];
  }

  return [];
}

async function findShipment(
  input: SyncShipmentStatusJobData,
  shipmentRepository: ShipmentRepository,
): Promise<ShipmentRecord | null> {
  const shipments = await shipmentRepository.findByOrderId(input.orderId);

  return (
    shipments.find((shipment) => shipment.id === input.shipmentId) ?? null
  );
}
