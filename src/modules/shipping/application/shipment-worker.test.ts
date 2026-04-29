import { InMemoryAuditEventRepository } from "@/modules/orders/infrastructure/in-memory-audit-event-repository";
import { InMemoryCustomerRepository } from "@/modules/orders/infrastructure/in-memory-customer-repository";
import { InMemoryOrderRepository } from "@/modules/orders/infrastructure/in-memory-order-repository";
import { InMemoryPaymentRepository } from "@/modules/payments/infrastructure/in-memory-payment-repository";
import { autoCompleteDeliveredOrderJobUseCase } from "@/modules/shipping/application/auto-complete-delivered-order-job";
import { createShipmentJobUseCase } from "@/modules/shipping/application/create-shipment-job";
import { enqueueShipmentCreationForReadyOrderUseCase } from "@/modules/shipping/application/enqueue-shipment-creation";
import { ShipmentCreationRetryUnavailableError } from "@/modules/shipping/application/enqueue-shipment-creation";
import { syncShipmentStatusJobUseCase } from "@/modules/shipping/application/sync-shipment-status-job";
import type { ShippingCarrier } from "@/modules/shipping/application/shipping-carrier";
import { InMemoryShipmentJobQueue } from "@/modules/shipping/infrastructure/in-memory-shipment-job-queue";
import { InMemoryShipmentRepository } from "@/modules/shipping/infrastructure/in-memory-shipment-repository";

const now = new Date("2026-04-30T10:00:00.000Z");

describe("shipment worker use cases", () => {
  it("enqueues shipment creation for confirmed cash-on-delivery orders", async () => {
    const context = await createContext({
      orderStatus: "CONFIRMED_BY_CUSTOMER",
      paymentProvider: "CASH_ON_DELIVERY",
      paymentStatus: "PENDING",
    });

    await expect(
      enqueueShipmentCreationForReadyOrderUseCase(
        {
          orderId: context.order.id,
          requestedBy: "system",
        },
        context,
      ),
    ).resolves.toMatchObject({
      enqueued: true,
      reason: "enqueued",
      shipmentId: context.shipment.id,
    });
    await expect(
      context.orderRepository.findById(context.order.id),
    ).resolves.toMatchObject({
      status: "SHIPMENT_PENDING",
    });
    expect(context.shipmentJobQueue.createShipmentJobs).toEqual([
      expect.objectContaining({
        orderId: context.order.id,
        requestedBy: "system",
        shipmentId: context.shipment.id,
      }),
    ]);
  });

  it("skips shipment creation enqueueing when an order is not ready", async () => {
    const context = await createContext({
      orderStatus: "CONFIRMED_BY_CUSTOMER",
      paymentProvider: "MONOBANK",
      paymentStatus: "PENDING",
    });

    await expect(
      enqueueShipmentCreationForReadyOrderUseCase(
        {
          orderId: context.order.id,
          requestedBy: "system",
        },
        context,
      ),
    ).resolves.toMatchObject({
      enqueued: false,
      reason: "not-ready",
      shipmentId: context.shipment.id,
    });
    expect(context.shipmentJobQueue.createShipmentJobs).toHaveLength(0);
  });

  it("rejects manual retry enqueueing without a failed shipment", async () => {
    const context = await createContext({
      orderStatus: "SHIPMENT_PENDING",
      shipmentStatus: "PENDING",
    });

    await expect(
      enqueueShipmentCreationForReadyOrderUseCase(
        {
          orderId: context.order.id,
          requestedBy: "owner",
          requireFailedShipment: true,
        },
        context,
      ),
    ).rejects.toBeInstanceOf(ShipmentCreationRetryUnavailableError);
  });

  it("does not enqueue shipments that are already created", async () => {
    const context = await createContext({
      orderStatus: "SHIPMENT_PENDING",
      shipmentStatus: "CREATED",
    });

    await expect(
      enqueueShipmentCreationForReadyOrderUseCase(
        {
          orderId: context.order.id,
          requestedBy: "system",
        },
        context,
      ),
    ).resolves.toMatchObject({
      enqueued: false,
      reason: "already-created",
      shipmentId: context.shipment.id,
    });
  });

  it("creates shipments through the selected carrier and schedules tracking sync", async () => {
    const context = await createContext({ orderStatus: "SHIPMENT_PENDING" });
    const carrier = createCarrier({
      createShipment: vi.fn(async () => ({
        carrierShipmentId: "np-shipment-1",
        labelUrl: "https://nova.test/label.pdf",
        trackingNumber: "20450000000000",
      })),
    });

    await expect(
      createShipmentJobUseCase(
        {
          orderId: context.order.id,
          requestedAt: now.toISOString(),
          requestedBy: "system",
          shipmentId: context.shipment.id,
        },
        {
          ...context,
          getShippingCarrier: () => carrier,
          now: () => now,
        },
      ),
    ).resolves.toMatchObject({
      carrierShipmentId: "np-shipment-1",
      labelUrl: "https://nova.test/label.pdf",
      status: "CREATED",
      trackingNumber: "20450000000000",
    });
    await expect(
      context.orderRepository.findById(context.order.id),
    ).resolves.toMatchObject({
      status: "SHIPMENT_CREATED",
    });
    expect(context.shipmentJobQueue.syncShipmentStatusJobs).toEqual([
      expect.objectContaining({
        orderId: context.order.id,
        shipmentId: context.shipment.id,
      }),
    ]);
  });

  it("marks shipment creation failures for retry", async () => {
    const context = await createContext({ orderStatus: "SHIPMENT_PENDING" });
    const carrier = createCarrier({
      createShipment: vi.fn(async () => {
        throw new Error("carrier unavailable");
      }),
    });

    await expect(
      createShipmentJobUseCase(
        {
          orderId: context.order.id,
          requestedAt: now.toISOString(),
          requestedBy: "system",
          shipmentId: context.shipment.id,
        },
        {
          ...context,
          getShippingCarrier: () => carrier,
          now: () => now,
        },
      ),
    ).rejects.toThrow("carrier unavailable");
    await expect(
      context.shipmentRepository.findByOrderId(context.order.id),
    ).resolves.toEqual([
      expect.objectContaining({
        status: "FAILED",
      }),
    ]);
  });

  it("rejects shipment creation when delivery data is incomplete", async () => {
    const context = await createContext({ orderStatus: "SHIPMENT_PENDING" });
    await context.shipmentRepository.updateStatus({
      shipmentId: context.shipment.id,
      status: "PENDING",
      trackingNumber: null,
    });
    const shipmentRepository = {
      findByOrderId: vi.fn(async () => [
        {
          ...context.shipment,
          carrierOfficeId: null,
        },
      ]),
      save: context.shipmentRepository.save.bind(context.shipmentRepository),
      updateCreation: context.shipmentRepository.updateCreation.bind(
        context.shipmentRepository,
      ),
      updateStatus: context.shipmentRepository.updateStatus.bind(
        context.shipmentRepository,
      ),
    };

    await expect(
      createShipmentJobUseCase(
        {
          orderId: context.order.id,
          requestedAt: now.toISOString(),
          requestedBy: "system",
          shipmentId: context.shipment.id,
        },
        {
          ...context,
          getShippingCarrier: () => createCarrier(),
          shipmentRepository,
        },
      ),
    ).rejects.toThrow("Shipment address is incomplete");
  });

  it("rejects shipment creation when required records are missing", async () => {
    const context = await createContext({ orderStatus: "SHIPMENT_PENDING" });
    const job = {
      orderId: context.order.id,
      requestedAt: now.toISOString(),
      requestedBy: "system" as const,
      shipmentId: context.shipment.id,
    };

    await expect(
      createShipmentJobUseCase(job, {
        ...context,
        getShippingCarrier: () => createCarrier(),
        orderRepository: {
          confirmCustomerDelivery:
            context.orderRepository.confirmCustomerDelivery.bind(
              context.orderRepository,
            ),
          create: context.orderRepository.create.bind(context.orderRepository),
          findById: vi.fn(async () => null),
          findByPublicToken: context.orderRepository.findByPublicToken.bind(
            context.orderRepository,
          ),
          listByOwnerId: context.orderRepository.listByOwnerId.bind(
            context.orderRepository,
          ),
          updateStatus: context.orderRepository.updateStatus.bind(
            context.orderRepository,
          ),
        },
      }),
    ).rejects.toThrow("Order not found");
    await expect(
      createShipmentJobUseCase(job, {
        ...context,
        getShippingCarrier: () => createCarrier(),
        shipmentRepository: {
          findByOrderId: vi.fn(async () => []),
          save: context.shipmentRepository.save.bind(context.shipmentRepository),
          updateCreation: context.shipmentRepository.updateCreation.bind(
            context.shipmentRepository,
          ),
          updateStatus: context.shipmentRepository.updateStatus.bind(
            context.shipmentRepository,
          ),
        },
      }),
    ).rejects.toThrow("Shipment not found");
  });

  it("rejects shipment creation when order or recipient data is invalid", async () => {
    const wrongStatusContext = await createContext({ orderStatus: "PAID" });
    const missingRecipientContext = await createContext({
      orderStatus: "SHIPMENT_PENDING",
    });
    const missingCustomerContext = await createContext({
      orderStatus: "SHIPMENT_PENDING",
    });

    await expect(
      createShipmentJobUseCase(
        {
          orderId: wrongStatusContext.order.id,
          requestedAt: now.toISOString(),
          requestedBy: "system",
          shipmentId: wrongStatusContext.shipment.id,
        },
        {
          ...wrongStatusContext,
          getShippingCarrier: () => createCarrier(),
        },
      ),
    ).rejects.toThrow("is not pending shipment");
    await expect(
      createShipmentJobUseCase(
        {
          orderId: missingRecipientContext.order.id,
          requestedAt: now.toISOString(),
          requestedBy: "system",
          shipmentId: missingRecipientContext.shipment.id,
        },
        {
          ...missingRecipientContext,
          getShippingCarrier: () => createCarrier(),
          shipmentRepository: {
            findByOrderId: vi.fn(async () => [
              {
                ...missingRecipientContext.shipment,
                recipientCustomerId: null,
              },
            ]),
            save: missingRecipientContext.shipmentRepository.save.bind(
              missingRecipientContext.shipmentRepository,
            ),
            updateCreation:
              missingRecipientContext.shipmentRepository.updateCreation.bind(
                missingRecipientContext.shipmentRepository,
              ),
            updateStatus:
              missingRecipientContext.shipmentRepository.updateStatus.bind(
                missingRecipientContext.shipmentRepository,
              ),
          },
        },
      ),
    ).rejects.toThrow("Shipment recipient is missing");
    await expect(
      createShipmentJobUseCase(
        {
          orderId: missingCustomerContext.order.id,
          requestedAt: now.toISOString(),
          requestedBy: "system",
          shipmentId: missingCustomerContext.shipment.id,
        },
        {
          ...missingCustomerContext,
          customerRepository: {
            findById: vi.fn(async () => null),
            save: missingCustomerContext.customerRepository.save.bind(
              missingCustomerContext.customerRepository,
            ),
          },
          getShippingCarrier: () => createCarrier(),
        },
      ),
    ).rejects.toThrow("Shipment recipient not found");
  });

  it("maps carrier tracking statuses to internal order statuses", async () => {
    const context = await createContext({
      orderStatus: "SHIPMENT_CREATED",
      shipmentStatus: "CREATED",
    });
    await context.shipmentRepository.updateCreation({
      carrierShipmentId: "np-shipment-1",
      labelUrl: null,
      shipmentId: context.shipment.id,
      trackingNumber: "20450000000000",
    });
    const carrier = createCarrier({
      getShipmentStatus: vi.fn(async () => ({
        status: "DELIVERED" as const,
        statusText: "Вручено",
        trackingNumber: "20450000000000",
        updatedAt: new Date("2026-04-30T12:00:00.000Z"),
      })),
    });

    await expect(
      syncShipmentStatusJobUseCase(
        {
          orderId: context.order.id,
          requestedAt: now.toISOString(),
          shipmentId: context.shipment.id,
        },
        {
          ...context,
          autoCompleteAfterDeliveredHours: 24,
          getShippingCarrier: () => carrier,
          now: () => now,
        },
      ),
    ).resolves.toMatchObject({
      deliveredAt: new Date("2026-04-30T12:00:00.000Z"),
      status: "DELIVERED",
    });
    await expect(
      context.orderRepository.findById(context.order.id),
    ).resolves.toMatchObject({
      status: "DELIVERED",
    });
    expect(context.shipmentJobQueue.autoCompleteDeliveredOrderJobs).toEqual([
      expect.objectContaining({
        deliveredAt: "2026-04-30T12:00:00.000Z",
        orderId: context.order.id,
      }),
    ]);
  });

  it("keeps syncing active shipments while they are in transit", async () => {
    const context = await createContext({
      orderStatus: "SHIPMENT_CREATED",
      shipmentStatus: "CREATED",
    });
    await context.shipmentRepository.updateCreation({
      carrierShipmentId: "np-shipment-1",
      labelUrl: null,
      shipmentId: context.shipment.id,
      trackingNumber: "20450000000000",
    });
    const carrier = createCarrier({
      getShipmentStatus: vi.fn(async () => ({
        status: "IN_TRANSIT" as const,
        statusText: "У дорозі",
        trackingNumber: "20450000000000",
        updatedAt: now,
      })),
    });

    await syncShipmentStatusJobUseCase(
      {
        orderId: context.order.id,
        requestedAt: now.toISOString(),
        shipmentId: context.shipment.id,
      },
      {
        ...context,
        autoCompleteAfterDeliveredHours: 24,
        getShippingCarrier: () => carrier,
        now: () => now,
      },
    );

    await expect(
      context.orderRepository.findById(context.order.id),
    ).resolves.toMatchObject({
      status: "IN_TRANSIT",
    });
    expect(context.shipmentJobQueue.syncShipmentStatusJobs).toHaveLength(1);
  });

  it("maps returned shipments through the return-requested order state", async () => {
    const context = await createContext({
      orderStatus: "IN_TRANSIT",
      shipmentStatus: "CREATED",
    });
    await context.shipmentRepository.updateCreation({
      carrierShipmentId: "np-shipment-1",
      labelUrl: null,
      shipmentId: context.shipment.id,
      trackingNumber: "20450000000000",
    });
    const carrier = createCarrier({
      getShipmentStatus: vi.fn(async () => ({
        status: "RETURNED" as const,
        statusText: "Повернено",
        trackingNumber: "20450000000000",
        updatedAt: now,
      })),
    });

    await syncShipmentStatusJobUseCase(
      {
        orderId: context.order.id,
        requestedAt: now.toISOString(),
        shipmentId: context.shipment.id,
      },
      {
        ...context,
        autoCompleteAfterDeliveredHours: 24,
        getShippingCarrier: () => carrier,
        now: () => now,
      },
    );

    await expect(
      context.orderRepository.findById(context.order.id),
    ).resolves.toMatchObject({
      status: "RETURNED",
    });
  });

  it("records pending tracking statuses without changing the order", async () => {
    const context = await createContext({
      orderStatus: "SHIPMENT_CREATED",
      shipmentStatus: "CREATED",
    });
    await context.shipmentRepository.updateCreation({
      carrierShipmentId: "np-shipment-1",
      labelUrl: null,
      shipmentId: context.shipment.id,
      trackingNumber: "20450000000000",
    });
    const carrier = createCarrier({
      getShipmentStatus: vi.fn(async () => ({
        status: "PENDING" as const,
        statusText: "Очікує оновлення",
        trackingNumber: null,
        updatedAt: null,
      })),
    });

    await syncShipmentStatusJobUseCase(
      {
        orderId: context.order.id,
        requestedAt: now.toISOString(),
        shipmentId: context.shipment.id,
      },
      {
        ...context,
        autoCompleteAfterDeliveredHours: 24,
        getShippingCarrier: () => carrier,
        now: () => now,
      },
    );

    await expect(
      context.orderRepository.findById(context.order.id),
    ).resolves.toMatchObject({
      status: "SHIPMENT_CREATED",
    });
    expect(context.shipmentJobQueue.syncShipmentStatusJobs).toHaveLength(0);
  });

  it("rejects status sync jobs for missing records", async () => {
    const context = await createContext({
      orderStatus: "SHIPMENT_CREATED",
      shipmentStatus: "CREATED",
    });

    await expect(
      syncShipmentStatusJobUseCase(
        {
          orderId: context.order.id,
          requestedAt: now.toISOString(),
          shipmentId: "missing-shipment",
        },
        {
          ...context,
          autoCompleteAfterDeliveredHours: 24,
          getShippingCarrier: () => createCarrier(),
          now: () => now,
        },
      ),
    ).rejects.toThrow("Order or shipment not found");
  });

  it("auto-completes delivered orders after the configured delay", async () => {
    const deliveredAt = new Date("2026-04-29T10:00:00.000Z");
    const context = await createContext({
      orderStatus: "DELIVERED",
      shipmentStatus: "DELIVERED",
    });
    await context.shipmentRepository.updateStatus({
      deliveredAt,
      shipmentId: context.shipment.id,
      status: "DELIVERED",
    });

    await expect(
      autoCompleteDeliveredOrderJobUseCase(
        {
          deliveredAt: deliveredAt.toISOString(),
          orderId: context.order.id,
          requestedAt: now.toISOString(),
          shipmentId: context.shipment.id,
        },
        {
          ...context,
          autoCompleteAfterDeliveredHours: 24,
          now: () => new Date("2026-04-30T10:00:01.000Z"),
        },
      ),
    ).resolves.toEqual({
      completed: true,
      reason: "completed",
    });
    await expect(
      context.orderRepository.findById(context.order.id),
    ).resolves.toMatchObject({
      status: "COMPLETED",
    });
  });

  it("does not auto-complete before the configured delay", async () => {
    const deliveredAt = new Date("2026-04-30T09:00:00.000Z");
    const context = await createContext({
      orderStatus: "DELIVERED",
      shipmentStatus: "DELIVERED",
    });
    await context.shipmentRepository.updateStatus({
      deliveredAt,
      shipmentId: context.shipment.id,
      status: "DELIVERED",
    });

    await expect(
      autoCompleteDeliveredOrderJobUseCase(
        {
          deliveredAt: deliveredAt.toISOString(),
          orderId: context.order.id,
          requestedAt: now.toISOString(),
          shipmentId: context.shipment.id,
        },
        {
          ...context,
          autoCompleteAfterDeliveredHours: 24,
          now: () => now,
        },
      ),
    ).resolves.toEqual({
      completed: false,
      reason: "too-early",
    });
  });

  it("does not auto-complete orders that are no longer delivered", async () => {
    const context = await createContext({
      orderStatus: "SHIPMENT_CREATED",
      shipmentStatus: "CREATED",
    });

    await expect(
      autoCompleteDeliveredOrderJobUseCase(
        {
          deliveredAt: now.toISOString(),
          orderId: context.order.id,
          requestedAt: now.toISOString(),
          shipmentId: context.shipment.id,
        },
        {
          ...context,
          autoCompleteAfterDeliveredHours: 24,
          now: () => now,
        },
      ),
    ).resolves.toEqual({
      completed: false,
      reason: "not-delivered",
    });
  });

  it("does not auto-complete invalid delivered timestamps", async () => {
    const context = await createContext({
      orderStatus: "DELIVERED",
      shipmentStatus: "DELIVERED",
    });

    await expect(
      autoCompleteDeliveredOrderJobUseCase(
        {
          deliveredAt: "not-a-date",
          orderId: context.order.id,
          requestedAt: now.toISOString(),
          shipmentId: context.shipment.id,
        },
        {
          ...context,
          autoCompleteAfterDeliveredHours: 24,
          now: () => now,
        },
      ),
    ).resolves.toEqual({
      completed: false,
      reason: "not-delivered",
    });
  });
});

type ContextInput = {
  orderStatus?:
    | "CONFIRMED_BY_CUSTOMER"
    | "DELIVERED"
    | "IN_TRANSIT"
    | "PAID"
    | "SHIPMENT_CREATED"
    | "SHIPMENT_PENDING";
  paymentProvider?: "CASH_ON_DELIVERY" | "MONOBANK";
  paymentStatus?: "PAID" | "PENDING";
  shipmentStatus?: "CREATED" | "DELIVERED" | "PENDING";
};

async function createContext(input: ContextInput = {}) {
  const auditEventRepository = new InMemoryAuditEventRepository();
  const customerRepository = new InMemoryCustomerRepository();
  const orderRepository = new InMemoryOrderRepository();
  const paymentRepository = new InMemoryPaymentRepository();
  const shipmentJobQueue = new InMemoryShipmentJobQueue();
  const shipmentRepository = new InMemoryShipmentRepository();
  const order = await orderRepository.create({
    items: [],
    ownerId: "owner-1",
    publicToken: "secure_public_token_123456789012345",
    publicTokenExpiresAt: new Date("2026-05-14T10:00:00.000Z"),
    sentAt: now,
    status: input.orderStatus ?? "PAID",
    totalMinor: 2_400_00,
  });
  const customer = await customerRepository.save({
    fullName: "Олена Петренко",
    phone: "+380671234567",
  });

  await paymentRepository.save({
    amountMinor: 2_400_00,
    currency: "UAH",
    failureReason: null,
    orderId: order.id,
    paidAt:
      input.paymentStatus === "PAID"
        ? new Date("2026-04-30T09:00:00.000Z")
        : null,
    provider: input.paymentProvider ?? "MONOBANK",
    providerInvoiceId: "invoice-1",
    providerModifiedAt: null,
    status: input.paymentStatus ?? "PAID",
  });
  const shipment = await shipmentRepository.save({
    addressText: "Київ, Відділення №1, вул. Хрещатик, 1",
    carrier: "NOVA_POSHTA",
    carrierOfficeId: "warehouse-1",
    carrierPayload: { warehouseName: "Відділення №1" },
    carrierShipmentId: null,
    cityName: "Київ",
    cityRef: "city-1",
    deliveredAt: null,
    labelUrl: null,
    orderId: order.id,
    recipientCustomerId: customer.id,
    status: input.shipmentStatus ?? "PENDING",
    trackingNumber: null,
  });

  return {
    auditEventRepository,
    customerRepository,
    order,
    orderRepository,
    paymentRepository,
    shipment,
    shipmentJobQueue,
    shipmentRepository,
  };
}

function createCarrier(
  overrides: Partial<ShippingCarrier> = {},
): ShippingCarrier {
  return {
    createShipment: vi.fn(async () => ({
      carrierShipmentId: "shipment-1",
      labelUrl: null,
      trackingNumber: "20450000000000",
    })),
    getShipmentStatus: vi.fn(async () => ({
      status: "CREATED" as const,
      statusText: "Створено",
      trackingNumber: "20450000000000",
      updatedAt: now,
    })),
    searchCities: vi.fn(),
    searchWarehouses: vi.fn(),
    ...overrides,
  };
}
