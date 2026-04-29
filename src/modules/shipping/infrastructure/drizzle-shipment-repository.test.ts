import { DrizzleShipmentRepository } from "@/modules/shipping/infrastructure/drizzle-shipment-repository";

function createSelectChain<T>(result: T) {
  const chain = {
    from: vi.fn(() => chain),
    where: vi.fn(async () => result),
  };

  return chain;
}

describe("DrizzleShipmentRepository", () => {
  const now = new Date("2026-04-30T10:00:00.000Z");
  const shipment = {
    addressText: "Київ, Відділення №1",
    carrier: "NOVA_POSHTA",
    carrierOfficeId: "warehouse-1",
    carrierPayload: { warehouseName: "Відділення №1" },
    carrierShipmentId: null,
    cityName: "Київ",
    cityRef: "city-1",
    createdAt: now,
    deliveredAt: null,
    id: "shipment-1",
    labelUrl: null,
    orderId: "order-1",
    recipientCustomerId: "customer-1",
    status: "PENDING",
    trackingNumber: null,
    updatedAt: now,
  } as const;

  it("finds shipments by order id", async () => {
    const db = {
      select: vi.fn(() => createSelectChain([shipment])),
    };
    const repository = new DrizzleShipmentRepository(db as never);

    await expect(repository.findByOrderId("order-1")).resolves.toEqual([
      expect.objectContaining({ id: "shipment-1" }),
    ]);
  });

  it("saves shipment rows", async () => {
    const returning = vi.fn(async () => [shipment]);
    const values = vi.fn(() => ({ returning }));
    const db = {
      insert: vi.fn(() => ({ values })),
    };
    const repository = new DrizzleShipmentRepository(db as never);

    await expect(
      repository.save({
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
      }),
    ).resolves.toMatchObject({ id: "shipment-1" });
    expect(values).toHaveBeenCalledWith(
      expect.objectContaining({ carrier: "NOVA_POSHTA", orderId: "order-1" }),
    );
  });

  it("updates created shipment fields and status sync fields", async () => {
    const returningCreated = vi.fn(async () => [
      {
        ...shipment,
        carrierShipmentId: "np-shipment-1",
        labelUrl: "https://nova.test/label.pdf",
        status: "CREATED",
        trackingNumber: "20450000000000",
      },
    ]);
    const returningStatus = vi.fn(async () => [
      {
        ...shipment,
        deliveredAt: new Date("2026-04-30T12:00:00.000Z"),
        status: "DELIVERED",
      },
    ]);
    const set = vi
      .fn()
      .mockReturnValueOnce({
        returning: returningCreated,
        where: vi.fn(() => ({ returning: returningCreated })),
      })
      .mockReturnValueOnce({
        returning: returningStatus,
        where: vi.fn(() => ({ returning: returningStatus })),
      });
    const updateChain = {
      set,
    };
    const db = {
      update: vi.fn(() => updateChain),
    };
    const repository = new DrizzleShipmentRepository(db as never);

    await expect(
      repository.updateCreation({
        carrierShipmentId: "np-shipment-1",
        labelUrl: "https://nova.test/label.pdf",
        shipmentId: "shipment-1",
        trackingNumber: "20450000000000",
      }),
    ).resolves.toMatchObject({ status: "CREATED" });
    await expect(
      repository.updateStatus({
        deliveredAt: new Date("2026-04-30T12:00:00.000Z"),
        shipmentId: "shipment-1",
        status: "DELIVERED",
      }),
    ).resolves.toMatchObject({ status: "DELIVERED" });
    expect(set).toHaveBeenCalledWith(
      expect.objectContaining({
        carrierShipmentId: "np-shipment-1",
        status: "CREATED",
      }),
    );
    expect(set).toHaveBeenCalledWith(
      expect.objectContaining({ status: "DELIVERED" }),
    );
  });
});
