import { createSign, generateKeyPairSync } from "node:crypto";
import { HttpResponse, http } from "msw";
import { setupServer } from "msw/node";
import {
  PaymentProviderConfigurationError,
  PaymentProviderRequestError,
  PaymentWebhookSignatureError,
} from "@/modules/payments/application/payment-provider";
import { MonobankPaymentProvider } from "@/modules/payments/infrastructure/monobank-payment-provider";

const signingKeys = generateKeyPairSync("ec", {
  namedCurve: "prime256v1",
});
const publicKeyBase64 = Buffer.from(
  signingKeys.publicKey.export({
    format: "pem",
    type: "spki",
  }) as string,
).toString("base64");
const publicKeyPem = signingKeys.publicKey.export({
  format: "pem",
  type: "spki",
}) as string;

const server = setupServer(
  http.post("https://mono.test/api/merchant/invoice/create", async ({ request }) => {
    const body = (await request.json()) as {
      amount?: number;
      ccy?: number;
      merchantPaymInfo?: {
        basketOrder?: unknown[];
        reference?: string;
      };
      redirectUrl?: string;
      webHookUrl?: string;
    };

    if (request.headers.get("x-token") !== "test-token") {
      return HttpResponse.json({ message: "bad token" }, { status: 403 });
    }

    if (
      body.amount === 2_400_00 &&
      body.ccy === 980 &&
      body.merchantPaymInfo?.reference === "order-1" &&
      body.redirectUrl === "https://dase.test/o/public-token" &&
      body.webHookUrl === "https://dase.test/api/webhooks/monobank"
    ) {
      return HttpResponse.json({
        invoiceId: "invoice-1",
        pageUrl: "https://pay.mbnk.biz/invoice-1",
      });
    }

    return HttpResponse.json({ message: "bad request" }, { status: 400 });
  }),
  http.get("https://mono.test/api/merchant/invoice/status", ({ request }) => {
    const url = new URL(request.url);

    if (
      request.headers.get("x-token") === "test-token" &&
      url.searchParams.get("invoiceId") === "invoice-1"
    ) {
      return HttpResponse.json({
        amount: 2_400_00,
        ccy: 980,
        finalAmount: 2_400_00,
        invoiceId: "invoice-1",
        modifiedDate: "2026-04-30T12:00:00.000Z",
        reference: "order-1",
        status: "success",
      });
    }

    return HttpResponse.json({ message: "not found" }, { status: 404 });
  }),
);

beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

describe("MonobankPaymentProvider", () => {
  it("validates required Monobank configuration", () => {
    expect(
      () =>
        new MonobankPaymentProvider({
          publicKeyBase64,
          token: "",
        }),
    ).toThrow(PaymentProviderConfigurationError);
    expect(
      () =>
        new MonobankPaymentProvider({
          publicKeyBase64: "",
          token: "test-token",
        }),
    ).toThrow(PaymentProviderConfigurationError);
  });

  it("creates invoices and maps status responses through MSW contract tests", async () => {
    const provider = createProvider();

    await expect(
      provider.createInvoice({
        amountMinor: 2_400_00,
        currency: "UAH",
        description: "Оплата замовлення Dase order-1",
        items: [
          {
            code: "RING-1",
            name: "Каблучка",
            quantity: 2,
            totalMinor: 2_400_00,
            unitPriceMinor: 1_200_00,
          },
        ],
        orderId: "order-1",
        redirectUrl: "https://dase.test/o/public-token",
        reference: "order-1",
        webhookUrl: "https://dase.test/api/webhooks/monobank",
      }),
    ).resolves.toEqual({
      invoiceId: "invoice-1",
      pageUrl: "https://pay.mbnk.biz/invoice-1",
      providerModifiedAt: null,
    });

    await expect(provider.getInvoiceStatus("invoice-1")).resolves.toMatchObject({
      amountMinor: 2_400_00,
      currency: "UAH",
      invoiceId: "invoice-1",
      rawStatus: "success",
      reference: "order-1",
    });
  });

  it("throws provider request errors for invalid Monobank responses", async () => {
    const provider = createProvider();

    await expect(provider.getInvoiceStatus("")).rejects.toBeInstanceOf(
      PaymentProviderRequestError,
    );

    server.use(
      http.post("https://mono.test/api/merchant/invoice/create", () =>
        HttpResponse.json({ invoiceId: "invoice-1" }),
      ),
    );
    await expect(
      provider.createInvoice({
        amountMinor: 2_400_00,
        currency: "UAH",
        description: "Оплата замовлення Dase order-1",
        items: [],
        orderId: "order-1",
        redirectUrl: "https://dase.test/o/public-token",
        reference: "order-1",
        webhookUrl: "https://dase.test/api/webhooks/monobank",
      }),
    ).rejects.toBeInstanceOf(PaymentProviderRequestError);

    server.use(
      http.get("https://mono.test/api/merchant/invoice/status", () =>
        HttpResponse.json({ message: "not found" }, { status: 404 }),
      ),
    );
    await expect(provider.getInvoiceStatus("invoice-1")).rejects.toBeInstanceOf(
      PaymentProviderRequestError,
    );
  });

  it("verifies webhook signatures and removes card data from stored payloads", async () => {
    const provider = createProvider({ publicKeyBase64: publicKeyPem });
    const rawBody = JSON.stringify({
      amount: 2_400_00,
      ccy: 980,
      finalAmount: 2_400_00,
      invoiceId: "invoice-1",
      modifiedDate: "2026-04-30T12:00:00.000Z",
      paymentInfo: {
        maskedPan: "444403******1902",
      },
      reference: "order-1",
      status: "success",
      walletData: {
        cardToken: "card-token",
      },
    });

    await expect(
      provider.verifyWebhook({
        rawBody,
        signature: signBody(rawBody),
      }),
    ).resolves.toMatchObject({
      invoiceId: "invoice-1",
      rawPayload: expect.not.objectContaining({
        paymentInfo: expect.anything(),
        walletData: expect.anything(),
      }),
      rawStatus: "success",
    });
  });

  it("rejects invalid webhook signatures", async () => {
    const provider = createProvider();

    await expect(
      provider.verifyWebhook({
        rawBody: "{}",
        signature: null,
      }),
    ).rejects.toBeInstanceOf(PaymentWebhookSignatureError);

    await expect(
      provider.verifyWebhook({
        rawBody: JSON.stringify({
          invoiceId: "invoice-1",
          modifiedDate: "2026-04-30T12:00:00.000Z",
          status: "success",
        }),
        signature: "invalid",
      }),
    ).rejects.toBeInstanceOf(PaymentWebhookSignatureError);
  });
});

function createProvider(
  input: {
    publicKeyBase64?: string;
  } = {},
) {
  return new MonobankPaymentProvider({
    baseUrl: "https://mono.test",
    publicKeyBase64: input.publicKeyBase64 ?? publicKeyBase64,
    token: "test-token",
  });
}

function signBody(rawBody: string): string {
  const sign = createSign("SHA256");

  sign.update(rawBody);
  sign.end();

  return sign.sign(signingKeys.privateKey).toString("base64");
}
