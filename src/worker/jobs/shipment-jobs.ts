import type PgBoss from "pg-boss";
import type {
  AutoCompleteDeliveredOrderJobData,
  CreateShipmentJobData,
  SyncShipmentStatusJobData,
} from "@/modules/shipping/application/shipment-job-queue";
import { shipmentJobNames } from "@/modules/shipping/application/shipment-job-queue";
import { autoCompleteDeliveredOrderJobUseCase } from "@/modules/shipping/application/auto-complete-delivered-order-job";
import { createShipmentJobUseCase } from "@/modules/shipping/application/create-shipment-job";
import { syncShipmentStatusJobUseCase } from "@/modules/shipping/application/sync-shipment-status-job";
import { getAuditEventRepository } from "@/modules/orders/infrastructure/audit-event-repository-factory";
import { getCustomerRepository } from "@/modules/orders/infrastructure/customer-repository-factory";
import { getOrderRepository } from "@/modules/orders/infrastructure/order-repository-factory";
import { PgBossShipmentJobQueue } from "@/modules/shipping/infrastructure/pg-boss-shipment-job-queue";
import { getShipmentRepository } from "@/modules/shipping/infrastructure/shipment-repository-factory";
import { getShippingCarrier } from "@/modules/shipping/infrastructure/shipping-carrier-factory";
import { getServerEnv } from "@/shared/config/env";

type ShipmentWorkerDependencies = {
  auditEventRepository: ReturnType<typeof getAuditEventRepository>;
  customerRepository: ReturnType<typeof getCustomerRepository>;
  orderRepository: ReturnType<typeof getOrderRepository>;
  shipmentJobQueue: PgBossShipmentJobQueue;
  shipmentRepository: ReturnType<typeof getShipmentRepository>;
};

export async function registerShipmentWorkers(boss: PgBoss): Promise<void> {
  const dependencies = createDependencies(boss);

  await Promise.all([
    boss.work<CreateShipmentJobData>(
      shipmentJobNames.createShipment,
      { batchSize: 1 },
      async (jobs) => {
        for (const job of jobs) {
          await createShipmentJobUseCase(job.data, {
            auditEventRepository: dependencies.auditEventRepository,
            customerRepository: dependencies.customerRepository,
            getShippingCarrier,
            orderRepository: dependencies.orderRepository,
            shipmentJobQueue: dependencies.shipmentJobQueue,
            shipmentRepository: dependencies.shipmentRepository,
          });
        }
      },
    ),
    boss.work<SyncShipmentStatusJobData>(
      shipmentJobNames.syncShipmentStatus,
      { batchSize: 1 },
      async (jobs) => {
        for (const job of jobs) {
          await syncShipmentStatusJobUseCase(job.data, {
            auditEventRepository: dependencies.auditEventRepository,
            autoCompleteAfterDeliveredHours:
              getServerEnv().AUTO_COMPLETE_AFTER_DELIVERED_HOURS,
            getShippingCarrier,
            orderRepository: dependencies.orderRepository,
            shipmentJobQueue: dependencies.shipmentJobQueue,
            shipmentRepository: dependencies.shipmentRepository,
          });
        }
      },
    ),
    boss.work<AutoCompleteDeliveredOrderJobData>(
      shipmentJobNames.autoCompleteDeliveredOrder,
      { batchSize: 1 },
      async (jobs) => {
        for (const job of jobs) {
          await autoCompleteDeliveredOrderJobUseCase(job.data, {
            auditEventRepository: dependencies.auditEventRepository,
            autoCompleteAfterDeliveredHours:
              getServerEnv().AUTO_COMPLETE_AFTER_DELIVERED_HOURS,
            orderRepository: dependencies.orderRepository,
            shipmentRepository: dependencies.shipmentRepository,
          });
        }
      },
    ),
  ]);
}

function createDependencies(boss: PgBoss): ShipmentWorkerDependencies {
  return {
    auditEventRepository: getAuditEventRepository(),
    customerRepository: getCustomerRepository(),
    orderRepository: getOrderRepository(),
    shipmentJobQueue: new PgBossShipmentJobQueue(boss, { started: true }),
    shipmentRepository: getShipmentRepository(),
  };
}
