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
