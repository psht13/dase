import { randomUUID } from "node:crypto";
import type {
  PaymentRecord,
  PaymentRepository,
} from "@/modules/payments/application/payment-repository";

export class InMemoryPaymentRepository implements PaymentRepository {
  private readonly payments = new Map<string, PaymentRecord>();

  async findByOrderId(orderId: string): Promise<PaymentRecord[]> {
    return [...this.payments.values()].filter(
      (payment) => payment.orderId === orderId,
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
}
