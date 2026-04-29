import type {
  ProductRecord,
  ProductRepository,
} from "@/modules/catalog/application/product-repository";
import type { AuditEventRepository } from "@/modules/orders/application/audit-event-repository";
import type {
  CreateOrderInput,
  OrderRepository,
  PersistedOrder,
} from "@/modules/orders/application/order-repository";
import {
  createOrderDraftUseCase,
  OrderBuilderSelectionRequiredError,
  ProductUnavailableForOrderError,
} from "@/modules/orders/application/create-order-draft";

describe("createOrderDraftUseCase", () => {
  it("creates a sent public order link with product snapshots and audit event", async () => {
    const now = new Date("2026-04-30T10:00:00.000Z");
    const product = createProduct();
    const orderRepository = createOrderRepository();
    const auditEventRepository = createAuditEventRepository();

    const order = await createOrderDraftUseCase(
      {
        items: [{ productId: product.id, quantity: 2 }],
        ownerId: "owner-1",
      },
      {
        auditEventRepository,
        generateToken: () => "secure-public-token-with-enough-entropy",
        now: () => now,
        orderRepository,
        productRepository: createProductRepository([product]),
      },
    );

    expect(order.status).toBe("SENT_TO_CUSTOMER");
    expect(order.sentAt).toEqual(now);
    expect(order.publicToken).toBe("secure-public-token-with-enough-entropy");
    expect(order.publicTokenExpiresAt).toEqual(
      new Date("2026-05-14T10:00:00.000Z"),
    );
    expect(order.totalMinor).toBe(2_400_00);
    expect(order.items[0]).toMatchObject({
      lineTotalMinor: 2_400_00,
      productImageUrlsSnapshot: ["https://example.com/ring.jpg"],
      productNameSnapshot: "Каблучка",
      productSkuSnapshot: "RING-1",
      quantity: 2,
      unitPriceMinor: 1_200_00,
    });
    expect(auditEventRepository.append).toHaveBeenCalledWith(
      expect.objectContaining({
        actorType: "OWNER",
        actorUserId: "owner-1",
        eventType: "ORDER_CREATED",
        orderId: order.id,
        payload: expect.objectContaining({
          itemCount: 1,
          status: "SENT_TO_CUSTOMER",
          totalMinor: 2_400_00,
        }),
      }),
    );
  });

  it("requires at least one product", async () => {
    await expect(
      createOrderDraftUseCase(
        {
          items: [],
          ownerId: "owner-1",
        },
        {
          auditEventRepository: createAuditEventRepository(),
          orderRepository: createOrderRepository(),
          productRepository: createProductRepository([]),
        },
      ),
    ).rejects.toBeInstanceOf(OrderBuilderSelectionRequiredError);
  });

  it("rejects inactive products", async () => {
    await expect(
      createOrderDraftUseCase(
        {
          items: [{ productId: "product-1", quantity: 1 }],
          ownerId: "owner-1",
        },
        {
          auditEventRepository: createAuditEventRepository(),
          orderRepository: createOrderRepository(),
          productRepository: createProductRepository([
            createProduct({ isActive: false }),
          ]),
        },
      ),
    ).rejects.toBeInstanceOf(ProductUnavailableForOrderError);
  });
});

function createProduct(input: Partial<ProductRecord> = {}): ProductRecord {
  const now = new Date("2026-04-30T00:00:00.000Z");

  return {
    createdAt: now,
    currency: "UAH",
    description: "Срібна каблучка",
    id: "product-1",
    images: [
      {
        altText: "Каблучка",
        createdAt: now,
        id: "image-1",
        productId: "product-1",
        sortOrder: 0,
        url: "https://example.com/ring.jpg",
      },
    ],
    isActive: true,
    name: "Каблучка",
    ownerId: "owner-1",
    priceMinor: 1_200_00,
    sku: "RING-1",
    stockQuantity: 3,
    updatedAt: now,
    ...input,
  };
}

function createProductRepository(
  products: ProductRecord[],
): ProductRepository {
  return {
    findById: vi.fn(async (productId: string) =>
      products.find((product) => product.id === productId) ?? null,
    ),
    findBySku: vi.fn(),
    listByOwnerId: vi.fn(),
    save: vi.fn(),
    update: vi.fn(),
  };
}

function createOrderRepository(): OrderRepository {
  return {
    confirmCustomerDelivery: vi.fn(),
    create: vi.fn(async (input: CreateOrderInput) => {
      const now = new Date("2026-04-30T10:00:00.000Z");

      return {
        confirmedAt: null,
        createdAt: now,
        currency: input.currency ?? "UAH",
        customerId: input.customerId ?? null,
        id: "order-1",
        items: input.items.map((item, index) => ({
          ...item,
          createdAt: now,
          id: `item-${index + 1}`,
          orderId: "order-1",
        })),
        ownerId: input.ownerId,
        publicToken: input.publicToken,
        publicTokenExpiresAt: input.publicTokenExpiresAt,
        sentAt: input.sentAt ?? null,
        status: input.status ?? "DRAFT",
        totalMinor: input.totalMinor,
        updatedAt: now,
      } satisfies PersistedOrder;
    }),
    findByPublicToken: vi.fn(),
    updateStatus: vi.fn(),
  };
}

function createAuditEventRepository(): AuditEventRepository {
  return {
    append: vi.fn(async (event) => ({
      ...event,
      createdAt: new Date("2026-04-30T10:00:00.000Z"),
      id: "event-1",
    })),
    listForOrder: vi.fn(),
  };
}
