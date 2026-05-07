import type { ShipmentCarrier } from "@/modules/shipping/application/shipment-repository";

export type ShippingCarrierRegistryEntry = {
  code: ShipmentCarrier;
  label: string;
  legacy: boolean;
  searchEnabled: boolean;
  shipmentCreationEnabled: boolean;
};

export const shippingCarrierRegistry = {
  NOVA_POSHTA: {
    code: "NOVA_POSHTA",
    label: "Нова пошта",
    legacy: false,
    searchEnabled: true,
    shipmentCreationEnabled: true,
  },
  UKRPOSHTA: {
    code: "UKRPOSHTA",
    label: "Укрпошта (вимкнено)",
    legacy: true,
    searchEnabled: false,
    shipmentCreationEnabled: false,
  },
} satisfies Record<ShipmentCarrier, ShippingCarrierRegistryEntry>;

export const activeShippingCarriers = Object.values(
  shippingCarrierRegistry,
).filter(isActiveShippingCarrierEntry);

export function getShippingCarrierConfig(
  carrier: ShipmentCarrier,
): ShippingCarrierRegistryEntry {
  return shippingCarrierRegistry[carrier];
}

export function getShippingCarrierLabel(carrier: ShipmentCarrier): string {
  return getShippingCarrierConfig(carrier).label;
}

export function getShippingCarrierOptionsForRecords(
  historicalCarriers: Iterable<ShipmentCarrier>,
): ShippingCarrierRegistryEntry[] {
  const historicalCarrierSet = new Set(historicalCarriers);

  return Object.values(shippingCarrierRegistry).filter(
    (carrier) =>
      isActiveShippingCarrierEntry(carrier) ||
      historicalCarrierSet.has(carrier.code),
  );
}

export function isKnownShippingCarrier(
  value: string | null | undefined,
): value is ShipmentCarrier {
  return (
    typeof value === "string" &&
    Object.hasOwn(shippingCarrierRegistry, value)
  );
}

export function isActiveShippingCarrier(
  value: string | null | undefined,
): value is ShipmentCarrier {
  return (
    isKnownShippingCarrier(value) &&
    isActiveShippingCarrierEntry(shippingCarrierRegistry[value])
  );
}

export function isShippingCarrierSearchEnabled(
  carrier: ShipmentCarrier,
): boolean {
  return getShippingCarrierConfig(carrier).searchEnabled;
}

export function isShipmentCreationEnabled(
  carrier: ShipmentCarrier,
): boolean {
  return getShippingCarrierConfig(carrier).shipmentCreationEnabled;
}

function isActiveShippingCarrierEntry(
  carrier: ShippingCarrierRegistryEntry,
): boolean {
  return (
    !carrier.legacy &&
    carrier.searchEnabled &&
    carrier.shipmentCreationEnabled
  );
}
