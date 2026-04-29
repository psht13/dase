import type { ProductRecord } from "@/modules/catalog/application/product-repository";
import type {
  CreateOrderInput,
  PersistedOrder,
} from "@/modules/orders/application/order-repository";
import { appendOrderBuilderItemToFormData } from "@/modules/orders/ui/order-builder-form-data";
import { createOrderDraftAction } from "@/modules/orders/ui/order-actions";
import { getProductRepository } from "@/modules/catalog/infrastructure/product-repository-factory";
import { getOrderRepository } from "@/modules/orders/infrastructure/order-repository-factory";
import { getAuditEventRepository } from "@/modules/orders/infrastructure/audit-event-repository-factory";
import { requireOwnerSession } from "@/modules/users/ui/require-owner-session";

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

vi.mock("next/headers", () => ({
  headers: vi.fn(async () => new Headers({ origin: "https://dase.test" })),
}));

vi.mock("@/modules/users/ui/require-owner-session", () => ({
  requireOwnerSession: vi.fn(),
}));

vi.mock("@/modules/catalog/infrastructure/product-repository-factory", () => ({
  getProductRepository: vi.fn(),
}));

vi.mock("@/modules/orders/infrastructure/order-repository-factory", () => ({
  getOrderRepository: vi.fn(),
}));

vi.mock(
  "@/modules/orders/infrastructure/audit-event-repository-factory",
  () => ({
    getAuditEventRepository: vi.fn(),
  }),
);

describe("createOrderDraftAction", () => {
  it("creates a public URL for the owner order builder", async () => {
    vi.mocked(requireOwnerSession).mockResolvedValue({
      email: "owner@example.com",
      id: "owner-1",
      name: "Власниця",
      role: "owner",
    });
    vi.mocked(getProductRepository).mockReturnValue({
      findById: vi.fn(async () => createProduct()),
    } as never);
    vi.mocked(getOrderRepository).mockReturnValue({
      create: vi.fn(async (input: CreateOrderInput) => createOrder(input)),
    } as never);
    vi.mocked(getAuditEventRepository).mockReturnValue({
      append: vi.fn(async (event) => ({
        ...event,
        createdAt: new Date("2026-04-30T10:00:00.000Z"),
        id: "event-1",
      })),
    } as never);
    const formData = new FormData();
    appendOrderBuilderItemToFormData(formData, {
      productId: "product-1",
      quantity: 2,
    });

    await expect(createOrderDraftAction(formData)).resolves.toMatchObject({
      message: "Посилання замовлення створено",
      ok: true,
      publicUrl: expect.stringMatching(/^https:\/\/dase\.test\/o\//),
    });
  });

  it("returns a Ukrainian validation message when nothing is selected", async () => {
    vi.mocked(requireOwnerSession).mockResolvedValue({
      email: "owner@example.com",
      id: "owner-1",
      name: "Власниця",
      role: "owner",
    });

    await expect(createOrderDraftAction(new FormData())).resolves.toEqual({
      message: "Оберіть хоча б один товар",
      ok: false,
    });
  });
});

function createProduct(): ProductRecord {
  const now = new Date("2026-04-30T10:00:00.000Z");

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
  };
}

function createOrder(input: CreateOrderInput): PersistedOrder {
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
  };
}
