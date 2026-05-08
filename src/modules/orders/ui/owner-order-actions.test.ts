import { revalidatePath } from "next/cache";
import type { PersistedOrder } from "@/modules/orders/application/order-repository";
import { getAuditEventRepository } from "@/modules/orders/infrastructure/audit-event-repository-factory";
import { getOrderRepository } from "@/modules/orders/infrastructure/order-repository-factory";
import { getOrderTagRepository } from "@/modules/orders/infrastructure/order-tag-repository-factory";
import {
  createAndAssignOrderTagAction,
  markManualCardPaymentPaidAction,
  updateOwnerOrderStatusAction,
} from "@/modules/orders/ui/owner-order-actions";
import type { PaymentRecord } from "@/modules/payments/application/payment-repository";
import { getPaymentRepository } from "@/modules/payments/infrastructure/payment-repository-factory";
import { getShipmentJobQueue } from "@/modules/shipping/infrastructure/shipment-job-queue-factory";
import { getShipmentRepository } from "@/modules/shipping/infrastructure/shipment-repository-factory";
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

vi.mock("@/modules/orders/infrastructure/order-tag-repository-factory", () => ({
  getOrderTagRepository: vi.fn(),
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

describe("owner order actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    let currentOrder: PersistedOrder = {
      confirmedAt: null,
      createdAt: new Date("2026-04-30T10:00:00.000Z"),
      currency: "UAH",
      customerId: null,
      id: "order-1",
      items: [],
      ownerId: "owner-1",
      publicToken: "secure-public-token",
      publicTokenExpiresAt: new Date("2026-05-14T10:00:00.000Z"),
      sentAt: new Date("2026-04-30T10:00:00.000Z"),
      status: "SENT_TO_CUSTOMER" as const,
      totalMinor: 2_400_00,
      updatedAt: new Date("2026-04-30T10:00:00.000Z"),
    };
    let currentPayment: PaymentRecord = {
      amountMinor: 2_400_00,
      createdAt: new Date("2026-04-30T10:00:00.000Z"),
      currency: "UAH",
      failureReason: null,
      id: "payment-1",
      orderId: "order-1",
      paidAt: null,
      provider: "MANUAL_CARD_TRANSFER" as const,
      providerInvoiceId: null,
      providerModifiedAt: null,
      status: "PENDING" as const,
      updatedAt: new Date("2026-04-30T10:00:00.000Z"),
    };
    vi.mocked(requireOwnerSession).mockResolvedValue({
      email: "owner@example.com",
      id: "owner-1",
      name: "Власниця",
      role: "owner",
    });
    vi.mocked(getAuditEventRepository).mockReturnValue({
      append: vi.fn(async (event) => ({
        ...event,
        createdAt: new Date("2026-04-30T10:00:00.000Z"),
        id: "event-1",
      })),
      listForOrder: vi.fn(),
    } as never);
    vi.mocked(getOrderRepository).mockReturnValue({
      confirmCustomerDelivery: vi.fn(),
      create: vi.fn(),
      findById: vi.fn(async () => currentOrder),
      findByPublicToken: vi.fn(),
      listByOwnerId: vi.fn(),
      updateStatus: vi.fn(async (_orderId, status) => {
        currentOrder = {
          ...currentOrder,
          status,
        };
      }),
    } as never);
    vi.mocked(getPaymentRepository).mockReturnValue({
      findByOrderId: vi.fn(async () => [currentPayment]),
      findByProviderInvoiceId: vi.fn(),
      save: vi.fn(),
      updateProviderInvoice: vi.fn(),
      updateStatus: vi.fn(async (input) => {
        currentPayment = {
          ...currentPayment,
          failureReason: input.failureReason,
          paidAt: input.paidAt,
          providerModifiedAt: input.providerModifiedAt,
          status: input.status,
        };

        return currentPayment;
      }),
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
          carrierPayload: null,
          carrierShipmentId: null,
          cityName: "Київ",
          cityRef: "city-1",
          createdAt: new Date("2026-04-30T10:00:00.000Z"),
          deliveredAt: null,
          id: "shipment-1",
          labelUrl: null,
          orderId: "order-1",
          recipientCustomerId: "customer-1",
          status: "PENDING",
          trackingNumber: null,
          updatedAt: new Date("2026-04-30T10:00:00.000Z"),
        },
      ]),
      save: vi.fn(),
      updateCreation: vi.fn(),
      updateStatus: vi.fn(),
    } as never);
    vi.mocked(getOrderTagRepository).mockReturnValue({
      findByIdForOwner: vi.fn(),
      findByNameForOwner: vi.fn(async () => null),
      linkToOrder: vi.fn(),
      listForOrder: vi.fn(),
      listForOwner: vi.fn(),
      save: vi.fn(async (tag) => ({
        ...tag,
        createdAt: new Date("2026-04-30T10:00:00.000Z"),
        id: "tag-1",
        updatedAt: new Date("2026-04-30T10:00:00.000Z"),
      })),
      unlinkFromOrder: vi.fn(),
    } as never);
  });

  it("returns Ukrainian success and revalidates order pages after tag creation", async () => {
    const formData = new FormData();
    formData.set("tagName", "Подарунок");

    await expect(
      createAndAssignOrderTagAction("order-1", formData),
    ).resolves.toEqual({
      message: "Тег додано до замовлення",
      ok: true,
    });
    expect(revalidatePath).toHaveBeenCalledWith("/dashboard/orders");
    expect(revalidatePath).toHaveBeenCalledWith("/dashboard/orders/order-1");
  });

  it("returns Ukrainian validation feedback for invalid tag names", async () => {
    const formData = new FormData();
    formData.set("tagName", "x");

    await expect(
      createAndAssignOrderTagAction("order-1", formData),
    ).resolves.toEqual({
      message: "Назва тегу має містити від 2 до 40 символів",
      ok: false,
    });
  });

  it("returns Ukrainian feedback for forbidden status transitions", async () => {
    const formData = new FormData();
    formData.set("status", "PAID");

    await expect(updateOwnerOrderStatusAction("order-1", formData)).resolves.toEqual({
      message: "Такий перехід статусу недоступний",
      ok: false,
    });
  });

  it("marks manual card transfer as paid and revalidates order pages", async () => {
    const orderRepository = getOrderRepository();
    vi.mocked(orderRepository.findById).mockResolvedValueOnce({
      confirmedAt: new Date("2026-04-30T10:00:00.000Z"),
      createdAt: new Date("2026-04-30T10:00:00.000Z"),
      currency: "UAH",
      customerId: "customer-1",
      id: "order-1",
      items: [],
      ownerId: "owner-1",
      publicToken: "secure-public-token",
      publicTokenExpiresAt: new Date("2026-05-14T10:00:00.000Z"),
      sentAt: new Date("2026-04-30T10:00:00.000Z"),
      status: "PAYMENT_PENDING",
      totalMinor: 2_400_00,
      updatedAt: new Date("2026-04-30T10:00:00.000Z"),
    } as never);

    await expect(markManualCardPaymentPaidAction("order-1")).resolves.toEqual({
      message: "Оплату позначено отриманою",
      ok: true,
    });
    expect(getPaymentRepository().updateStatus).toHaveBeenCalledWith(
      expect.objectContaining({
        paymentId: "payment-1",
        status: "PAID",
      }),
    );
    expect(getShipmentJobQueue().enqueueCreateShipment).toHaveBeenCalledWith(
      expect.objectContaining({
        orderId: "order-1",
        requestedBy: "owner",
      }),
    );
    expect(revalidatePath).toHaveBeenCalledWith("/dashboard/orders");
    expect(revalidatePath).toHaveBeenCalledWith("/dashboard/orders/order-1");
  });
});
