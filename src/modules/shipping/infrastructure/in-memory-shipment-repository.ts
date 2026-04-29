import { randomUUID } from "node:crypto";
import type {
  ShipmentRecord,
  ShipmentRepository,
} from "@/modules/shipping/application/shipment-repository";

export class InMemoryShipmentRepository implements ShipmentRepository {
  private readonly shipments = new Map<string, ShipmentRecord>();

  async findByOrderId(orderId: string): Promise<ShipmentRecord[]> {
    return [...this.shipments.values()].filter(
      (shipment) => shipment.orderId === orderId,
    );
  }

  async save(
    shipment: Omit<ShipmentRecord, "createdAt" | "id" | "updatedAt">,
  ): Promise<ShipmentRecord> {
    const now = new Date();
    const savedShipment: ShipmentRecord = {
      ...shipment,
      createdAt: now,
      id: randomUUID(),
      updatedAt: now,
    };

    this.shipments.set(savedShipment.id, savedShipment);

    return savedShipment;
  }

  async updateCreation(input: {
    carrierShipmentId: string;
    labelUrl: string | null;
    shipmentId: string;
    trackingNumber: string;
  }): Promise<ShipmentRecord> {
    const shipment = this.shipments.get(input.shipmentId);

    if (!shipment) {
      throw new Error("Shipment not found");
    }

    const updatedShipment: ShipmentRecord = {
      ...shipment,
      carrierShipmentId: input.carrierShipmentId,
      labelUrl: input.labelUrl,
      status: "CREATED",
      trackingNumber: input.trackingNumber,
      updatedAt: new Date(),
    };

    this.shipments.set(updatedShipment.id, updatedShipment);

    return updatedShipment;
  }

  async updateStatus(input: {
    deliveredAt?: Date | null;
    shipmentId: string;
    status: ShipmentRecord["status"];
    trackingNumber?: string | null;
  }): Promise<ShipmentRecord> {
    const shipment = this.shipments.get(input.shipmentId);

    if (!shipment) {
      throw new Error("Shipment not found");
    }

    const updatedShipment: ShipmentRecord = {
      ...shipment,
      deliveredAt:
        input.deliveredAt === undefined ? shipment.deliveredAt : input.deliveredAt,
      status: input.status,
      trackingNumber:
        input.trackingNumber === undefined
          ? shipment.trackingNumber
          : input.trackingNumber,
      updatedAt: new Date(),
    };

    this.shipments.set(updatedShipment.id, updatedShipment);

    return updatedShipment;
  }
}
