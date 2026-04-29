import type { AuditEventRepository } from "@/modules/orders/application/audit-event-repository";
import type { CustomerRepository } from "@/modules/orders/application/customer-repository";
import type {
  OrderRepository,
  PersistedOrder,
} from "@/modules/orders/application/order-repository";
import type { OrderTagRepository } from "@/modules/orders/application/order-tag-repository";
import {
  getOwnerOrderDetailsUseCase,
  listOwnerOrdersUseCase,
} from "@/modules/orders/application/owner-order-read-model";
import type { PaymentRepository } from "@/modules/payments/application/payment-repository";
import type { ShipmentRepository } from "@/modules/shipping/application/shipment-repository";

describe("owner order read use cases", () => {
  it("lists owner orders with filters for status, carrier, payment, tag, date, and phone", async () => {
    const firstOrder = createOrder({
      createdAt: new Date("2026-04-30T10:00:00.000Z"),
      customerId: "customer-1",
      id: "order-1",
      status: "SHIPMENT_PENDING",
    });
    const secondOrder = createOrder({
      createdAt: new Date("2026-04-29T10:00:00.000Z"),
      customerId: "customer-2",
      id: "order-2",
      status: "SENT_TO_CUSTOMER",
    });
    const dependencies = createDependencies([firstOrder, secondOrder]);

    const orders = await listOwnerOrdersUseCase(
      {
        filters: {
          dateFrom: new Date("2026-04-30T00:00:00.000Z"),
          dateTo: new Date("2026-04-30T23:59:59.999Z"),
          deliveryCarrier: "NOVA_POSHTA",
          paymentMethod: "CASH_ON_DELIVERY",
          search: "+380671234567",
          status: "SHIPMENT_PENDING",
          tagId: "tag-vip",
        },
        ownerId: "owner-1",
      },
      dependencies,
    );

    expect(orders).toHaveLength(1);
    expect(orders[0]).toMatchObject({
      customer: { fullName: "Олена Петренко" },
      id: "order-1",
      tags: [{ name: "Подарунок" }],
    });
  });

  it("searches owner orders by tracking number", async () => {
    const order = createOrder({
      customerId: "customer-1",
      id: "order-1",
      status: "SHIPMENT_CREATED",
    });
    const dependencies = createDependencies([order]);

    const orders = await listOwnerOrdersUseCase(
      {
        filters: {
          search: "ttn-001",
        },
        ownerId: "owner-1",
      },
      dependencies,
    );

    expect(orders).toHaveLength(1);
    expect(orders[0]?.shipments[0]?.trackingNumber).toBe("TTN-001");
  });

  it("loads order details with status history from audit events", async () => {
    const order = createOrder({
      customerId: "customer-1",
      id: "order-1",
      status: "CANCELLED",
    });
    const dependencies = createDependencies([order]);

    const details = await getOwnerOrderDetailsUseCase(
      {
        orderId: "order-1",
        ownerId: "owner-1",
      },
      dependencies,
    );

    expect(details).toMatchObject({
      auditEvents: [
        { eventType: "ORDER_CREATED" },
        { eventType: "ORDER_STATUS_UPDATED" },
      ],
      id: "order-1",
      statusHistory: [
        { status: "SENT_TO_CUSTOMER" },
        { status: "CANCELLED" },
      ],
    });
  });
});

function createDependencies(
  orders: PersistedOrder[],
): {
  auditEventRepository: AuditEventRepository;
  customerRepository: CustomerRepository;
  orderRepository: OrderRepository;
  orderTagRepository: OrderTagRepository;
  paymentRepository: PaymentRepository;
  shipmentRepository: ShipmentRepository;
} {
  const now = new Date("2026-04-30T12:00:00.000Z");

  return {
    auditEventRepository: {
      append: vi.fn(),
      listForOrder: vi.fn(async () => [
        {
          actorCustomerId: null,
          actorType: "OWNER" as const,
          actorUserId: "owner-1",
          createdAt: new Date("2026-04-30T10:00:00.000Z"),
          eventType: "ORDER_CREATED",
          id: "event-1",
          orderId: "order-1",
          payload: { status: "SENT_TO_CUSTOMER" },
        },
        {
          actorCustomerId: null,
          actorType: "OWNER" as const,
          actorUserId: "owner-1",
          createdAt: new Date("2026-04-30T12:00:00.000Z"),
          eventType: "ORDER_STATUS_UPDATED",
          id: "event-2",
          orderId: "order-1",
          payload: { status: "CANCELLED" },
        },
      ]),
    },
    customerRepository: {
      findById: vi.fn(async (customerId: string) =>
        customerId === "customer-1"
          ? {
              createdAt: now,
              email: null,
              fullName: "Олена Петренко",
              id: "customer-1",
              phone: "+380671234567",
              updatedAt: now,
            }
          : {
              createdAt: now,
              email: null,
              fullName: "Інший клієнт",
              id: "customer-2",
              phone: "+380501111111",
              updatedAt: now,
            },
      ),
      save: vi.fn(),
    },
    orderRepository: {
      confirmCustomerDelivery: vi.fn(),
      create: vi.fn(),
      findById: vi.fn(async (orderId: string) =>
        orders.find((order) => order.id === orderId) ?? null,
      ),
      findByPublicToken: vi.fn(),
      listByOwnerId: vi.fn(async (ownerId: string) =>
        orders.filter((order) => order.ownerId === ownerId),
      ),
      updateStatus: vi.fn(),
    },
    orderTagRepository: {
      findByIdForOwner: vi.fn(),
      findByNameForOwner: vi.fn(),
      linkToOrder: vi.fn(),
      listForOrder: vi.fn(async (orderId: string) =>
        orderId === "order-1"
          ? [
              {
                color: null,
                createdAt: now,
                id: "tag-vip",
                name: "Подарунок",
                ownerId: "owner-1",
                updatedAt: now,
              },
            ]
          : [],
      ),
      listForOwner: vi.fn(),
      save: vi.fn(),
      unlinkFromOrder: vi.fn(),
    },
    paymentRepository: {
      findByOrderId: vi.fn(async (orderId: string) =>
        orderId === "order-1"
          ? [
              {
                amountMinor: 2_400_00,
                createdAt: now,
                currency: "UAH",
                failureReason: null,
                id: "payment-1",
                orderId,
                paidAt: null,
                provider: "CASH_ON_DELIVERY" as const,
                providerInvoiceId: null,
                providerModifiedAt: null,
                status: "PENDING" as const,
                updatedAt: now,
              },
            ]
          : [],
      ),
      findByProviderInvoiceId: vi.fn(),
      save: vi.fn(),
      updateProviderInvoice: vi.fn(),
      updateStatus: vi.fn(),
    },
    shipmentRepository: {
      findByOrderId: vi.fn(async (orderId: string) =>
        orderId === "order-1"
          ? [
              {
                addressText: "Київ, Відділення №1",
                carrier: "NOVA_POSHTA" as const,
                carrierOfficeId: "warehouse-1",
                carrierPayload: null,
                carrierShipmentId: "carrier-1",
                cityName: "Київ",
                cityRef: "city-1",
                createdAt: now,
                deliveredAt: null,
                id: "shipment-1",
                labelUrl: null,
                orderId,
                recipientCustomerId: "customer-1",
                status: "CREATED" as const,
                trackingNumber: "TTN-001",
                updatedAt: now,
              },
            ]
          : [],
      ),
      save: vi.fn(),
      updateCreation: vi.fn(),
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
    publicToken: "secure-public-token",
    publicTokenExpiresAt: new Date("2026-05-14T10:00:00.000Z"),
    sentAt: now,
    status: "SENT_TO_CUSTOMER",
    totalMinor: 2_400_00,
    updatedAt: now,
    ...input,
  };
}
