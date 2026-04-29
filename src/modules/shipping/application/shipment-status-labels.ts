import type { ShipmentStatus } from "@/modules/shipping/application/shipment-repository";
import { shipmentJobNames } from "@/modules/shipping/application/shipment-job-queue";

const shipmentStatusLabels: Record<ShipmentStatus, string> = {
  CANCELLED: "Скасовано",
  CREATED: "Створено",
  DELIVERED: "Доставлено",
  FAILED: "Помилка створення",
  IN_TRANSIT: "У дорозі",
  PENDING: "Очікує створення",
  RETURNED: "Повернено",
};

const shipmentJobLabels = {
  [shipmentJobNames.autoCompleteDeliveredOrder]:
    "Автоматичне завершення доставленого замовлення",
  [shipmentJobNames.createShipment]: "Створення відправлення",
  [shipmentJobNames.syncShipmentStatus]: "Оновлення статусу доставки",
} as const;

export function getShipmentStatusLabel(status: ShipmentStatus): string {
  return shipmentStatusLabels[status];
}

export function getShipmentJobLabel(
  jobName: (typeof shipmentJobNames)[keyof typeof shipmentJobNames],
): string {
  return shipmentJobLabels[jobName];
}
