import {
  getAuditEventLabel,
  orderStatusLabels,
  paymentProviderLabels,
  paymentStatusLabels,
  shipmentCarrierLabels,
} from "@/modules/orders/application/order-labels";

describe("owner order Ukrainian labels", () => {
  it("maps order, carrier, payment, and audit labels to Ukrainian copy", () => {
    expect(orderStatusLabels.SHIPMENT_PENDING).toBe("Готується відправлення");
    expect(orderStatusLabels.CANCELLED).toBe("Скасовано");
    expect(shipmentCarrierLabels.NOVA_POSHTA).toBe("Нова пошта");
    expect(shipmentCarrierLabels.UKRPOSHTA).toBe("Укрпошта (вимкнено)");
    expect(paymentProviderLabels.CASH_ON_DELIVERY).toBe("Післяплата");
    expect(paymentProviderLabels.MANUAL_CARD_TRANSFER).toBe(
      "Оплата картою онлайн",
    );
    expect(paymentStatusLabels.PENDING).toBe("Очікує підтвердження");
    expect(getAuditEventLabel("ORDER_STATUS_UPDATED")).toBe(
      "Статус змінено вручну",
    );
    expect(getAuditEventLabel("MANUAL_PAYMENT_MARKED_PAID")).toBe(
      "Оплату картою підтверджено",
    );
  });
});
