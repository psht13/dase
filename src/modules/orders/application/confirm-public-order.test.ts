import {
  confirmPublicOrderUseCase,
  PublicOrderCannotBeConfirmedError,
  PublicOrderConfirmationUnavailableError,
} from "@/modules/orders/application/confirm-public-order";
import type { AuditEventRepository } from "@/modules/orders/application/audit-event-repository";
import type { CustomerRepository } from "@/modules/orders/application/customer-repository";
import type {
  OrderRepository,
  PersistedOrder,
} from "@/modules/orders/application/order-repository";
import type {
  PaymentRecord,
  PaymentRepository,
} from "@/modules/payments/application/payment-repository";
import type { ShipmentJobQueue } from "@/modules/shipping/application/shipment-job-queue";
import type {
  ShipmentRecord,
  ShipmentRepository,
} from "@/modules/shipping/application/shipment-repository";

const validToken = "secure_public_token_123456789012345";
const now = new Date("2026-04-30T10:00:00.000Z");

describe("confirmPublicOrderUseCase", () => {
  it("stores customer delivery data and confirms the order", async () => {
    const dependencies = createDependencies(createOrder());

    await expect(
      confirmPublicOrderUseCase(createInput(), {
        ...dependencies,
        now: () => now,
      }),
    ).resolves.toEqual({
      confirmedAt: now,
      orderId: "order-1",
      status: "CONFIRMED_BY_CUSTOMER",
    });
    expect(
      dependencies.orderRepository.confirmCustomerDelivery,
    ).toHaveBeenCalledWith({
      confirmedAt: now,
      customerId: "customer-1",
      orderId: "order-1",
    });
    expect(dependencies.paymentRepository.save).toHaveBeenCalledWith(
      expect.objectContaining({
        amountMinor: 2_400_00,
        orderId: "order-1",
        provider: "CASH_ON_DELIVERY",
        status: "PENDING",
      }),
    );
    expect(dependencies.shipmentRepository.save).toHaveBeenCalledWith(
      expect.objectContaining({
        carrier: "NOVA_POSHTA",
        carrierOfficeId: "warehouse-1",
        cityName: "Київ",
        cityRef: "city-1",
        recipientCustomerId: "customer-1",
        status: "PENDING",
      }),
    );
    expect(dependencies.auditEventRepository.append).toHaveBeenCalledWith(
      expect.objectContaining({
        actorCustomerId: "customer-1",
        actorType: "CUSTOMER",
        eventType: "ORDER_CONFIRMED_BY_CUSTOMER",
      }),
    );
    expect(dependencies.orderRepository.updateStatus).toHaveBeenCalledWith(
      "order-1",
      "SHIPMENT_PENDING",
    );
    expect(
      dependencies.shipmentJobQueue.enqueueCreateShipment,
    ).toHaveBeenCalledWith(
      expect.objectContaining({
        orderId: "order-1",
        requestedBy: "system",
        shipmentId: "shipment-1",
      }),
    );
  });

  it("runs confirmation writes through a unit of work when provided", async () => {
    const baseDependencies = createDependencies(createOrder());
    const transactionalDependencies = createDependencies(createOrder());
    const customerConfirmationUnitOfWork = {
      run: vi.fn(async (work) => work(transactionalDependencies)),
    };

    await expect(
      confirmPublicOrderUseCase(createInput(), {
        ...baseDependencies,
        customerConfirmationUnitOfWork,
        now: () => now,
      }),
    ).resolves.toEqual({
      confirmedAt: now,
      orderId: "order-1",
      status: "CONFIRMED_BY_CUSTOMER",
    });

    expect(customerConfirmationUnitOfWork.run).toHaveBeenCalledTimes(1);
    expect(baseDependencies.customerRepository.save).not.toHaveBeenCalled();
    expect(transactionalDependencies.customerRepository.save).toHaveBeenCalled();
    expect(
      transactionalDependencies.auditEventRepository.append,
    ).toHaveBeenCalledWith(
      expect.objectContaining({
        eventType: "ORDER_CONFIRMED_BY_CUSTOMER",
      }),
    );
  });

  it("rejects expired public tokens", async () => {
    await expect(
      confirmPublicOrderUseCase(createInput(), {
        ...createDependencies(createOrder()),
        now: () => new Date("2026-05-15T10:00:00.000Z"),
      }),
    ).rejects.toBeInstanceOf(PublicOrderConfirmationUnavailableError);
  });

  it("rejects orders that are not waiting for customer confirmation", async () => {
    await expect(
      confirmPublicOrderUseCase(createInput(), {
        ...createDependencies(createOrder({ status: "PAYMENT_PENDING" })),
        now: () => now,
      }),
    ).rejects.toBeInstanceOf(PublicOrderCannotBeConfirmedError);
  });
});

function createInput() {
  return {
    carrier: "NOVA_POSHTA" as const,
    cityId: "city-1",
    cityName: "Київ",
    fullName: "Олена Петренко",
    paymentMethod: "CASH_ON_DELIVERY" as const,
    phone: "+380671234567",
    publicToken: validToken,
    warehouseAddress: "вул. Хрещатик, 1",
    warehouseId: "warehouse-1",
    warehouseName: "Відділення №1",
  };
}

function createDependencies(order: PersistedOrder) {
  let currentOrder = order;
  let savedPayment: PaymentRecord = {
    amountMinor: 2_400_00,
    createdAt: now,
    currency: "UAH",
    failureReason: null,
    id: "payment-1",
    orderId: "order-1",
    paidAt: null,
    provider: "CASH_ON_DELIVERY" as const,
    providerInvoiceId: null,
    providerModifiedAt: null,
    status: "PENDING" as const,
    updatedAt: now,
  };
  let savedShipmentId = "shipment-1";

  return {
    auditEventRepository: {
      append: vi.fn(async (event) => ({
        ...event,
        createdAt: now,
        id: "event-1",
      })),
      listForOrder: vi.fn(),
    } satisfies AuditEventRepository,
    customerRepository: {
      findById: vi.fn(),
      save: vi.fn(async (input) => ({
        ...input,
        createdAt: now,
        email: null,
        id: "customer-1",
        updatedAt: now,
      })),
    } satisfies CustomerRepository,
    orderRepository: {
      confirmCustomerDelivery: vi.fn(async (input) => {
        currentOrder = {
          ...currentOrder,
          confirmedAt: input.confirmedAt,
          customerId: input.customerId,
          status: "CONFIRMED_BY_CUSTOMER",
        };
      }),
      create: vi.fn(),
      findById: vi.fn(async (orderId: string) =>
        currentOrder.id === orderId ? currentOrder : null,
      ),
      findByPublicToken: vi.fn(async () => currentOrder),
      listByOwnerId: vi.fn(async (ownerId: string) =>
        currentOrder.ownerId === ownerId ? [currentOrder] : [],
      ),
      updateStatus: vi.fn(async (_orderId, status) => {
        currentOrder = {
          ...currentOrder,
          status,
        };
      }),
    } satisfies OrderRepository,
    paymentRepository: {
      findByOrderId: vi.fn(async () => [savedPayment]),
      findByProviderInvoiceId: vi.fn(),
      save: vi.fn(async (payment) => {
        savedPayment = {
          ...payment,
          createdAt: now,
          id: "payment-1",
          updatedAt: now,
        };

        return savedPayment;
      }),
      updateProviderInvoice: vi.fn(),
      updateStatus: vi.fn(),
    } satisfies PaymentRepository,
    shipmentJobQueue: {
      enqueueAutoCompleteDeliveredOrder: vi.fn(),
      enqueueCreateShipment: vi.fn(async () => "job-1"),
      enqueueSyncShipmentStatus: vi.fn(),
    } satisfies ShipmentJobQueue,
    shipmentRepository: {
      findByOrderId: vi.fn(async (): Promise<ShipmentRecord[]> => [
        {
          addressText: "Київ, Відділення №1",
          carrier: "NOVA_POSHTA",
          carrierOfficeId: "warehouse-1",
          carrierPayload: { warehouseName: "Відділення №1" },
          carrierShipmentId: null,
          cityName: "Київ",
          cityRef: "city-1",
          createdAt: now,
          deliveredAt: null,
          id: savedShipmentId,
          labelUrl: null,
          orderId: "order-1",
          recipientCustomerId: "customer-1",
          status: "PENDING",
          trackingNumber: null,
          updatedAt: now,
        } satisfies ShipmentRecord,
      ]),
      save: vi.fn(async (shipment) => {
        savedShipmentId = "shipment-1";

        return {
          ...shipment,
          createdAt: now,
          id: savedShipmentId,
          updatedAt: now,
        };
      }),
      updateCreation: vi.fn(),
      updateStatus: vi.fn(),
    } satisfies ShipmentRepository,
  };
}

function createOrder(input: Partial<PersistedOrder> = {}): PersistedOrder {
  return {
    confirmedAt: null,
    createdAt: now,
    currency: "UAH",
    customerId: null,
    id: "order-1",
    items: [],
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
