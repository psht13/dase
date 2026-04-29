import {
  getAuditEventLabel,
  orderStatusLabels,
  paymentProviderLabels,
  shipmentCarrierLabels,
} from "@/modules/orders/application/order-labels";

describe("owner order Ukrainian labels", () => {
  it("maps order, carrier, payment, and audit labels to Ukrainian copy", () => {
    expect(orderStatusLabels.SHIPMENT_PENDING).toBe("Готується відправлення");
    expect(orderStatusLabels.CANCELLED).toBe("Скасовано");
    expect(shipmentCarrierLabels.NOVA_POSHTA).toBe("Нова Пошта");
    expect(paymentProviderLabels.CASH_ON_DELIVERY).toBe("Післяплата");
    expect(getAuditEventLabel("ORDER_STATUS_UPDATED")).toBe(
      "Статус змінено вручну",
    );
  });
});
