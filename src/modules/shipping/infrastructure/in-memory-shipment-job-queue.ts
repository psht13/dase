import type {
  AutoCompleteDeliveredOrderJobData,
  CreateShipmentJobData,
  ShipmentJobQueue,
  SyncShipmentStatusJobData,
} from "@/modules/shipping/application/shipment-job-queue";

export class InMemoryShipmentJobQueue implements ShipmentJobQueue {
  readonly autoCompleteDeliveredOrderJobs: AutoCompleteDeliveredOrderJobData[] =
    [];
  readonly createShipmentJobs: CreateShipmentJobData[] = [];
  readonly syncShipmentStatusJobs: SyncShipmentStatusJobData[] = [];

  async enqueueAutoCompleteDeliveredOrder(
    data: AutoCompleteDeliveredOrderJobData,
  ): Promise<string> {
    this.autoCompleteDeliveredOrderJobs.push(data);

    return `memory-auto-complete-${this.autoCompleteDeliveredOrderJobs.length}`;
  }

  async enqueueCreateShipment(data: CreateShipmentJobData): Promise<string> {
    this.createShipmentJobs.push(data);

    return `memory-create-shipment-${this.createShipmentJobs.length}`;
  }

  async enqueueSyncShipmentStatus(data: SyncShipmentStatusJobData): Promise<string> {
    this.syncShipmentStatusJobs.push(data);

    return `memory-sync-shipment-${this.syncShipmentStatusJobs.length}`;
  }
}
