import type { AuditEventRepository } from "@/modules/orders/application/audit-event-repository";
import type { CustomerRepository } from "@/modules/orders/application/customer-repository";
import type { OrderRepository } from "@/modules/orders/application/order-repository";
import { assertOrderStatusTransition } from "@/modules/orders/domain/status";
import type { CreateShipmentJobData } from "@/modules/shipping/application/shipment-job-queue";
import type { ShipmentJobQueue } from "@/modules/shipping/application/shipment-job-queue";
import type {
  ShippingCarrier,
} from "@/modules/shipping/application/shipping-carrier";
import type {
  ShipmentCarrier,
  ShipmentRecord,
  ShipmentRepository,
} from "@/modules/shipping/application/shipment-repository";

type CreateShipmentJobDependencies = {
  auditEventRepository: AuditEventRepository;
  customerRepository: CustomerRepository;
  getShippingCarrier: (carrier: ShipmentCarrier) => ShippingCarrier;
  now?: () => Date;
  orderRepository: OrderRepository;
  shipmentJobQueue: ShipmentJobQueue;
  shipmentRepository: ShipmentRepository;
};

export class ShipmentJobCannotBeProcessedError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ShipmentJobCannotBeProcessedError";
  }
}

export async function createShipmentJobUseCase(
  input: CreateShipmentJobData,
  dependencies: CreateShipmentJobDependencies,
): Promise<ShipmentRecord> {
  const order = await dependencies.orderRepository.findById(input.orderId);

  if (!order) {
    throw new ShipmentJobCannotBeProcessedError("Order not found");
  }

  const shipment = await findShipment(input, dependencies.shipmentRepository);

  if (!shipment) {
    throw new ShipmentJobCannotBeProcessedError("Shipment not found");
  }

  if (order.status !== "SHIPMENT_PENDING") {
    throw new ShipmentJobCannotBeProcessedError(
      `Order ${order.id} is not pending shipment`,
    );
  }

  const customerId = shipment.recipientCustomerId ?? order.customerId;

  if (!customerId) {
    throw new ShipmentJobCannotBeProcessedError("Shipment recipient is missing");
  }

  const customer = await dependencies.customerRepository.findById(customerId);

  if (!customer) {
    throw new ShipmentJobCannotBeProcessedError("Shipment recipient not found");
  }

  if (!shipment.cityRef || !shipment.cityName || !shipment.carrierOfficeId) {
    throw new ShipmentJobCannotBeProcessedError("Shipment address is incomplete");
  }

  const carrier = dependencies.getShippingCarrier(shipment.carrier);

  try {
    const createdShipment = await carrier.createShipment({
      carrier: shipment.carrier,
      declaredValueMinor: order.totalMinor,
      description: `Замовлення Dase ${order.id}`,
      orderId: order.id,
      recipient: {
        cityId: shipment.cityRef,
        cityName: shipment.cityName,
        fullName: customer.fullName,
        phone: customer.phone,
        warehouseId: shipment.carrierOfficeId,
        warehouseName: getWarehouseName(shipment),
      },
    });

    const updatedShipment = await dependencies.shipmentRepository.updateCreation({
      carrierShipmentId: createdShipment.carrierShipmentId,
      labelUrl: createdShipment.labelUrl,
      shipmentId: shipment.id,
      trackingNumber: createdShipment.trackingNumber,
    });

    assertOrderStatusTransition(order.status, "SHIPMENT_CREATED");
    await dependencies.orderRepository.updateStatus(order.id, "SHIPMENT_CREATED");

    await dependencies.auditEventRepository.append({
      actorCustomerId: null,
      actorType: "SYSTEM",
      actorUserId: null,
      eventType: "SHIPMENT_CREATED",
      orderId: order.id,
      payload: {
        carrier: shipment.carrier,
        carrierShipmentId: createdShipment.carrierShipmentId,
        labelUrl: createdShipment.labelUrl,
        message: "Відправлення створено",
        trackingNumber: createdShipment.trackingNumber,
      },
    });

    const now = dependencies.now?.() ?? new Date();
    await dependencies.shipmentJobQueue.enqueueSyncShipmentStatus(
      {
        orderId: order.id,
        requestedAt: now.toISOString(),
        shipmentId: shipment.id,
      },
      { startAfter: new Date(now.getTime() + 15 * 60 * 1000) },
    );

    return updatedShipment;
  } catch (error) {
    await dependencies.shipmentRepository.updateStatus({
      shipmentId: shipment.id,
      status: "FAILED",
    });
    await dependencies.auditEventRepository.append({
      actorCustomerId: null,
      actorType: "SYSTEM",
      actorUserId: null,
      eventType: "SHIPMENT_CREATION_FAILED",
      orderId: order.id,
      payload: {
        message: "Створення відправлення не вдалося",
        reason: error instanceof Error ? error.message : "Unknown error",
        shipmentId: shipment.id,
      },
    });

    throw error;
  }
}

async function findShipment(
  input: CreateShipmentJobData,
  shipmentRepository: ShipmentRepository,
): Promise<ShipmentRecord | null> {
  const shipments = await shipmentRepository.findByOrderId(input.orderId);

  return (
    shipments.find((shipment) => shipment.id === input.shipmentId) ??
    shipments.find((shipment) => shipment.status === "PENDING") ??
    shipments.find((shipment) => shipment.status === "FAILED") ??
    null
  );
}

function getWarehouseName(shipment: ShipmentRecord): string {
  const warehouseName =
    shipment.carrierPayload &&
    typeof shipment.carrierPayload.warehouseName === "string"
      ? shipment.carrierPayload.warehouseName
      : null;

  return warehouseName ?? shipment.addressText ?? shipment.carrierOfficeId ?? "";
}
