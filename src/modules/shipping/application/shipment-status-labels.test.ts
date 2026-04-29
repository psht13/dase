import { shipmentJobNames } from "@/modules/shipping/application/shipment-job-queue";
import {
  getShipmentJobLabel,
  getShipmentStatusLabel,
} from "@/modules/shipping/application/shipment-status-labels";

describe("shipment dashboard labels", () => {
  it("returns Ukrainian shipment status labels", () => {
    expect(getShipmentStatusLabel("PENDING")).toBe("Очікує створення");
    expect(getShipmentStatusLabel("CREATED")).toBe("Створено");
    expect(getShipmentStatusLabel("IN_TRANSIT")).toBe("У дорозі");
    expect(getShipmentStatusLabel("DELIVERED")).toBe("Доставлено");
    expect(getShipmentStatusLabel("RETURNED")).toBe("Повернено");
    expect(getShipmentStatusLabel("FAILED")).toBe("Помилка створення");
  });

  it("returns Ukrainian shipment job labels", () => {
    expect(getShipmentJobLabel(shipmentJobNames.createShipment)).toBe(
      "Створення відправлення",
    );
    expect(getShipmentJobLabel(shipmentJobNames.syncShipmentStatus)).toBe(
      "Оновлення статусу доставки",
    );
    expect(
      getShipmentJobLabel(shipmentJobNames.autoCompleteDeliveredOrder),
    ).toBe("Автоматичне завершення доставленого замовлення");
  });
});
