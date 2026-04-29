import { render, screen } from "@testing-library/react";
import { OwnerOrderDetailsView } from "@/modules/orders/ui/owner-order-details-view";
import type { OwnerOrderDetails } from "@/modules/orders/application/owner-order-read-model";

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    refresh: vi.fn(),
  }),
}));

vi.mock("@/modules/orders/ui/owner-order-actions", () => ({
  assignOrderTagAction: vi.fn(),
  createAndAssignOrderTagAction: vi.fn(),
  removeOrderTagAction: vi.fn(),
  updateOwnerOrderStatusAction: vi.fn(),
}));

vi.mock("@/modules/shipping/ui/shipment-actions", () => ({
  retryShipmentCreationAction: vi.fn(),
}));

describe("OwnerOrderDetailsView", () => {
  it("renders order details, tags, status history, and audit labels in Ukrainian", () => {
    render(
      <OwnerOrderDetailsView
        availableTags={[
          {
            color: null,
            createdAt: new Date("2026-04-30T10:00:00.000Z"),
            id: "tag-2",
            name: "Терміново",
            ownerId: "owner-1",
            updatedAt: new Date("2026-04-30T10:00:00.000Z"),
          },
        ]}
        order={createOrderDetails()}
      />,
    );

    expect(screen.getByRole("heading", { name: /Замовлення #order-1/i })).toBeVisible();
    expect(screen.getByText("Поточний статус: Готується відправлення")).toBeVisible();
    expect(screen.getByRole("heading", { name: "Товари" })).toBeVisible();
    expect(screen.getByText("Каблучка")).toBeVisible();
    expect(screen.getByRole("heading", { name: "Клієнт" })).toBeVisible();
    expect(screen.getByText("Олена Петренко")).toBeVisible();
    expect(screen.getByRole("heading", { name: "Доставка" })).toBeVisible();
    expect(screen.getAllByText("Нова Пошта")[0]).toBeVisible();
    expect(screen.getByRole("heading", { name: "Оплата" })).toBeVisible();
    expect(screen.getByText("Післяплата")).toBeVisible();
    expect(screen.getByRole("heading", { name: "Теги замовлення" })).toBeVisible();
    expect(screen.getByLabelText("Зняти тег Подарунок")).toBeVisible();
    expect(screen.getByRole("heading", { name: "Ручна зміна статусу" })).toBeVisible();
    expect(
      screen.getByRole("button", { name: "Повторити створення відправлення" }),
    ).toBeVisible();
    expect(screen.getByRole("heading", { name: "Історія статусів" })).toBeVisible();
    expect(screen.getAllByText("Статус змінено вручну")[0]).toBeVisible();
    expect(screen.getByRole("heading", { name: "Аудит подій" })).toBeVisible();
  });
});

function createOrderDetails(): OwnerOrderDetails {
  const now = new Date("2026-04-30T10:00:00.000Z");

  return {
    auditEvents: [
      {
        actorCustomerId: null,
        actorType: "OWNER",
        actorUserId: "owner-1",
        createdAt: now,
        eventType: "ORDER_STATUS_UPDATED",
        id: "event-1",
        orderId: "order-1",
        payload: {
          message: "Статус замовлення змінено вручну",
          status: "SHIPMENT_PENDING",
        },
      },
    ],
    confirmedAt: now,
    createdAt: now,
    currency: "UAH",
    customer: {
      createdAt: now,
      email: null,
      fullName: "Олена Петренко",
      id: "customer-1",
      phone: "+380671234567",
      updatedAt: now,
    },
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
    payments: [
      {
        amountMinor: 2_400_00,
        createdAt: now,
        currency: "UAH",
        failureReason: null,
        id: "payment-1",
        orderId: "order-1",
        paidAt: null,
        provider: "CASH_ON_DELIVERY",
        providerInvoiceId: null,
        providerModifiedAt: null,
        status: "PENDING",
        updatedAt: now,
      },
    ],
    publicToken: "secure-public-token",
    publicTokenExpiresAt: new Date("2026-05-14T10:00:00.000Z"),
    sentAt: now,
    shipments: [
      {
        addressText: "Київ, Відділення №1",
        carrier: "NOVA_POSHTA",
        carrierOfficeId: "warehouse-1",
        carrierPayload: null,
        carrierShipmentId: "carrier-1",
        cityName: "Київ",
        cityRef: "city-1",
        createdAt: now,
        deliveredAt: null,
        id: "shipment-1",
        labelUrl: null,
        orderId: "order-1",
        recipientCustomerId: "customer-1",
        status: "FAILED",
        trackingNumber: "TTN-001",
        updatedAt: now,
      },
    ],
    status: "SHIPMENT_PENDING",
    statusHistory: [
      {
        actorType: "OWNER",
        createdAt: now,
        eventType: "ORDER_STATUS_UPDATED",
        id: "history-1",
        status: "SHIPMENT_PENDING",
      },
    ],
    tags: [
      {
        color: null,
        createdAt: now,
        id: "tag-1",
        name: "Подарунок",
        ownerId: "owner-1",
        updatedAt: now,
      },
    ],
    totalMinor: 2_400_00,
    updatedAt: now,
  };
}
