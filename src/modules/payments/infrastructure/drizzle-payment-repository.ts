import { eq } from "drizzle-orm";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import type {
  PaymentRecord,
  PaymentRepository,
} from "@/modules/payments/application/payment-repository";
import * as schema from "@/shared/db/schema";

type Database = NodePgDatabase<typeof schema>;
type DbPayment = typeof schema.payments.$inferSelect;

export class DrizzlePaymentRepository implements PaymentRepository {
  constructor(private readonly db: Database) {}

  async findByOrderId(orderId: string): Promise<PaymentRecord[]> {
    const payments = await this.db
      .select()
      .from(schema.payments)
      .where(eq(schema.payments.orderId, orderId));

    return payments.map(mapPayment);
  }

  async save(
    payment: Omit<PaymentRecord, "createdAt" | "id" | "updatedAt">,
  ): Promise<PaymentRecord> {
    const [savedPayment] = await this.db
      .insert(schema.payments)
      .values({
        amountMinor: payment.amountMinor,
        currency: payment.currency,
        failureReason: payment.failureReason,
        orderId: payment.orderId,
        paidAt: payment.paidAt,
        provider: payment.provider,
        providerInvoiceId: payment.providerInvoiceId,
        providerModifiedAt: payment.providerModifiedAt,
        status: payment.status,
      })
      .returning();

    if (!savedPayment) {
      throw new Error("Failed to save payment");
    }

    return mapPayment(savedPayment);
  }
}

function mapPayment(payment: DbPayment): PaymentRecord {
  return {
    amountMinor: payment.amountMinor,
    createdAt: payment.createdAt,
    currency: payment.currency,
    failureReason: payment.failureReason,
    id: payment.id,
    orderId: payment.orderId,
    paidAt: payment.paidAt,
    provider: payment.provider,
    providerInvoiceId: payment.providerInvoiceId,
    providerModifiedAt: payment.providerModifiedAt,
    status: payment.status,
    updatedAt: payment.updatedAt,
  };
}
