import { InMemoryShipmentRepository } from "@/modules/shipping/infrastructure/in-memory-shipment-repository";

describe("InMemoryShipmentRepository", () => {
  it("saves and lists shipments by order", async () => {
    const repository = new InMemoryShipmentRepository();

    const shipment = await repository.save({
      addressText: "Київ, Відділення №1",
      carrier: "NOVA_POSHTA",
      carrierOfficeId: "warehouse-1",
      carrierPayload: { warehouseName: "Відділення №1" },
      carrierShipmentId: null,
      cityName: "Київ",
      cityRef: "city-1",
      deliveredAt: null,
      labelUrl: null,
      orderId: "order-1",
      recipientCustomerId: "customer-1",
      status: "PENDING",
      trackingNumber: null,
    });

    await expect(
      repository.updateCreation({
        carrierShipmentId: "np-shipment-1",
        labelUrl: "https://nova.test/label.pdf",
        shipmentId: shipment.id,
        trackingNumber: "20450000000000",
      }),
    ).resolves.toMatchObject({
      carrierShipmentId: "np-shipment-1",
      status: "CREATED",
      trackingNumber: "20450000000000",
    });
    await expect(
      repository.updateStatus({
        deliveredAt: new Date("2026-04-30T12:00:00.000Z"),
        shipmentId: shipment.id,
        status: "DELIVERED",
      }),
    ).resolves.toMatchObject({
      deliveredAt: new Date("2026-04-30T12:00:00.000Z"),
      status: "DELIVERED",
    });
    await expect(repository.findByOrderId("order-1")).resolves.toEqual([
      expect.objectContaining({
        carrier: "NOVA_POSHTA",
        cityName: "Київ",
      }),
    ]);
    await expect(repository.findByOrderId("other-order")).resolves.toEqual([]);
  });
});
