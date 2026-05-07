import {
  activeShippingCarriers,
  getShippingCarrierOptionsForRecords,
  isActiveShippingCarrier,
  isShippingCarrierSearchEnabled,
  isShipmentCreationEnabled,
} from "@/modules/shipping/application/shipping-carrier-registry";

describe("shipping carrier registry", () => {
  it("keeps Nova Post as the only active MVP carrier", () => {
    expect(activeShippingCarriers).toEqual([
      expect.objectContaining({
        code: "NOVA_POSHTA",
        label: "Нова пошта",
        legacy: false,
        searchEnabled: true,
        shipmentCreationEnabled: true,
      }),
    ]);
    expect(isActiveShippingCarrier("NOVA_POSHTA")).toBe(true);
    expect(isActiveShippingCarrier("UKRPOSHTA")).toBe(false);
  });

  it("keeps Ukrposhta as a disabled legacy carrier for historical records", () => {
    expect(isShippingCarrierSearchEnabled("UKRPOSHTA")).toBe(false);
    expect(isShipmentCreationEnabled("UKRPOSHTA")).toBe(false);
    expect(getShippingCarrierOptionsForRecords(["UKRPOSHTA"])).toEqual([
      expect.objectContaining({ code: "NOVA_POSHTA", label: "Нова пошта" }),
      expect.objectContaining({
        code: "UKRPOSHTA",
        label: "Укрпошта (вимкнено)",
        legacy: true,
      }),
    ]);
  });
});
