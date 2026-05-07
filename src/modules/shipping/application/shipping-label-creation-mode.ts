import type { ShipmentCarrier } from "@/modules/shipping/application/shipment-repository";

export const shippingLabelCreationModes = ["disabled", "mock", "live"] as const;

export type ShippingLabelCreationMode =
  (typeof shippingLabelCreationModes)[number];

export type ShipmentCreationConfigValidation =
  | {
      ok: true;
    }
  | {
      missingKeys: string[];
      ok: false;
      reason: string;
    };

export const shippingLabelCreationDisabledMessage =
  "Створення відправлень вимкнено до завершення виробничих налаштувань доставки.";

export function createMissingShipmentConfigMessage(
  carrier: ShipmentCarrier,
  missingKeys: string[],
): string {
  const carrierLabel =
    carrier === "NOVA_POSHTA" ? "Нова пошта" : "обраної служби доставки";

  return `Налаштування ${carrierLabel} для створення відправлень неповні: ${missingKeys.join(", ")}. Відправлення не створено.`;
}
