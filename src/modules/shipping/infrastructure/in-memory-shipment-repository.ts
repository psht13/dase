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
}
