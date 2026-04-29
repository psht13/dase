import { POST } from "@/app/api/webhooks/monobank/route";
import { getAuditEventRepository } from "@/modules/orders/infrastructure/audit-event-repository-factory";
import { getOrderRepository } from "@/modules/orders/infrastructure/order-repository-factory";
import { PaymentWebhookSignatureError } from "@/modules/payments/application/payment-provider";
import { getMonobankPaymentProvider } from "@/modules/payments/infrastructure/payment-provider-factory";
import { getPaymentRepository } from "@/modules/payments/infrastructure/payment-repository-factory";
import { getWebhookEventRepository } from "@/modules/payments/infrastructure/webhook-event-repository-factory";

vi.mock("@/modules/orders/infrastructure/audit-event-repository-factory", () => ({
  getAuditEventRepository: vi.fn(),
}));

vi.mock("@/modules/orders/infrastructure/order-repository-factory", () => ({
  getOrderRepository: vi.fn(),
}));

vi.mock("@/modules/payments/infrastructure/payment-provider-factory", () => ({
  getMonobankPaymentProvider: vi.fn(),
}));

vi.mock("@/modules/payments/infrastructure/payment-repository-factory", () => ({
  getPaymentRepository: vi.fn(),
}));

vi.mock(
  "@/modules/payments/infrastructure/webhook-event-repository-factory",
  () => ({
    getWebhookEventRepository: vi.fn(),
  }),
);

const now = new Date("2026-04-30T12:00:00.000Z");

describe("POST /api/webhooks/monobank", () => {
  beforeEach(() => {
    vi.mocked(getAuditEventRepository).mockReturnValue({
      append: vi.fn(async (event) => ({
        ...event,
        createdAt: now,
        id: "event-1",
      })),
      listForOrder: vi.fn(),
    } as never);
    vi.mocked(getOrderRepository).mockReturnValue({
      confirmCustomerDelivery: vi.fn(),
      create: vi.fn(),
      findById: vi.fn(async () => ({
        confirmedAt: now,
        createdAt: now,
        currency: "UAH",
        customerId: "customer-1",
        id: "order-1",
        items: [],
        ownerId: "owner-1",
        publicToken: "secure_public_token_123456789012345",
        publicTokenExpiresAt: new Date("2026-05-14T12:00:00.000Z"),
        sentAt: now,
        status: "PAYMENT_PENDING",
        totalMinor: 2_400_00,
        updatedAt: now,
      })),
      findByPublicToken: vi.fn(),
      updateStatus: vi.fn(),
    } as never);
    vi.mocked(getPaymentRepository).mockReturnValue({
      findByOrderId: vi.fn(),
      findByProviderInvoiceId: vi.fn(async () => ({
        amountMinor: 2_400_00,
        createdAt: now,
        currency: "UAH",
        failureReason: null,
        id: "payment-1",
        orderId: "order-1",
        paidAt: null,
        provider: "MONOBANK",
        providerInvoiceId: "invoice-1",
        providerModifiedAt: null,
        status: "PENDING",
        updatedAt: now,
      })),
      save: vi.fn(),
      updateProviderInvoice: vi.fn(),
      updateStatus: vi.fn(async (input) => ({
        amountMinor: 2_400_00,
        createdAt: now,
        currency: "UAH",
        failureReason: input.failureReason,
        id: input.paymentId,
        orderId: "order-1",
        paidAt: input.paidAt,
        provider: "MONOBANK",
        providerInvoiceId: "invoice-1",
        providerModifiedAt: input.providerModifiedAt,
        status: input.status,
        updatedAt: now,
      })),
    } as never);
    vi.mocked(getWebhookEventRepository).mockReturnValue({
      markProcessed: vi.fn(),
      saveIfNew: vi.fn(async (event) => ({
        event: {
          ...event,
          id: "webhook-event-1",
          processedAt: null,
          receivedAt: now,
        },
        inserted: true,
      })),
    } as never);
    vi.mocked(getMonobankPaymentProvider).mockReturnValue({
      createInvoice: vi.fn(),
      getInvoiceStatus: vi.fn(),
      verifyWebhook: vi.fn(async () => ({
        amountMinor: 2_400_00,
        currency: "UAH",
        eventId: "invoice-1:success:2026-04-30T12:00:00.000Z",
        failureReason: null,
        invoiceId: "invoice-1",
        providerModifiedAt: now,
        rawPayload: {
          invoiceId: "invoice-1",
          status: "success",
        },
        rawStatus: "success",
        reference: "order-1",
      })),
    } as never);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("processes a signed Monobank webhook", async () => {
    const response = await POST(
      new Request("https://dase.test/api/webhooks/monobank", {
        body: JSON.stringify({ invoiceId: "invoice-1", status: "success" }),
        headers: {
          "x-sign": "signature",
        },
        method: "POST",
      }),
    );

    expect(response.status).toBe(200);
    expect(response.headers.get("Cache-Control")).toBe("no-store");
    await expect(response.json()).resolves.toEqual({
      ok: true,
      outcome: "processed",
    });
  });

  it("rejects invalid webhook signatures with Ukrainian feedback", async () => {
    vi.mocked(getMonobankPaymentProvider).mockReturnValue({
      createInvoice: vi.fn(),
      getInvoiceStatus: vi.fn(),
      verifyWebhook: vi.fn(async () => {
        throw new PaymentWebhookSignatureError();
      }),
    } as never);

    const response = await POST(
      new Request("https://dase.test/api/webhooks/monobank", {
        body: "{}",
        headers: {
          "x-sign": "bad-signature",
        },
        method: "POST",
      }),
    );

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({
      message: "Неправильний підпис вебхуку",
    });
  });
});
