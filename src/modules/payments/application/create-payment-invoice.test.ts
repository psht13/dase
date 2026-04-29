import {
  createPaymentInvoiceUseCase,
  PaymentInvoiceCannotBeCreatedError,
} from "@/modules/payments/application/create-payment-invoice";
import type { PaymentProvider } from "@/modules/payments/application/payment-provider";
import type { PaymentRepository } from "@/modules/payments/application/payment-repository";
import type { OrderRepository } from "@/modules/orders/application/order-repository";
import type { PersistedOrder } from "@/modules/orders/application/order-repository";

const now = new Date("2026-04-30T10:00:00.000Z");

describe("createPaymentInvoiceUseCase", () => {
  it("creates a Monobank invoice, stores provider id, and marks payment pending", async () => {
    const dependencies = createDependencies();

    await expect(
      createPaymentInvoiceUseCase(
        {
          orderId: "order-1",
          redirectUrl: "https://dase.test/o/public-token",
          webhookUrl: "https://dase.test/api/webhooks/monobank",
        },
        dependencies,
      ),
    ).resolves.toEqual({
      invoiceId: "invoice-1",
      paymentId: "payment-1",
      paymentRedirectUrl: "https://pay.test/invoice-1",
      status: "PAYMENT_PENDING",
    });
    expect(dependencies.paymentProvider.createInvoice).toHaveBeenCalledWith(
      expect.objectContaining({
        amountMinor: 2_400_00,
        currency: "UAH",
        items: [
          expect.objectContaining({
            code: "RING-1",
            name: "Каблучка",
            quantity: 2,
          }),
        ],
        reference: "order-1",
      }),
    );
    expect(
      dependencies.paymentRepository.updateProviderInvoice,
    ).toHaveBeenCalledWith({
      paymentId: "payment-1",
      providerInvoiceId: "invoice-1",
      providerModifiedAt: null,
    });
    expect(dependencies.orderRepository.updateStatus).toHaveBeenCalledWith(
      "order-1",
      "PAYMENT_PENDING",
    );
  });

  it("rejects orders without a Monobank payment row", async () => {
    const dependencies = createDependencies({
      paymentRepository: {
        ...createPaymentRepository(),
        findByOrderId: vi.fn(async () => []),
      },
    });

    await expect(
      createPaymentInvoiceUseCase(
        {
          orderId: "order-1",
          redirectUrl: "https://dase.test/o/public-token",
          webhookUrl: "https://dase.test/api/webhooks/monobank",
        },
        dependencies,
      ),
    ).rejects.toBeInstanceOf(PaymentInvoiceCannotBeCreatedError);
  });
});

function createDependencies(
  input: Partial<{
    orderRepository: OrderRepository;
    paymentProvider: PaymentProvider;
    paymentRepository: PaymentRepository;
  }> = {},
) {
  return {
    orderRepository: input.orderRepository ?? createOrderRepository(),
    paymentProvider: input.paymentProvider ?? createPaymentProvider(),
    paymentRepository: input.paymentRepository ?? createPaymentRepository(),
  };
}

function createOrderRepository(): OrderRepository {
  const order = createOrder();

  return {
    confirmCustomerDelivery: vi.fn(),
    create: vi.fn(),
    findById: vi.fn(async () => order),
    findByPublicToken: vi.fn(),
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

function createOrder(): PersistedOrder {
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
        productImageUrlsSnapshot: ["https://example.com/ring.jpg"],
        productNameSnapshot: "Каблучка",
        productSkuSnapshot: "RING-1",
        quantity: 2,
        unitPriceMinor: 1_200_00,
      },
    ],
    ownerId: "owner-1",
    publicToken: "public-token",
    publicTokenExpiresAt: new Date("2026-05-14T10:00:00.000Z"),
    sentAt: now,
    status: "CONFIRMED_BY_CUSTOMER",
    totalMinor: 2_400_00,
    updatedAt: now,
  };
}
