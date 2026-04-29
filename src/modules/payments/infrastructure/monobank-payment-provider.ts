import { createVerify } from "node:crypto";
import type {
  CreatedPaymentInvoice,
  CreateInvoiceInput,
  PaymentProvider,
  PaymentInvoiceItem,
  ProviderInvoiceStatus,
  VerifyWebhookInput,
} from "@/modules/payments/application/payment-provider";
import {
  PaymentProviderConfigurationError,
  PaymentProviderRequestError,
  PaymentWebhookSignatureError,
} from "@/modules/payments/application/payment-provider";

const defaultBaseUrl = "https://api.monobank.ua";
const defaultCurrencyCode = 980;

type MonobankPaymentProviderConfig = {
  baseUrl?: string;
  fetchFn?: typeof fetch;
  publicKeyBase64: string;
  token: string;
};

type MonobankInvoiceResponse = {
  invoiceId?: unknown;
  pageUrl?: unknown;
};

type MonobankInvoiceStatusResponse = {
  amount?: unknown;
  ccy?: unknown;
  createdDate?: unknown;
  destination?: unknown;
  errCode?: unknown;
  failureReason?: unknown;
  finalAmount?: unknown;
  invoiceId?: unknown;
  modifiedDate?: unknown;
  reference?: unknown;
  status?: unknown;
};

export class MonobankPaymentProvider implements PaymentProvider {
  private readonly baseUrl: string;
  private readonly fetchFn: typeof fetch;

  constructor(private readonly config: MonobankPaymentProviderConfig) {
    if (!config.token) {
      throw new PaymentProviderConfigurationError("MONOBANK_TOKEN is required");
    }

    if (!config.publicKeyBase64) {
      throw new PaymentProviderConfigurationError(
        "MONOBANK_PUBLIC_KEY is required",
      );
    }

    this.baseUrl = config.baseUrl ?? defaultBaseUrl;
    this.fetchFn = config.fetchFn ?? fetch;
  }

  async createInvoice(
    input: CreateInvoiceInput,
  ): Promise<CreatedPaymentInvoice> {
    const response = await this.fetchFn(
      this.url("/api/merchant/invoice/create"),
      {
        body: JSON.stringify({
          amount: input.amountMinor,
          ccy: currencyToNumericCode(input.currency),
          destination: input.description,
          merchantPaymInfo: {
            basketOrder: input.items.map(mapInvoiceItem),
            reference: input.reference,
          },
          paymentType: "debit",
          redirectUrl: input.redirectUrl,
          validity: 86_400,
          webHookUrl: input.webhookUrl,
        }),
        headers: {
          "content-type": "application/json",
          "x-token": this.config.token,
        },
        method: "POST",
      },
    );

    const payload = await parseJsonResponse<MonobankInvoiceResponse>(response);

    if (!response.ok) {
      throw new PaymentProviderRequestError(
        `Monobank invoice creation failed with ${response.status}`,
      );
    }

    const invoiceId = stringValue(payload.invoiceId);
    const pageUrl = stringValue(payload.pageUrl);

    if (!invoiceId || !pageUrl) {
      throw new PaymentProviderRequestError(
        "Monobank invoice creation response is incomplete",
      );
    }

    return {
      invoiceId,
      pageUrl,
      providerModifiedAt: null,
    };
  }

  async getInvoiceStatus(invoiceId: string): Promise<ProviderInvoiceStatus> {
    if (!invoiceId) {
      throw new PaymentProviderRequestError("Monobank invoice id is required");
    }

    const url = this.url("/api/merchant/invoice/status");
    url.searchParams.set("invoiceId", invoiceId);

    const response = await this.fetchFn(url, {
      headers: {
        "x-token": this.config.token,
      },
      method: "GET",
    });

    const payload = await parseJsonResponse<MonobankInvoiceStatusResponse>(
      response,
    );

    if (!response.ok) {
      throw new PaymentProviderRequestError(
        `Monobank invoice status failed with ${response.status}`,
      );
    }

    return mapInvoiceStatus(payload);
  }

  async verifyWebhook(
    input: VerifyWebhookInput,
  ): Promise<ProviderInvoiceStatus> {
    if (!input.signature) {
      throw new PaymentWebhookSignatureError();
    }

    const rawBody = Buffer.isBuffer(input.rawBody)
      ? input.rawBody
      : Buffer.from(input.rawBody);
    const signature = Buffer.from(input.signature, "base64");
    const verify = createVerify("SHA256");

    verify.update(rawBody);
    verify.end();

    if (!verify.verify(publicKeyPem(this.config.publicKeyBase64), signature)) {
      throw new PaymentWebhookSignatureError();
    }

    const payload = JSON.parse(rawBody.toString("utf8")) as Record<
      string,
      unknown
    >;

    return mapInvoiceStatus(payload);
  }

  private url(path: string): URL {
    return new URL(path, this.baseUrl);
  }
}

function mapInvoiceStatus(
  payload: Record<string, unknown>,
): ProviderInvoiceStatus {
  const invoiceId = stringValue(payload.invoiceId);
  const rawStatus = stringValue(payload.status);
  const providerModifiedAt = parseRequiredDate(payload.modifiedDate);

  if (!invoiceId || !rawStatus) {
    throw new PaymentProviderRequestError("Monobank invoice payload is invalid");
  }

  const sanitizedPayload = sanitizeInvoicePayload(payload);

  return {
    amountMinor:
      numberValue(payload.finalAmount) ?? numberValue(payload.amount) ?? 0,
    currency: numericCodeToCurrency(numberValue(payload.ccy)),
    eventId: [
      invoiceId,
      rawStatus.toLowerCase(),
      providerModifiedAt.toISOString(),
    ].join(":"),
    failureReason: stringValue(payload.failureReason),
    invoiceId,
    providerModifiedAt,
    rawPayload: sanitizedPayload,
    rawStatus,
    reference: stringValue(payload.reference),
  };
}

function mapInvoiceItem(item: PaymentInvoiceItem) {
  return {
    code: item.code,
    name: item.name,
    qty: item.quantity,
    sum: item.unitPriceMinor,
    total: item.totalMinor,
    unit: "шт.",
  };
}

function sanitizeInvoicePayload(
  payload: Record<string, unknown>,
): Record<string, unknown> {
  const safePayload = { ...payload };

  delete safePayload.cancelList;
  delete safePayload.paymentInfo;
  delete safePayload.tipsInfo;
  delete safePayload.walletData;

  return safePayload;
}

async function parseJsonResponse<T>(response: Response): Promise<T> {
  const body = await response.text();

  if (!body) {
    return {} as T;
  }

  return JSON.parse(body) as T;
}

function publicKeyPem(publicKeyBase64OrPem: string): string {
  const trimmedKey = publicKeyBase64OrPem.trim();

  if (trimmedKey.includes("BEGIN PUBLIC KEY")) {
    return trimmedKey;
  }

  return Buffer.from(trimmedKey, "base64").toString("utf8");
}

function parseRequiredDate(value: unknown): Date {
  const parsedValue = stringValue(value);
  const parsedDate = parsedValue ? new Date(parsedValue) : null;

  if (!parsedDate || Number.isNaN(parsedDate.getTime())) {
    throw new PaymentProviderRequestError(
      "Monobank modified date is invalid",
    );
  }

  return parsedDate;
}

function stringValue(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value : null;
}

function numberValue(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function currencyToNumericCode(currency: string): number {
  void currency;

  return defaultCurrencyCode;
}

function numericCodeToCurrency(currencyCode: number | null): string {
  return currencyCode === defaultCurrencyCode || currencyCode === null
    ? "UAH"
    : String(currencyCode);
}
