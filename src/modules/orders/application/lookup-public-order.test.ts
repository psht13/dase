import type {
  OrderRepository,
  PersistedOrder,
} from "@/modules/orders/application/order-repository";
import { lookupPublicOrderUseCase } from "@/modules/orders/application/lookup-public-order";

const validToken = "secure_public_token_123456789012345";

describe("lookupPublicOrderUseCase", () => {
  it("returns a public review model without internal order id", async () => {
    const result = await lookupPublicOrderUseCase(
      {
        now: new Date("2026-04-30T10:00:00.000Z"),
        publicToken: validToken,
      },
      {
        orderRepository: createOrderRepository(createOrder()),
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
        publicToken: validToken,
        totalMinor: 2_400_00,
      },
    });
    expect(JSON.stringify(result)).not.toContain("order-1");
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
        },
      ),
    ).resolves.toEqual({
      available: false,
      reason: "expired",
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
    updateStatus: vi.fn(),
  };
}
