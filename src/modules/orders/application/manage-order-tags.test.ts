import type { AuditEventRepository } from "@/modules/orders/application/audit-event-repository";
import type {
  OrderRepository,
  PersistedOrder,
} from "@/modules/orders/application/order-repository";
import type {
  OrderTagRecord,
  OrderTagRepository,
} from "@/modules/orders/application/order-tag-repository";
import {
  assignOrderTagUseCase,
  createAndAssignOrderTagUseCase,
  OrderTagOwnerOrderNotFoundError,
  OrderTagValidationError,
  removeOrderTagUseCase,
} from "@/modules/orders/application/manage-order-tags";

describe("order tag management", () => {
  it("creates a tag, assigns it to the order, and writes an audit event", async () => {
    const dependencies = createDependencies();

    const tag = await createAndAssignOrderTagUseCase(
      {
        name: "  Подарунок   клієнту ",
        orderId: "order-1",
        ownerId: "owner-1",
      },
      dependencies,
    );

    expect(tag.name).toBe("Подарунок клієнту");
    expect(dependencies.orderTagRepository.linkToOrder).toHaveBeenCalledWith(
      "order-1",
      "tag-1",
    );
    expect(dependencies.auditEventRepository.append).toHaveBeenCalledWith(
      expect.objectContaining({
        actorType: "OWNER",
        eventType: "ORDER_TAG_ASSIGNED",
        orderId: "order-1",
        payload: expect.objectContaining({
          tagName: "Подарунок клієнту",
        }),
      }),
    );
  });

  it("assigns an existing owner tag", async () => {
    const dependencies = createDependencies({
      existingTag: createTag({ id: "tag-existing", name: "Терміново" }),
    });

    await assignOrderTagUseCase(
      {
        orderId: "order-1",
        ownerId: "owner-1",
        tagId: "tag-existing",
      },
      dependencies,
    );

    expect(dependencies.orderTagRepository.linkToOrder).toHaveBeenCalledWith(
      "order-1",
      "tag-existing",
    );
  });

  it("removes a tag and writes an audit event", async () => {
    const dependencies = createDependencies({
      existingTag: createTag({ id: "tag-existing", name: "Терміново" }),
    });

    await removeOrderTagUseCase(
      {
        orderId: "order-1",
        ownerId: "owner-1",
        tagId: "tag-existing",
      },
      dependencies,
    );

    expect(dependencies.orderTagRepository.unlinkFromOrder).toHaveBeenCalledWith(
      "order-1",
      "tag-existing",
    );
    expect(dependencies.auditEventRepository.append).toHaveBeenCalledWith(
      expect.objectContaining({
        eventType: "ORDER_TAG_REMOVED",
        payload: expect.objectContaining({ tagName: "Терміново" }),
      }),
    );
  });

  it("rejects invalid tag names and non-owner orders", async () => {
    await expect(
      createAndAssignOrderTagUseCase(
        {
          name: "x",
          orderId: "order-1",
          ownerId: "owner-1",
        },
        createDependencies(),
      ),
    ).rejects.toBeInstanceOf(OrderTagValidationError);

    await expect(
      createAndAssignOrderTagUseCase(
        {
          name: "Подарунок",
          orderId: "order-1",
          ownerId: "owner-2",
        },
        createDependencies(),
      ),
    ).rejects.toBeInstanceOf(OrderTagOwnerOrderNotFoundError);
  });
});

function createDependencies(input: { existingTag?: OrderTagRecord } = {}): {
  auditEventRepository: AuditEventRepository;
  orderRepository: OrderRepository;
  orderTagRepository: OrderTagRepository;
} {
  const existingTag = input.existingTag ?? null;

  return {
    auditEventRepository: {
      append: vi.fn(async (event) => ({
        ...event,
        createdAt: new Date("2026-04-30T10:00:00.000Z"),
        id: "event-1",
      })),
      listForOrder: vi.fn(),
    },
    orderRepository: {
      confirmCustomerDelivery: vi.fn(),
      create: vi.fn(),
      findById: vi.fn(async () => createOrder()),
      findByPublicToken: vi.fn(),
      listByOwnerId: vi.fn(),
      updateStatus: vi.fn(),
    },
    orderTagRepository: {
      findByIdForOwner: vi.fn(async (tagId: string, ownerId: string) =>
        existingTag?.id === tagId && existingTag.ownerId === ownerId
          ? existingTag
          : null,
      ),
      findByNameForOwner: vi.fn(async (name: string, ownerId: string) =>
        existingTag?.name === name && existingTag.ownerId === ownerId
          ? existingTag
          : null,
      ),
      linkToOrder: vi.fn(),
      listForOrder: vi.fn(),
      listForOwner: vi.fn(),
      save: vi.fn(async (tag) => createTag({ ...tag, id: "tag-1" })),
      unlinkFromOrder: vi.fn(),
    },
  };
}

function createTag(input: Partial<OrderTagRecord> = {}): OrderTagRecord {
  const now = new Date("2026-04-30T10:00:00.000Z");

  return {
    color: null,
    createdAt: now,
    id: "tag-1",
    name: "Подарунок",
    ownerId: "owner-1",
    updatedAt: now,
    ...input,
  };
}

function createOrder(input: Partial<PersistedOrder> = {}): PersistedOrder {
  const now = new Date("2026-04-30T10:00:00.000Z");

  return {
    confirmedAt: null,
    createdAt: now,
    currency: "UAH",
    customerId: null,
    id: "order-1",
    items: [],
    ownerId: "owner-1",
    publicToken: "secure-public-token",
    publicTokenExpiresAt: new Date("2026-05-14T10:00:00.000Z"),
    sentAt: now,
    status: "SENT_TO_CUSTOMER",
    totalMinor: 2_400_00,
    updatedAt: now,
    ...input,
  };
}
