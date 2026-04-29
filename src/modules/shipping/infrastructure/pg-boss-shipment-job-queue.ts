import PgBoss from "pg-boss";
import type {
  AutoCompleteDeliveredOrderJobData,
  CreateShipmentJobData,
  ShipmentJobQueue,
  SyncShipmentStatusJobData,
} from "@/modules/shipping/application/shipment-job-queue";
import { shipmentJobNames } from "@/modules/shipping/application/shipment-job-queue";

type PgBossClient = Pick<PgBoss, "send" | "start">;

export class PgBossShipmentJobQueue implements ShipmentJobQueue {
  private startedBoss: Promise<PgBossClient> | undefined;

  constructor(
    private readonly boss: PgBossClient,
    options: { started?: boolean } = {},
  ) {
    if (options.started) {
      this.startedBoss = Promise.resolve(boss);
    }
  }

  async enqueueAutoCompleteDeliveredOrder(
    data: AutoCompleteDeliveredOrderJobData,
    options: { startAfter?: Date } = {},
  ): Promise<string | null> {
    return this.send(shipmentJobNames.autoCompleteDeliveredOrder, data, {
      retryDelay: 300,
      retryLimit: 3,
      singletonKey: data.shipmentId,
      singletonSeconds: 24 * 60 * 60,
      startAfter: options.startAfter,
    });
  }

  async enqueueCreateShipment(
    data: CreateShipmentJobData,
  ): Promise<string | null> {
    return this.send(shipmentJobNames.createShipment, data, {
      retryBackoff: true,
      retryDelay: 60,
      retryLimit: 5,
      singletonKey: data.shipmentId,
      singletonSeconds: 15 * 60,
    });
  }

  async enqueueSyncShipmentStatus(
    data: SyncShipmentStatusJobData,
    options: { startAfter?: Date } = {},
  ): Promise<string | null> {
    return this.send(shipmentJobNames.syncShipmentStatus, data, {
      retryBackoff: true,
      retryDelay: 300,
      retryLimit: 5,
      singletonKey: data.shipmentId,
      singletonSeconds: 10 * 60,
      startAfter: options.startAfter,
    });
  }

  private async send(
    name: string,
    data: object,
    options: PgBoss.SendOptions,
  ): Promise<string | null> {
    const boss = await this.getBoss();

    return boss.send(name, data, options);
  }

  private async getBoss(): Promise<PgBossClient> {
    this.startedBoss ??= this.boss.start();

    return this.startedBoss;
  }
}

export function createPgBoss(databaseUrl: string): PgBoss {
  return new PgBoss({
    application_name: "dase-worker",
    connectionString: databaseUrl,
    retryBackoff: true,
    retryDelay: 60,
    retryLimit: 3,
  });
}
