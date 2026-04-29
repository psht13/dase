import { and, eq } from "drizzle-orm";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import type {
  PaymentProviderCode,
  PaymentRecord,
  PaymentRepository,
  UpdatePaymentProviderInvoiceInput,
  UpdatePaymentStatusInput,
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

  async findByProviderInvoiceId(
    provider: PaymentProviderCode,
    providerInvoiceId: string,
  ): Promise<PaymentRecord | null> {
    const [payment] = await this.db
      .select()
      .from(schema.payments)
      .where(
        and(
          eq(schema.payments.provider, provider),
          eq(schema.payments.providerInvoiceId, providerInvoiceId),
        ),
      )
      .limit(1);

    if (!payment) {
      return null;
    }

    return mapPayment(payment);
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

  async updateProviderInvoice(
    input: UpdatePaymentProviderInvoiceInput,
  ): Promise<PaymentRecord> {
    const [updatedPayment] = await this.db
      .update(schema.payments)
      .set({
        providerInvoiceId: input.providerInvoiceId,
        providerModifiedAt: input.providerModifiedAt,
        updatedAt: new Date(),
      })
      .where(eq(schema.payments.id, input.paymentId))
      .returning();

    if (!updatedPayment) {
      throw new Error("Payment not found");
    }

    return mapPayment(updatedPayment);
  }

  async updateStatus(input: UpdatePaymentStatusInput): Promise<PaymentRecord> {
    const [updatedPayment] = await this.db
      .update(schema.payments)
      .set({
        failureReason: input.failureReason,
        paidAt: input.paidAt,
        providerModifiedAt: input.providerModifiedAt,
        status: input.status,
        updatedAt: new Date(),
      })
      .where(eq(schema.payments.id, input.paymentId))
      .returning();

    if (!updatedPayment) {
      throw new Error("Payment not found");
    }

    return mapPayment(updatedPayment);
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
