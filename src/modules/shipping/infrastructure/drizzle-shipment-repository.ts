import { eq } from "drizzle-orm";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import type {
  ShipmentRecord,
  ShipmentRepository,
} from "@/modules/shipping/application/shipment-repository";
import * as schema from "@/shared/db/schema";

type Database = NodePgDatabase<typeof schema>;
type DbShipment = typeof schema.shipments.$inferSelect;

export class DrizzleShipmentRepository implements ShipmentRepository {
  constructor(private readonly db: Database) {}

  async findByOrderId(orderId: string): Promise<ShipmentRecord[]> {
    const shipments = await this.db
      .select()
      .from(schema.shipments)
      .where(eq(schema.shipments.orderId, orderId));

    return shipments.map(mapShipment);
  }

  async save(
    shipment: Omit<ShipmentRecord, "createdAt" | "id" | "updatedAt">,
  ): Promise<ShipmentRecord> {
    const [savedShipment] = await this.db
      .insert(schema.shipments)
      .values({
        addressText: shipment.addressText,
        carrier: shipment.carrier,
        carrierOfficeId: shipment.carrierOfficeId,
        carrierPayload: shipment.carrierPayload,
        carrierShipmentId: shipment.carrierShipmentId,
        cityName: shipment.cityName,
        cityRef: shipment.cityRef,
        deliveredAt: shipment.deliveredAt,
        labelUrl: shipment.labelUrl,
        orderId: shipment.orderId,
        recipientCustomerId: shipment.recipientCustomerId,
        status: shipment.status,
        trackingNumber: shipment.trackingNumber,
      })
      .returning();

    if (!savedShipment) {
      throw new Error("Failed to save shipment");
    }

    return mapShipment(savedShipment);
  }

  async updateCreation(input: {
    carrierShipmentId: string;
    labelUrl: string | null;
    shipmentId: string;
    trackingNumber: string;
  }): Promise<ShipmentRecord> {
    const [updatedShipment] = await this.db
      .update(schema.shipments)
      .set({
        carrierShipmentId: input.carrierShipmentId,
        labelUrl: input.labelUrl,
        status: "CREATED",
        trackingNumber: input.trackingNumber,
        updatedAt: new Date(),
      })
      .where(eq(schema.shipments.id, input.shipmentId))
      .returning();

    if (!updatedShipment) {
      throw new Error("Shipment not found");
    }

    return mapShipment(updatedShipment);
  }

  async updateStatus(input: {
    deliveredAt?: Date | null;
    shipmentId: string;
    status: ShipmentRecord["status"];
    trackingNumber?: string | null;
  }): Promise<ShipmentRecord> {
    const [updatedShipment] = await this.db
      .update(schema.shipments)
      .set({
        deliveredAt:
          input.deliveredAt === undefined ? undefined : input.deliveredAt,
        status: input.status,
        trackingNumber:
          input.trackingNumber === undefined ? undefined : input.trackingNumber,
        updatedAt: new Date(),
      })
      .where(eq(schema.shipments.id, input.shipmentId))
      .returning();

    if (!updatedShipment) {
      throw new Error("Shipment not found");
    }

    return mapShipment(updatedShipment);
  }
}

function mapShipment(shipment: DbShipment): ShipmentRecord {
  return {
    addressText: shipment.addressText,
    carrier: shipment.carrier,
    carrierOfficeId: shipment.carrierOfficeId,
    carrierPayload: shipment.carrierPayload,
    carrierShipmentId: shipment.carrierShipmentId,
    cityName: shipment.cityName,
    cityRef: shipment.cityRef,
    createdAt: shipment.createdAt,
    deliveredAt: shipment.deliveredAt,
    id: shipment.id,
    labelUrl: shipment.labelUrl,
    orderId: shipment.orderId,
    recipientCustomerId: shipment.recipientCustomerId,
    status: shipment.status,
    trackingNumber: shipment.trackingNumber,
    updatedAt: shipment.updatedAt,
  };
}
