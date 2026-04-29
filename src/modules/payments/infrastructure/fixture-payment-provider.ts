import type {
  CreatedPaymentInvoice,
  CreateInvoiceInput,
  PaymentProvider,
  ProviderInvoiceStatus,
  VerifyWebhookInput,
} from "@/modules/payments/application/payment-provider";
import { PaymentWebhookSignatureError } from "@/modules/payments/application/payment-provider";

export class FixtureMonobankPaymentProvider implements PaymentProvider {
  async createInvoice(
    input: CreateInvoiceInput,
  ): Promise<CreatedPaymentInvoice> {
    const invoiceId = `e2e-${input.orderId}`;
    const pageUrl = new URL(input.redirectUrl);

    pageUrl.searchParams.set("payment", "monobank");
    pageUrl.searchParams.set("invoiceId", invoiceId);

    return {
      invoiceId,
      pageUrl: pageUrl.toString(),
      providerModifiedAt: null,
    };
  }

  async getInvoiceStatus(invoiceId: string): Promise<ProviderInvoiceStatus> {
    return {
      amountMinor: 0,
      currency: "UAH",
      eventId: `${invoiceId}:success:2026-04-30T12:00:00.000Z`,
      failureReason: null,
      invoiceId,
      providerModifiedAt: new Date("2026-04-30T12:00:00.000Z"),
      rawPayload: {
        invoiceId,
        modifiedDate: "2026-04-30T12:00:00.000Z",
        status: "success",
      },
      rawStatus: "success",
      reference: null,
    };
  }

  async verifyWebhook(input: VerifyWebhookInput): Promise<ProviderInvoiceStatus> {
    if (input.signature !== "fixture-valid") {
      throw new PaymentWebhookSignatureError();
    }

    const rawBody = Buffer.isBuffer(input.rawBody)
      ? input.rawBody.toString("utf8")
      : input.rawBody;
    const payload = JSON.parse(rawBody) as Record<string, unknown>;
    const invoiceId =
      typeof payload.invoiceId === "string" ? payload.invoiceId : "";
    const rawStatus =
      typeof payload.status === "string" ? payload.status : "success";
    const modifiedDate =
      typeof payload.modifiedDate === "string"
        ? payload.modifiedDate
        : "2026-04-30T12:00:00.000Z";

    return {
      amountMinor: typeof payload.amount === "number" ? payload.amount : 0,
      currency: "UAH",
      eventId: `${invoiceId}:${rawStatus}:${modifiedDate}`,
      failureReason:
        typeof payload.failureReason === "string"
          ? payload.failureReason
          : null,
      invoiceId,
      providerModifiedAt: new Date(modifiedDate),
      rawPayload: {
        amount: payload.amount,
        invoiceId,
        modifiedDate,
        status: rawStatus,
      },
      rawStatus,
      reference: typeof payload.reference === "string" ? payload.reference : null,
    };
  }
}
