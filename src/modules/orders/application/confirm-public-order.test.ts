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
import type { PaymentRepository } from "@/modules/payments/application/payment-repository";
import type { ShipmentRepository } from "@/modules/shipping/application/shipment-repository";

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
      save: vi.fn(async (input) => ({
        ...input,
        createdAt: now,
        email: null,
        id: "customer-1",
        updatedAt: now,
      })),
    } satisfies CustomerRepository,
    orderRepository: {
      confirmCustomerDelivery: vi.fn(),
      create: vi.fn(),
      findById: vi.fn(async (orderId: string) =>
        order.id === orderId ? order : null,
      ),
      findByPublicToken: vi.fn(async () => order),
      updateStatus: vi.fn(),
    } satisfies OrderRepository,
    paymentRepository: {
      findByOrderId: vi.fn(),
      findByProviderInvoiceId: vi.fn(),
      save: vi.fn(async (payment) => ({
        ...payment,
        createdAt: now,
        id: "payment-1",
        updatedAt: now,
      })),
      updateProviderInvoice: vi.fn(),
      updateStatus: vi.fn(),
    } satisfies PaymentRepository,
    shipmentRepository: {
      findByOrderId: vi.fn(),
      save: vi.fn(async (shipment) => ({
        ...shipment,
        createdAt: now,
        id: "shipment-1",
        updatedAt: now,
      })),
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
