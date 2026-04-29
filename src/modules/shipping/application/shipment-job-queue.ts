export const shipmentJobNames = {
  autoCompleteDeliveredOrder: "auto-complete-delivered-order",
  createShipment: "create-shipment",
  syncShipmentStatus: "sync-shipment-status",
} as const;

export type CreateShipmentJobData = {
  orderId: string;
  requestedAt: string;
  requestedBy: "owner" | "system";
  shipmentId: string;
};

export type SyncShipmentStatusJobData = {
  orderId: string;
  requestedAt: string;
  shipmentId: string;
};

export type AutoCompleteDeliveredOrderJobData = {
  deliveredAt: string;
  orderId: string;
  requestedAt: string;
  shipmentId: string;
};

export interface ShipmentJobQueue {
  enqueueAutoCompleteDeliveredOrder(
    data: AutoCompleteDeliveredOrderJobData,
    options?: { startAfter?: Date },
  ): Promise<string | null>;
  enqueueCreateShipment(data: CreateShipmentJobData): Promise<string | null>;
  enqueueSyncShipmentStatus(
    data: SyncShipmentStatusJobData,
    options?: { startAfter?: Date },
  ): Promise<string | null>;
}
