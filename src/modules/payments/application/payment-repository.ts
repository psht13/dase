export type PaymentProviderCode = "MONOBANK" | "CASH_ON_DELIVERY";
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
  provider: PaymentProviderCode;
  providerInvoiceId: string | null;
  providerModifiedAt: Date | null;
  status: PaymentStatus;
  updatedAt: Date;
};

export type UpdatePaymentProviderInvoiceInput = {
  paymentId: string;
  providerInvoiceId: string;
  providerModifiedAt: Date | null;
};

export type UpdatePaymentStatusInput = {
  failureReason: string | null;
  paidAt: Date | null;
  paymentId: string;
  providerModifiedAt: Date | null;
  status: PaymentStatus;
};

export interface PaymentRepository {
  findByOrderId(orderId: string): Promise<PaymentRecord[]>;
  findByProviderInvoiceId(
    provider: PaymentProviderCode,
    providerInvoiceId: string,
  ): Promise<PaymentRecord | null>;
  save(
    payment: Omit<PaymentRecord, "createdAt" | "id" | "updatedAt">,
  ): Promise<PaymentRecord>;
  updateProviderInvoice(
    input: UpdatePaymentProviderInvoiceInput,
  ): Promise<PaymentRecord>;
  updateStatus(input: UpdatePaymentStatusInput): Promise<PaymentRecord>;
}
