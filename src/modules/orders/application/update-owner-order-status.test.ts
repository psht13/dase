import type { AuditEventRepository } from "@/modules/orders/application/audit-event-repository";
import type {
  OrderRepository,
  PersistedOrder,
} from "@/modules/orders/application/order-repository";
import {
  OwnerOrderStatusUpdateInvalidStatusError,
  OwnerOrderStatusUpdateNotAllowedError,
  OwnerOrderStatusUpdateNotFoundError,
  updateOwnerOrderStatusUseCase,
} from "@/modules/orders/application/update-owner-order-status";

describe("updateOwnerOrderStatusUseCase", () => {
  it("updates a valid manual status transition and appends an audit event", async () => {
    const dependencies = createDependencies(
      createOrder({ status: "SENT_TO_CUSTOMER" }),
    );

    await expect(
      updateOwnerOrderStatusUseCase(
        {
          nextStatus: "CANCELLED",
          orderId: "order-1",
          ownerId: "owner-1",
        },
        dependencies,
      ),
    ).resolves.toEqual({
      fromStatus: "SENT_TO_CUSTOMER",
      orderId: "order-1",
      toStatus: "CANCELLED",
    });

    expect(dependencies.orderRepository.updateStatus).toHaveBeenCalledWith(
      "order-1",
      "CANCELLED",
    );
    expect(dependencies.auditEventRepository.append).toHaveBeenCalledWith(
      expect.objectContaining({
        actorType: "OWNER",
        eventType: "ORDER_STATUS_UPDATED",
        orderId: "order-1",
        payload: expect.objectContaining({
          fromStatus: "SENT_TO_CUSTOMER",
          status: "CANCELLED",
          toStatus: "CANCELLED",
        }),
      }),
    );
  });

  it("rejects invalid status values, missing orders, and forbidden transitions", async () => {
    await expect(
      updateOwnerOrderStatusUseCase(
        {
          nextStatus: "READY",
          orderId: "order-1",
          ownerId: "owner-1",
        },
        createDependencies(createOrder()),
      ),
    ).rejects.toBeInstanceOf(OwnerOrderStatusUpdateInvalidStatusError);

    await expect(
      updateOwnerOrderStatusUseCase(
        {
          nextStatus: "CANCELLED",
          orderId: "order-1",
          ownerId: "owner-2",
        },
        createDependencies(createOrder()),
      ),
    ).rejects.toBeInstanceOf(OwnerOrderStatusUpdateNotFoundError);

    await expect(
      updateOwnerOrderStatusUseCase(
        {
          nextStatus: "PAID",
          orderId: "order-1",
          ownerId: "owner-1",
        },
        createDependencies(createOrder({ status: "SENT_TO_CUSTOMER" })),
      ),
    ).rejects.toBeInstanceOf(OwnerOrderStatusUpdateNotAllowedError);
  });
});

function createDependencies(order: PersistedOrder): {
  auditEventRepository: AuditEventRepository;
  orderRepository: OrderRepository;
} {
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
      findById: vi.fn(async () => order),
      findByPublicToken: vi.fn(),
      listByOwnerId: vi.fn(),
      updateStatus: vi.fn(),
    },
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
