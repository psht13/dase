export type ShipmentCarrier = "NOVA_POSHTA" | "UKRPOSHTA";
export type ShipmentStatus =
  | "PENDING"
  | "CREATED"
  | "IN_TRANSIT"
  | "DELIVERED"
  | "RETURNED"
  | "FAILED"
  | "CANCELLED";

export type ShipmentRecord = {
  addressText: string | null;
  carrier: ShipmentCarrier;
  carrierOfficeId: string | null;
  carrierPayload: Record<string, unknown> | null;
  carrierShipmentId: string | null;
  cityName: string | null;
  cityRef: string | null;
  createdAt: Date;
  deliveredAt: Date | null;
  id: string;
  labelUrl: string | null;
  orderId: string;
  recipientCustomerId: string | null;
  status: ShipmentStatus;
  trackingNumber: string | null;
  updatedAt: Date;
};

export interface ShipmentRepository {
  findByOrderId(orderId: string): Promise<ShipmentRecord[]>;
  save(
    shipment: Omit<ShipmentRecord, "createdAt" | "id" | "updatedAt">,
  ): Promise<ShipmentRecord>;
}
