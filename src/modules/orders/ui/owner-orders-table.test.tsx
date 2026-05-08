import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { OwnerOrdersFilterForm } from "@/modules/orders/ui/owner-orders-filter-form";
import { OwnerOrdersTable } from "@/modules/orders/ui/owner-orders-table";
import type { OwnerOrderSummary } from "@/modules/orders/application/owner-order-read-model";
import {
  activeShippingCarriers,
  getShippingCarrierOptionsForRecords,
} from "@/modules/shipping/application/shipping-carrier-registry";

describe("owner orders UI", () => {
  it("renders a collapsed filter panel with active summary and clear action", async () => {
    const user = userEvent.setup();

    render(
      <OwnerOrdersFilterForm
        deliveryCarrierOptions={activeShippingCarriers}
        filters={{
          dateFrom: new Date("2026-05-01T00:00:00.000Z"),
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
      />,
    );

    const toggle = screen.getByRole("button", {
      name: /Показати фільтри/i,
    });

    expect(toggle).toHaveAttribute("aria-expanded", "false");
    expect(screen.getByText("Статус: Готується відправлення")).toBeVisible();
    expect(screen.getByText("Доставка: Нова пошта")).toBeVisible();
    expect(screen.getByText("Оплата: Післяплата")).toBeVisible();
    expect(screen.getByText("Тег: Подарунок")).toBeVisible();
    expect(screen.getByText("Від: 2026-05-01")).toBeVisible();
    expect(screen.getByText("Пошук: 067")).toBeVisible();
    expect(
      screen.getByRole("link", { name: "Скинути фільтри" }),
    ).toHaveAttribute("href", "/dashboard/orders");

    await user.click(toggle);

    expect(toggle).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByLabelText("Статус")).toBeVisible();
    expect(screen.getByLabelText("Служба доставки")).toBeVisible();
    expect(
      screen.queryByRole("option", { name: "Укрпошта (вимкнено)" }),
    ).toBeNull();
    expect(screen.getByLabelText("Спосіб оплати")).toBeVisible();
    expect(screen.getByLabelText("Тег")).toBeVisible();
    expect(
      screen.getByPlaceholderText("Телефон, Instagram або ТТН"),
    ).toBeVisible();
    expect(
      screen.getByRole("button", { name: "Застосувати фільтри" }),
    ).toBeVisible();
  });

  it("renders compact desktop table hierarchy", () => {
    render(
      <OwnerOrdersTable hasActiveFilters orders={[createOrderSummary()]} />,
    );

    const table = within(screen.getByTestId("owner-orders-desktop-table"));

    expect(table.getByRole("columnheader", { name: "Замовлення" })).toBeVisible();
    expect(table.getByRole("columnheader", { name: "Клієнт" })).toBeVisible();
    expect(table.getByRole("columnheader", { name: "Статус" })).toBeVisible();
    expect(
      table.getByRole("columnheader", { name: "Сума і теги" }),
    ).toBeVisible();
    expect(table.getByRole("columnheader", { name: "Дії" })).toBeVisible();
    expect(
      table.queryByRole("columnheader", { name: "Телефон" }),
    ).not.toBeInTheDocument();
    expect(
      table.queryByRole("columnheader", { name: "Доставка" }),
    ).not.toBeInTheDocument();
    expect(table.getByText("Олена Петренко")).toBeVisible();
    expect(table.getByText("+380671234567")).toBeVisible();
    expect(table.getByText("@olena.shop")).toBeVisible();
    expect(table.getByText("Готується відправлення")).toBeVisible();
    expect(table.getByText("Нова пошта · Післяплата")).toBeVisible();
    expect(table.getByText("Подарунок")).toBeVisible();
  });

  it("renders mobile order cards with customer, status, amount, tags, and action", () => {
    render(<OwnerOrdersTable orders={[createOrderSummary()]} />);

    const card = within(screen.getByTestId("owner-orders-mobile-card"));

    expect(card.getByRole("heading", { name: /Замовлення #order-1/i })).toBeVisible();
    expect(card.getByText("Олена Петренко")).toBeVisible();
    expect(card.getByText("+380671234567")).toBeVisible();
    expect(card.getByText("@olena.shop")).toBeVisible();
    expect(card.getByText("Готується відправлення")).toBeVisible();
    expect(card.getByText(/2\s?400,00/)).toBeVisible();
    expect(card.getByText("Нова пошта")).toBeVisible();
    expect(card.getByText("Оплата: Післяплата")).toBeVisible();
    expect(card.getByText("Подарунок")).toBeVisible();
    expect(card.getByRole("link", { name: "Відкрити" })).toBeVisible();
  });

  it("renders a Ukrainian empty state when there are no orders yet", () => {
    render(<OwnerOrdersTable orders={[]} />);

    expect(screen.getByText("Замовлень ще немає")).toBeVisible();
    expect(screen.getByText(/Створіть посилання замовлення/i)).toBeVisible();
    expect(
      screen.getByRole("link", { name: "Створити замовлення" }),
    ).toBeVisible();
  });

  it("renders a Ukrainian empty state for filtered results", () => {
    render(<OwnerOrdersTable hasActiveFilters orders={[]} />);

    expect(screen.getByText("За фільтрами нічого не знайдено")).toBeVisible();
    expect(screen.getByText(/Змініть або скиньте фільтри/i)).toBeVisible();
    expect(
      screen.getByRole("link", { name: "Скинути фільтри" }),
    ).toHaveAttribute("href", "/dashboard/orders");
  });

  it("shows disabled legacy carrier filters only when historical records exist", async () => {
    const user = userEvent.setup();
    const legacyOptions = getShippingCarrierOptionsForRecords(["UKRPOSHTA"]);

    render(
      <OwnerOrdersFilterForm
        deliveryCarrierOptions={legacyOptions}
        filters={{
          deliveryCarrier: "UKRPOSHTA",
        }}
        tagOptions={[]}
      />,
    );

    await user.click(screen.getByRole("button", { name: /Показати фільтри/i }));

    expect(
      screen.getByRole("option", { name: "Укрпошта (вимкнено)" }),
    ).toBeVisible();
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
      instagramUsername: "olena.shop",
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
