export type PaymentInvoiceItem = {
  code: string;
  name: string;
  quantity: number;
  totalMinor: number;
  unitPriceMinor: number;
};

export type CreateInvoiceInput = {
  amountMinor: number;
  currency: string;
  description: string;
  items: PaymentInvoiceItem[];
  orderId: string;
  redirectUrl: string;
  reference: string;
  webhookUrl: string;
};

export type CreatedPaymentInvoice = {
  invoiceId: string;
  pageUrl: string;
  providerModifiedAt: Date | null;
};

export type ProviderInvoiceStatus = {
  amountMinor: number;
  currency: string;
  eventId: string;
  failureReason: string | null;
  invoiceId: string;
  providerModifiedAt: Date;
  rawPayload: Record<string, unknown>;
  rawStatus: string;
  reference: string | null;
};

export type VerifyWebhookInput = {
  rawBody: Buffer | string;
  signature: string | null;
};

export interface PaymentProvider {
  createInvoice(input: CreateInvoiceInput): Promise<CreatedPaymentInvoice>;
  getInvoiceStatus(invoiceId: string): Promise<ProviderInvoiceStatus>;
  verifyWebhook(input: VerifyWebhookInput): Promise<ProviderInvoiceStatus>;
}

export class PaymentProviderConfigurationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PaymentProviderConfigurationError";
  }
}

export class PaymentProviderRequestError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PaymentProviderRequestError";
  }
}

export class PaymentWebhookSignatureError extends Error {
  constructor() {
    super("Invalid payment webhook signature");
    this.name = "PaymentWebhookSignatureError";
  }
}
