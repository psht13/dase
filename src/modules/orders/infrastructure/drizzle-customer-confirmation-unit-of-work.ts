import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import type {
  CustomerConfirmationRepositories,
  CustomerConfirmationUnitOfWork,
} from "@/modules/orders/application/customer-confirmation-unit-of-work";
import { DrizzleAuditEventRepository } from "@/modules/orders/infrastructure/drizzle-audit-event-repository";
import { DrizzleCustomerRepository } from "@/modules/orders/infrastructure/drizzle-customer-repository";
import { DrizzleOrderRepository } from "@/modules/orders/infrastructure/drizzle-order-repository";
import { DrizzlePaymentRepository } from "@/modules/payments/infrastructure/drizzle-payment-repository";
import { DrizzleShipmentRepository } from "@/modules/shipping/infrastructure/drizzle-shipment-repository";
import * as schema from "@/shared/db/schema";

type Database = NodePgDatabase<typeof schema>;

export class DrizzleCustomerConfirmationUnitOfWork
  implements CustomerConfirmationUnitOfWork
{
  constructor(private readonly db: Database) {}

  async run<T>(
    work: (repositories: CustomerConfirmationRepositories) => Promise<T>,
  ): Promise<T> {
    return this.db.transaction(async (tx) =>
      work({
        auditEventRepository: new DrizzleAuditEventRepository(tx as never),
        customerRepository: new DrizzleCustomerRepository(tx as never),
        orderRepository: new DrizzleOrderRepository(tx as never),
        paymentRepository: new DrizzlePaymentRepository(tx as never),
        shipmentRepository: new DrizzleShipmentRepository(tx as never),
      }),
    );
  }
}
