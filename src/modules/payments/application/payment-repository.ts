export type PaymentProvider = "MONOBANK" | "CASH_ON_DELIVERY";
export type PaymentStatus =
  | "PENDING"
  | "PAID"
  | "FAILED"
  | "CANCELLED"
  | "REFUNDED";

export type PaymentRecord = {
  amountMinor: number;
  createdAt: Date;
  currency: string;
  failureReason: string | null;
  id: string;
  orderId: string;
  paidAt: Date | null;
  provider: PaymentProvider;
  providerInvoiceId: string | null;
  providerModifiedAt: Date | null;
  status: PaymentStatus;
  updatedAt: Date;
};

export interface PaymentRepository {
  findByOrderId(orderId: string): Promise<PaymentRecord[]>;
  save(payment: Omit<PaymentRecord, "createdAt" | "id" | "updatedAt">): Promise<PaymentRecord>;
}
