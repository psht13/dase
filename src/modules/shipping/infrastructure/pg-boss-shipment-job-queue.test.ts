import { shipmentJobNames } from "@/modules/shipping/application/shipment-job-queue";
import { PgBossShipmentJobQueue } from "@/modules/shipping/infrastructure/pg-boss-shipment-job-queue";

describe("PgBossShipmentJobQueue", () => {
  it("sends shipment jobs with retry options", async () => {
    const boss = {
      send: vi.fn(async () => "job-1"),
      start: vi.fn(),
    };
    const queue = new PgBossShipmentJobQueue(boss as never, {
      started: true,
    });

    await expect(
      queue.enqueueCreateShipment({
        orderId: "order-1",
        requestedAt: "2026-04-30T10:00:00.000Z",
        requestedBy: "system",
        shipmentId: "shipment-1",
      }),
    ).resolves.toBe("job-1");
    expect(boss.send).toHaveBeenCalledWith(
      shipmentJobNames.createShipment,
      expect.objectContaining({ orderId: "order-1" }),
      expect.objectContaining({
        retryBackoff: true,
        retryDelay: 60,
        retryLimit: 5,
        singletonKey: "shipment-1",
      }),
    );
  });
});
