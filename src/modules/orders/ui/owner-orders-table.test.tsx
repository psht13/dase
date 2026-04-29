import { render, screen } from "@testing-library/react";
import { OwnerOrdersFilterForm } from "@/modules/orders/ui/owner-orders-filter-form";
import { OwnerOrdersTable } from "@/modules/orders/ui/owner-orders-table";
import type { OwnerOrderSummary } from "@/modules/orders/application/owner-order-read-model";

describe("owner orders UI", () => {
  it("renders Ukrainian filters and table headings", () => {
    render(
      <>
        <OwnerOrdersFilterForm
          filters={{
            deliveryCarrier: "NOVA_POSHTA",
            paymentMethod: "CASH_ON_DELIVERY",
            search: "067",
            status: "SHIPMENT_PENDING",
            tagId: "tag-1",
          }}
          tagOptions={[
            {
              color: null,
              createdAt: new Date("2026-04-30T10:00:00.000Z"),
              id: "tag-1",
              name: "Подарунок",
              ownerId: "owner-1",
              updatedAt: new Date("2026-04-30T10:00:00.000Z"),
            },
          ]}
        />
        <OwnerOrdersTable orders={[createOrderSummary()]} />
      </>,
    );

    expect(screen.getByLabelText("Статус")).toBeVisible();
    expect(screen.getByLabelText("Служба доставки")).toBeVisible();
    expect(screen.getByLabelText("Спосіб оплати")).toBeVisible();
    expect(screen.getByLabelText("Тег")).toBeVisible();
    expect(screen.getByPlaceholderText("Телефон або ТТН")).toBeVisible();
    expect(screen.getByRole("button", { name: "Застосувати фільтри" })).toBeVisible();
    expect(screen.getByRole("columnheader", { name: "Клієнт" })).toBeVisible();
    expect(screen.getByText("Олена Петренко")).toBeVisible();
    expect(screen.getAllByText("Готується відправлення")[1]).toBeVisible();
    expect(screen.getAllByText("Подарунок")[1]).toBeVisible();
  });

  it("renders a Ukrainian empty state", () => {
    render(<OwnerOrdersTable orders={[]} />);

    expect(screen.getByText("Замовлення не знайдено")).toBeVisible();
    expect(screen.getByText(/Змініть фільтри/i)).toBeVisible();
  });
});

function createOrderSummary(): OwnerOrderSummary {
  const now = new Date("2026-04-30T10:00:00.000Z");

  return {
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
        status: "PENDING",
        trackingNumber: "TTN-001",
        updatedAt: now,
      },
    ],
    status: "SHIPMENT_PENDING",
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
