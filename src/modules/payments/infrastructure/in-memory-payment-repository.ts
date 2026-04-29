import { randomUUID } from "node:crypto";
import type {
  PaymentProviderCode,
  PaymentRecord,
  PaymentRepository,
  UpdatePaymentProviderInvoiceInput,
  UpdatePaymentStatusInput,
} from "@/modules/payments/application/payment-repository";

export class InMemoryPaymentRepository implements PaymentRepository {
  private readonly payments = new Map<string, PaymentRecord>();

  async findByOrderId(orderId: string): Promise<PaymentRecord[]> {
    return [...this.payments.values()].filter(
      (payment) => payment.orderId === orderId,
    );
  }

  async findByProviderInvoiceId(
    provider: PaymentProviderCode,
    providerInvoiceId: string,
  ): Promise<PaymentRecord | null> {
    return (
      [...this.payments.values()].find(
        (payment) =>
          payment.provider === provider &&
          payment.providerInvoiceId === providerInvoiceId,
      ) ?? null
    );
  }

  async save(
    payment: Omit<PaymentRecord, "createdAt" | "id" | "updatedAt">,
  ): Promise<PaymentRecord> {
    const now = new Date();
    const savedPayment: PaymentRecord = {
      ...payment,
      createdAt: now,
      id: randomUUID(),
      updatedAt: now,
    };

    this.payments.set(savedPayment.id, savedPayment);

    return savedPayment;
  }

  async updateProviderInvoice(
    input: UpdatePaymentProviderInvoiceInput,
  ): Promise<PaymentRecord> {
    const payment = this.payments.get(input.paymentId);

    if (!payment) {
      throw new Error("Payment not found");
    }

    const updatedPayment: PaymentRecord = {
      ...payment,
      providerInvoiceId: input.providerInvoiceId,
      providerModifiedAt: input.providerModifiedAt,
      updatedAt: new Date(),
    };

    this.payments.set(updatedPayment.id, updatedPayment);

    return updatedPayment;
  }

  async updateStatus(input: UpdatePaymentStatusInput): Promise<PaymentRecord> {
    const payment = this.payments.get(input.paymentId);

    if (!payment) {
      throw new Error("Payment not found");
    }

    const updatedPayment: PaymentRecord = {
      ...payment,
      failureReason: input.failureReason,
      paidAt: input.paidAt,
      providerModifiedAt: input.providerModifiedAt,
      status: input.status,
      updatedAt: new Date(),
    };

    this.payments.set(updatedPayment.id, updatedPayment);

    return updatedPayment;
  }
}
