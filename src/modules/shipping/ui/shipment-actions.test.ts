import { revalidatePath } from "next/cache";
import type { PersistedOrder } from "@/modules/orders/application/order-repository";
import { getAuditEventRepository } from "@/modules/orders/infrastructure/audit-event-repository-factory";
import { getOrderRepository } from "@/modules/orders/infrastructure/order-repository-factory";
import { getPaymentRepository } from "@/modules/payments/infrastructure/payment-repository-factory";
import { getShipmentJobQueue } from "@/modules/shipping/infrastructure/shipment-job-queue-factory";
import { getShipmentRepository } from "@/modules/shipping/infrastructure/shipment-repository-factory";
import { retryShipmentCreationAction } from "@/modules/shipping/ui/shipment-actions";
import { requireOwnerSession } from "@/modules/users/ui/require-owner-session";

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

vi.mock("@/modules/users/ui/require-owner-session", () => ({
  requireOwnerSession: vi.fn(),
}));

vi.mock("@/modules/orders/infrastructure/audit-event-repository-factory", () => ({
  getAuditEventRepository: vi.fn(),
}));

vi.mock("@/modules/orders/infrastructure/order-repository-factory", () => ({
  getOrderRepository: vi.fn(),
}));

vi.mock("@/modules/payments/infrastructure/payment-repository-factory", () => ({
  getPaymentRepository: vi.fn(),
}));

vi.mock("@/modules/shipping/infrastructure/shipment-job-queue-factory", () => ({
  getShipmentJobQueue: vi.fn(),
}));

vi.mock("@/modules/shipping/infrastructure/shipment-repository-factory", () => ({
  getShipmentRepository: vi.fn(),
}));

const now = new Date("2026-04-30T10:00:00.000Z");

describe("retryShipmentCreationAction", () => {
  beforeEach(() => {
    vi.mocked(requireOwnerSession).mockResolvedValue({
      email: "owner@example.com",
      id: "owner-1",
      name: "Власниця",
      role: "owner",
    });
    vi.mocked(getAuditEventRepository).mockReturnValue({
      append: vi.fn(async (event) => ({
        ...event,
        createdAt: now,
        id: "event-1",
      })),
      listForOrder: vi.fn(),
    } as never);
    vi.mocked(getOrderRepository).mockReturnValue({
      confirmCustomerDelivery: vi.fn(),
      create: vi.fn(),
      findById: vi.fn(async () => createOrder()),
      findByPublicToken: vi.fn(),
      updateStatus: vi.fn(),
    } as never);
    vi.mocked(getPaymentRepository).mockReturnValue({
      findByOrderId: vi.fn(async () => [
        {
          amountMinor: 2_400_00,
          createdAt: now,
          currency: "UAH",
          failureReason: null,
          id: "payment-1",
          orderId: "order-1",
          paidAt: now,
          provider: "MONOBANK",
          providerInvoiceId: "invoice-1",
          providerModifiedAt: now,
          status: "PAID",
          updatedAt: now,
        },
      ]),
      findByProviderInvoiceId: vi.fn(),
      save: vi.fn(),
      updateProviderInvoice: vi.fn(),
      updateStatus: vi.fn(),
    } as never);
    vi.mocked(getShipmentJobQueue).mockReturnValue({
      enqueueAutoCompleteDeliveredOrder: vi.fn(),
      enqueueCreateShipment: vi.fn(async () => "job-1"),
      enqueueSyncShipmentStatus: vi.fn(),
    } as never);
    vi.mocked(getShipmentRepository).mockReturnValue({
      findByOrderId: vi.fn(async () => [
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
          id: "shipment-1",
          labelUrl: null,
          orderId: "order-1",
          recipientCustomerId: "customer-1",
          status: "FAILED",
          trackingNumber: null,
          updatedAt: now,
        },
      ]),
      save: vi.fn(),
      updateCreation: vi.fn(),
      updateStatus: vi.fn(),
    } as never);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("returns Ukrainian success feedback and queues a retry", async () => {
    await expect(retryShipmentCreationAction("order-1")).resolves.toEqual({
      message: "Повторне створення відправлення заплановано",
      ok: true,
    });
    expect(getShipmentJobQueue().enqueueCreateShipment).toHaveBeenCalledWith(
      expect.objectContaining({
        orderId: "order-1",
        requestedBy: "owner",
        shipmentId: "shipment-1",
      }),
    );
    expect(revalidatePath).toHaveBeenCalledWith("/dashboard");
  });

  it("returns Ukrainian unavailable feedback", async () => {
    vi.mocked(getShipmentRepository).mockReturnValue({
      findByOrderId: vi.fn(async () => []),
      save: vi.fn(),
      updateCreation: vi.fn(),
      updateStatus: vi.fn(),
    } as never);

    await expect(retryShipmentCreationAction("order-1")).resolves.toEqual({
      message: "Повторну спробу створення відправлення недоступно",
      ok: false,
    });
  });
});

function createOrder(input: Partial<PersistedOrder> = {}): PersistedOrder {
  return {
    confirmedAt: now,
    createdAt: now,
    currency: "UAH",
    customerId: "customer-1",
    id: "order-1",
    items: [],
    ownerId: "owner-1",
    publicToken: "secure_public_token_123456789012345",
    publicTokenExpiresAt: new Date("2026-05-14T10:00:00.000Z"),
    sentAt: now,
    status: "SHIPMENT_PENDING",
    totalMinor: 2_400_00,
    updatedAt: now,
    ...input,
  };
}
