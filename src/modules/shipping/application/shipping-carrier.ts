import type {
  ShipmentCarrier,
  ShipmentStatus,
} from "@/modules/shipping/application/shipment-repository";

export const publicDeliveryUnavailableMessage =
  "Доставка тимчасово недоступна. Зверніться до продавця.";

export const shipmentSettingsIncompleteMessage =
  "Налаштування доставки не завершено. Відправлення не створено.";

export const shipmentSettingsIncompleteSyncMessage =
  "Налаштування доставки не завершено. Автоматичне оновлення не виконано.";

export type ShippingCity = {
  id: string;
  name: string;
  region: string | null;
};

export type ShippingWarehouse = {
  address: string | null;
  cityId: string;
  id: string;
  name: string;
  number: string | null;
  type: string | null;
};

export type SearchCitiesInput = {
  limit?: number;
  query: string;
};

export type SearchWarehousesInput = {
  cityId: string;
  limit?: number;
  query?: string;
};

export type CreateShipmentInput = {
  carrier: ShipmentCarrier;
  declaredValueMinor: number;
  description: string;
  orderId: string;
  recipient: {
    cityId: string;
    cityName: string;
    fullName: string;
    phone: string;
    warehouseId: string;
    warehouseName: string;
  };
};

export type CreatedShipment = {
  carrierShipmentId: string;
  labelUrl: string | null;
  trackingNumber: string;
};

export type ShipmentStatusInput =
  | {
      carrierShipmentId: string;
      trackingNumber?: string;
    }
  | {
      carrierShipmentId?: string;
      trackingNumber: string;
    };

export type CarrierShipmentStatus = {
  status: ShipmentStatus;
  statusText: string | null;
  trackingNumber: string | null;
  updatedAt: Date | null;
};

export interface ShippingCarrier {
  createShipment(input: CreateShipmentInput): Promise<CreatedShipment>;
  getShipmentStatus(input: ShipmentStatusInput): Promise<CarrierShipmentStatus>;
  searchCities(input: SearchCitiesInput): Promise<ShippingCity[]>;
  searchWarehouses(input: SearchWarehousesInput): Promise<ShippingWarehouse[]>;
}

export type ShippingCarrierResolutionContext = {
  ownerId: string;
};

export type ShippingCarrierResolver = (
  carrier: ShipmentCarrier,
  context: ShippingCarrierResolutionContext,
) => Promise<ShippingCarrier> | ShippingCarrier;

export class ShippingCarrierSettingsUnavailableError extends Error {
  constructor(message = shipmentSettingsIncompleteMessage) {
    super(message);
    this.name = "ShippingCarrierSettingsUnavailableError";
  }
}
