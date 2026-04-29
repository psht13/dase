import { render, screen } from "@testing-library/react";
import { getAuditEventRepository } from "@/modules/orders/infrastructure/audit-event-repository-factory";
import { getCustomerRepository } from "@/modules/orders/infrastructure/customer-repository-factory";
import { getOrderRepository } from "@/modules/orders/infrastructure/order-repository-factory";
import { getOrderTagRepository } from "@/modules/orders/infrastructure/order-tag-repository-factory";
import { getPaymentRepository } from "@/modules/payments/infrastructure/payment-repository-factory";
import { getShipmentRepository } from "@/modules/shipping/infrastructure/shipment-repository-factory";
import { requireOwnerSession } from "@/modules/users/ui/require-owner-session";
import OrderDetailsPage from "./page";

vi.mock("next/navigation", () => ({
  notFound: vi.fn(() => {
    throw new Error("not found");
  }),
  useRouter: () => ({
    refresh: vi.fn(),
  }),
}));

vi.mock("@/modules/users/ui/require-owner-session", () => ({
  requireOwnerSession: vi.fn(),
}));

vi.mock("@/modules/orders/infrastructure/audit-event-repository-factory", () => ({
  getAuditEventRepository: vi.fn(),
}));

vi.mock("@/modules/orders/infrastructure/customer-repository-factory", () => ({
  getCustomerRepository: vi.fn(),
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

vi.mock("@/modules/shipping/infrastructure/shipment-repository-factory", () => ({
  getShipmentRepository: vi.fn(),
}));

vi.mock("@/modules/shipping/ui/shipment-actions", () => ({
  retryShipmentCreationAction: vi.fn(),
}));

describe("OrderDetailsPage", () => {
  it("renders the owner order details page", async () => {
    const now = new Date("2026-04-30T10:00:00.000Z");
    vi.mocked(requireOwnerSession).mockResolvedValue({
      email: "owner@example.com",
      id: "owner-1",
      name: "Власниця",
      role: "owner",
    });
    vi.mocked(getOrderRepository).mockReturnValue({
      confirmCustomerDelivery: vi.fn(),
      create: vi.fn(),
      findById: vi.fn(async () => ({
        confirmedAt: now,
        createdAt: now,
        currency: "UAH",
        customerId: "customer-1",
        id: "order-1",
        items: [
          {
            createdAt: now,
            id: "item-1",
            lineTotalMinor: 1_200_00,
            orderId: "order-1",
            productId: "product-1",
            productImageUrlsSnapshot: [],
            productNameSnapshot: "Каблучка",
            productSkuSnapshot: "RING-1",
            quantity: 1,
            unitPriceMinor: 1_200_00,
          },
        ],
        ownerId: "owner-1",
        publicToken: "secure-public-token",
        publicTokenExpiresAt: new Date("2026-05-14T10:00:00.000Z"),
        sentAt: now,
        status: "SENT_TO_CUSTOMER",
        totalMinor: 1_200_00,
        updatedAt: now,
      })),
      findByPublicToken: vi.fn(),
      listByOwnerId: vi.fn(),
      updateStatus: vi.fn(),
    } as never);
    vi.mocked(getCustomerRepository).mockReturnValue({
      findById: vi.fn(async () => ({
        createdAt: now,
        email: null,
        fullName: "Олена Петренко",
        id: "customer-1",
        phone: "+380671234567",
        updatedAt: now,
      })),
      save: vi.fn(),
    } as never);
    vi.mocked(getOrderTagRepository).mockReturnValue({
      findByIdForOwner: vi.fn(),
      findByNameForOwner: vi.fn(),
      linkToOrder: vi.fn(),
      listForOrder: vi.fn(async () => []),
      listForOwner: vi.fn(async () => []),
      save: vi.fn(),
      unlinkFromOrder: vi.fn(),
    } as never);
    vi.mocked(getPaymentRepository).mockReturnValue({
      findByOrderId: vi.fn(async () => []),
      findByProviderInvoiceId: vi.fn(),
      save: vi.fn(),
      updateProviderInvoice: vi.fn(),
      updateStatus: vi.fn(),
    } as never);
    vi.mocked(getShipmentRepository).mockReturnValue({
      findByOrderId: vi.fn(async () => []),
      save: vi.fn(),
      updateCreation: vi.fn(),
      updateStatus: vi.fn(),
    } as never);
    vi.mocked(getAuditEventRepository).mockReturnValue({
      append: vi.fn(),
      listForOrder: vi.fn(async () => []),
    } as never);

    render(
      await OrderDetailsPage({
        params: Promise.resolve({ orderId: "order-1" }),
      }),
    );

    expect(screen.getByRole("heading", { name: /Замовлення #order-1/i })).toBeVisible();
    expect(screen.getByText("Каблучка")).toBeVisible();
    expect(screen.getByText("Олена Петренко")).toBeVisible();
  });
});
