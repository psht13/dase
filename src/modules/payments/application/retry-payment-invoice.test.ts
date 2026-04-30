import type {
  OrderRepository,
  PersistedOrder,
} from "@/modules/orders/application/order-repository";
import type { PaymentProvider } from "@/modules/payments/application/payment-provider";
import type { PaymentRepository } from "@/modules/payments/application/payment-repository";
import { PaymentInvoiceCannotBeCreatedError } from "@/modules/payments/application/create-payment-invoice";
import {
  retryOwnerMonobankInvoiceUseCase,
  retryPublicMonobankInvoiceUseCase,
} from "@/modules/payments/application/retry-payment-invoice";

const now = new Date("2026-04-30T10:00:00.000Z");
const validToken = "secure_public_token_123456789012345";

describe("retry Monobank invoice use cases", () => {
  it("retries a public MonoPay invoice for a confirmed order without provider invoice", async () => {
    const dependencies = createDependencies();

    await expect(
      retryPublicMonobankInvoiceUseCase(
        {
          now,
          publicToken: validToken,
          redirectUrl: `https://dase.test/o/${validToken}`,
          webhookUrl: "https://dase.test/api/webhooks/monobank",
        },
        dependencies,
      ),
    ).resolves.toMatchObject({
      paymentRedirectUrl: "https://pay.test/invoice-1",
      publicToken: validToken,
    });
    expect(dependencies.paymentProvider.createInvoice).toHaveBeenCalledWith(
      expect.objectContaining({
        redirectUrl: `https://dase.test/o/${validToken}`,
      }),
    );
  });

  it("rejects public retry for invalid tokens", async () => {
    await expect(
      retryPublicMonobankInvoiceUseCase(
        {
          publicToken: "short",
          redirectUrl: "https://dase.test/o/short",
          webhookUrl: "https://dase.test/api/webhooks/monobank",
        },
        createDependencies(),
      ),
    ).rejects.toBeInstanceOf(PaymentInvoiceCannotBeCreatedError);
  });

  it("retries an owner MonoPay invoice only for the owner order", async () => {
    const dependencies = createDependencies();

    await expect(
      retryOwnerMonobankInvoiceUseCase(
        {
          orderId: "order-1",
          ownerId: "owner-1",
          publicBaseUrl: "https://dase.test",
          webhookUrl: "https://dase.test/api/webhooks/monobank",
        },
        dependencies,
      ),
    ).resolves.toMatchObject({
      publicToken: validToken,
    });
    expect(dependencies.paymentProvider.createInvoice).toHaveBeenCalledWith(
      expect.objectContaining({
        redirectUrl: `https://dase.test/o/${validToken}`,
      }),
    );
  });

  it("rejects owner retry for another owner", async () => {
    await expect(
      retryOwnerMonobankInvoiceUseCase(
        {
          orderId: "order-1",
          ownerId: "owner-2",
          publicBaseUrl: "https://dase.test",
          webhookUrl: "https://dase.test/api/webhooks/monobank",
        },
        createDependencies(),
      ),
    ).rejects.toBeInstanceOf(PaymentInvoiceCannotBeCreatedError);
  });
});

function createDependencies(
  input: Partial<{
    order: PersistedOrder;
  }> = {},
) {
  const order = input.order ?? createOrder();

  return {
    orderRepository: createOrderRepository(order),
    paymentProvider: createPaymentProvider(),
    paymentRepository: createPaymentRepository(),
  };
}

function createOrderRepository(order: PersistedOrder): OrderRepository {
  return {
    confirmCustomerDelivery: vi.fn(),
    create: vi.fn(),
    findById: vi.fn(async (orderId: string) =>
      order.id === orderId ? order : null,
    ),
    findByPublicToken: vi.fn(async (publicToken: string) =>
      order.publicToken === publicToken ? order : null,
    ),
    listByOwnerId: vi.fn(),
    updateStatus: vi.fn(),
  };
}

function createPaymentProvider(): PaymentProvider {
  return {
    createInvoice: vi.fn(async () => ({
      invoiceId: "invoice-1",
      pageUrl: "https://pay.test/invoice-1",
      providerModifiedAt: null,
    })),
    getInvoiceStatus: vi.fn(),
    verifyWebhook: vi.fn(),
  };
}

function createPaymentRepository(): PaymentRepository {
  const payment = {
    amountMinor: 2_400_00,
    createdAt: now,
    currency: "UAH",
    failureReason: null,
    id: "payment-1",
    orderId: "order-1",
    paidAt: null,
    provider: "MONOBANK" as const,
    providerInvoiceId: null,
    providerModifiedAt: null,
    status: "PENDING" as const,
    updatedAt: now,
  };

  return {
    findByOrderId: vi.fn(async () => [payment]),
    findByProviderInvoiceId: vi.fn(),
    save: vi.fn(),
    updateProviderInvoice: vi.fn(async (input) => ({
      ...payment,
      providerInvoiceId: input.providerInvoiceId,
      providerModifiedAt: input.providerModifiedAt,
    })),
    updateStatus: vi.fn(),
  };
}

function createOrder(input: Partial<PersistedOrder> = {}): PersistedOrder {
  return {
    confirmedAt: now,
    createdAt: now,
    currency: "UAH",
    customerId: "customer-1",
    id: "order-1",
    items: [
      {
        createdAt: now,
        id: "item-1",
        lineTotalMinor: 2_400_00,
        orderId: "order-1",
        productId: "product-1",
        productImageUrlsSnapshot: [],
        productNameSnapshot: "Каблучка",
        productSkuSnapshot: "RING-1",
        quantity: 2,
        unitPriceMinor: 1_200_00,
      },
    ],
    ownerId: "owner-1",
    publicToken: validToken,
    publicTokenExpiresAt: new Date("2026-05-14T10:00:00.000Z"),
    sentAt: now,
    status: "CONFIRMED_BY_CUSTOMER",
    totalMinor: 2_400_00,
    updatedAt: now,
    ...input,
  };
}
