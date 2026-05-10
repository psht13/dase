import type {
  OrderRepository,
  PersistedOrder,
} from "@/modules/orders/application/order-repository";
import { lookupPublicOrderUseCase } from "@/modules/orders/application/lookup-public-order";
import type {
  PaymentRecord,
  PaymentRepository,
} from "@/modules/payments/application/payment-repository";
import type { PaymentRequisiteRepository } from "@/modules/payments/application/payment-requisite-repository";

const validToken = "secure_public_token_123456789012345";

describe("lookupPublicOrderUseCase", () => {
  it("returns a review state for orders sent to customers", async () => {
    const result = await lookupPublicOrderUseCase(
      {
        now: new Date("2026-04-30T10:00:00.000Z"),
        publicToken: validToken,
      },
      {
        orderRepository: createOrderRepository(createOrder()),
        paymentRequisiteRepository: createPaymentRequisiteRepository(),
        paymentRepository: createPaymentRepository(),
      },
    );

    expect(result).toMatchObject({
      available: true,
      order: {
        items: [
          {
            productImageUrlsSnapshot: ["https://example.com/ring.jpg"],
            productNameSnapshot: "Каблучка",
            quantity: 2,
          },
        ],
        paymentProvider: null,
        paymentStatus: null,
        publicToken: validToken,
        state: "review",
        status: "SENT_TO_CUSTOMER",
        totalMinor: 2_400_00,
      },
    });
    expect(JSON.stringify(result)).not.toContain(
      "55e143f7-1f01-4bd9-9bcb-4c7417db75bb",
    );
  });

  it("returns a status state for confirmed orders", async () => {
    const result = await lookupPublicOrderUseCase(
      {
        now: new Date("2026-04-30T10:00:00.000Z"),
        publicToken: validToken,
      },
      {
        orderRepository: createOrderRepository(
          createOrder({ status: "CONFIRMED_BY_CUSTOMER" }),
        ),
        paymentRequisiteRepository: createPaymentRequisiteRepository(),
        paymentRepository: createPaymentRepository({
          providerInvoiceId: null,
          status: "PENDING",
        }),
      },
    );

    expect(result).toMatchObject({
      available: true,
      order: {
        displayNumber: "#55e143f7",
        state: "status",
        status: "CONFIRMED_BY_CUSTOMER",
        statusLabel: "Підтверджено клієнтом",
        statusMessage: "Ваше замовлення обробляється.",
      },
    });
  });

  it("returns a status state for payment-pending orders", async () => {
    const result = await lookupPublicOrderUseCase(
      {
        now: new Date("2026-04-30T10:00:00.000Z"),
        publicToken: validToken,
      },
      {
        orderRepository: createOrderRepository(
          createOrder({ status: "PAYMENT_PENDING" }),
        ),
        paymentRequisiteRepository: createPaymentRequisiteRepository(),
        paymentRepository: createPaymentRepository({
          provider: "MANUAL_CARD_TRANSFER",
          providerInvoiceId: "invoice-1",
          status: "PENDING",
        }),
      },
    );

    expect(result).toMatchObject({
      available: true,
      order: {
        displayNumber: "#55e143f7",
        state: "status",
        status: "PAYMENT_PENDING",
        statusLabel: "Очікуємо оплату",
        statusMessage: "Очікуємо оплату картою.",
      },
    });
  });

  it("returns unavailable for expired order links", async () => {
    await expect(
      lookupPublicOrderUseCase(
        {
          now: new Date("2026-05-15T10:00:00.000Z"),
          publicToken: validToken,
        },
        {
          orderRepository: createOrderRepository(createOrder()),
          paymentRequisiteRepository: createPaymentRequisiteRepository(),
          paymentRepository: createPaymentRepository(),
        },
      ),
    ).resolves.toEqual({
      available: false,
      reason: "expired",
    });
  });

  it("does not expose historical external acquiring payments in public order state", async () => {
    const result = await lookupPublicOrderUseCase(
      {
        now: new Date("2026-04-30T10:00:00.000Z"),
        publicToken: validToken,
      },
      {
        orderRepository: createOrderRepository(
          createOrder({ status: "CONFIRMED_BY_CUSTOMER" }),
        ),
        paymentRequisiteRepository: createPaymentRequisiteRepository(),
        paymentRepository: createPaymentRepository({
          providerInvoiceId: null,
          status: "PENDING",
        }),
      },
    );

    expect(result).toMatchObject({
      available: true,
      order: {
        paymentProvider: null,
      },
    });
  });

  it("returns unavailable for cancelled orders", async () => {
    await expect(
      lookupPublicOrderUseCase(
        {
          now: new Date("2026-04-30T10:00:00.000Z"),
          publicToken: validToken,
        },
        {
          orderRepository: createOrderRepository(
            createOrder({ status: "CANCELLED" }),
          ),
          paymentRequisiteRepository: createPaymentRequisiteRepository(),
          paymentRepository: createPaymentRepository(),
        },
      ),
    ).resolves.toEqual({
      available: false,
      reason: "cancelled",
    });
  });

  it("does not query storage for malformed tokens", async () => {
    const orderRepository = createOrderRepository(createOrder());

    await expect(
      lookupPublicOrderUseCase(
        {
          publicToken: "short",
        },
        {
          orderRepository,
          paymentRequisiteRepository: createPaymentRequisiteRepository(),
          paymentRepository: createPaymentRepository(),
        },
      ),
    ).resolves.toEqual({
      available: false,
      reason: "not-found",
    });
    expect(orderRepository.findByPublicToken).not.toHaveBeenCalled();
  });
});

function createOrder(
  input: Partial<PersistedOrder> = {},
): PersistedOrder {
  const now = new Date("2026-04-30T10:00:00.000Z");

  return {
    confirmedAt: null,
    createdAt: now,
    currency: "UAH",
    customerId: null,
    id: "55e143f7-1f01-4bd9-9bcb-4c7417db75bb",
    items: [
      {
        createdAt: now,
        id: "item-1",
        lineTotalMinor: 2_400_00,
        orderId: "55e143f7-1f01-4bd9-9bcb-4c7417db75bb",
        productId: "product-1",
        productImageUrlsSnapshot: ["https://example.com/ring.jpg"],
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
    status: "SENT_TO_CUSTOMER",
    totalMinor: 2_400_00,
    updatedAt: now,
    ...input,
  };
}

function createOrderRepository(order: PersistedOrder | null): OrderRepository {
  return {
    confirmCustomerDelivery: vi.fn(),
    create: vi.fn(),
    findById: vi.fn(async (orderId: string) =>
      order?.id === orderId ? order : null,
    ),
    findByPublicToken: vi.fn(async () => order),
    listByOwnerId: vi.fn(async (ownerId: string) =>
      order?.ownerId === ownerId ? [order] : [],
    ),
    updateStatus: vi.fn(),
  };
}

function createPaymentRepository(
  input: Partial<Pick<PaymentRecord, "provider" | "providerInvoiceId" | "status">> = {},
): PaymentRepository {
  const providerInvoiceId: string | null =
    "providerInvoiceId" in input ? input.providerInvoiceId ?? null : "invoice-1";
  const provider = input.provider ?? "LEGACY_EXTERNAL_ACQUIRING";
  const status = input.status ?? "PAID";

  return {
    findByOrderId: vi.fn(async () => [
      {
        amountMinor: 2_400_00,
        createdAt: new Date("2026-04-30T10:00:00.000Z"),
        currency: "UAH",
        failureReason: null,
        id: "payment-1",
        orderId: "order-1",
        paidAt: new Date("2026-04-30T12:00:00.000Z"),
        provider,
        providerInvoiceId,
        providerModifiedAt: new Date("2026-04-30T12:00:00.000Z"),
        status,
        updatedAt: new Date("2026-04-30T12:00:00.000Z"),
      },
    ]),
    findByProviderInvoiceId: vi.fn(),
    save: vi.fn(),
    updateProviderInvoice: vi.fn(),
    updateStatus: vi.fn(),
  };
}

function createPaymentRequisiteRepository(): PaymentRequisiteRepository {
  return {
    listActiveByOwnerId: vi.fn(async () => [
      {
        bankName: "ПриватБанк",
        displayValue: "4441 1111 2222 3333",
        id: "requisite-1",
        label: "Основна картка",
        note: "Надішліть квитанцію",
        recipientName: "Олена Петренко",
      },
    ]),
    listByOwnerId: vi.fn(),
    save: vi.fn(),
    setActive: vi.fn(),
    update: vi.fn(),
  };
}
