import { FixtureShippingCarrier } from "@/modules/shipping/infrastructure/fixture-shipping-carrier";

describe("FixtureShippingCarrier", () => {
  it("returns deterministic mocked carrier data for e2e", async () => {
    const carrier = new FixtureShippingCarrier("NOVA_POSHTA");

    await expect(carrier.searchCities({ query: "Київ" })).resolves.toEqual([
      { id: "np-city-kyiv", name: "Київ", region: "Київська область" },
    ]);
    await expect(
      carrier.searchWarehouses({ cityId: "np-city-kyiv", query: "1" }),
    ).resolves.toEqual([
      expect.objectContaining({
        id: "np-wh-1",
        name: "Відділення №1",
      }),
      expect.objectContaining({
        id: "np-wh-2",
        name: "Поштомат №2",
      }),
    ]);
    await expect(
      carrier.createShipment({
        carrier: "NOVA_POSHTA",
        declaredValueMinor: 1_000_00,
        description: "Замовлення Dase",
        orderId: "order-1",
        recipient: {
          cityId: "np-city-kyiv",
          cityName: "Київ",
          fullName: "Олена Петренко",
          phone: "+380671234567",
          warehouseId: "np-wh-1",
          warehouseName: "Відділення №1",
        },
      }),
    ).resolves.toMatchObject({ trackingNumber: "20450000000000" });
    await expect(
      carrier.getShipmentStatus({ trackingNumber: "20450000000000" }),
    ).resolves.toMatchObject({ status: "CREATED" });
  });
});
