import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { OwnerOrderDetails } from "@/modules/orders/application/owner-order-read-model";
import {
  createAndAssignOrderTagAction,
  updateOwnerOrderStatusAction,
} from "@/modules/orders/ui/owner-order-actions";
import { OwnerOrderDetailsView } from "@/modules/orders/ui/owner-order-details-view";
import { retryOwnerMonobankPaymentAction } from "@/modules/payments/ui/payment-actions";
import { retryShipmentCreationAction } from "@/modules/shipping/ui/shipment-actions";

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

vi.mock("@/modules/payments/ui/payment-actions", () => ({
  retryOwnerMonobankPaymentAction: vi.fn(),
}));

describe("OwnerOrderDetailsView", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("renders the requested Ukrainian sections", () => {
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
    expect(screen.getByRole("heading", { name: "Огляд" })).toBeVisible();
    expect(screen.getByRole("heading", { name: "Товари" })).toBeVisible();
    expect(screen.getByText("Каблучка")).toBeVisible();
    expect(screen.getByRole("heading", { name: "Клієнт" })).toBeVisible();
    expect(screen.getByText("Олена Петренко")).toBeVisible();
    expect(screen.getByText("Instagram нікнейм")).toBeVisible();
    expect(screen.getByText("@olena.shop")).toBeVisible();
    expect(screen.getByRole("heading", { name: "Доставка" })).toBeVisible();
    expect(screen.getAllByText("Нова пошта")[0]).toBeVisible();
    expect(screen.getByRole("heading", { name: "Оплата" })).toBeVisible();
    expect(screen.getByText("Післяплата")).toBeVisible();
    expect(screen.getByRole("heading", { name: "Повтор оплати MonoPay" })).toBeVisible();
    expect(screen.getByText("Повтор оплати зараз недоступний.")).toBeVisible();
    expect(screen.getByRole("heading", { name: "Теги" })).toBeVisible();
    expect(screen.getByRole("heading", { name: "Теги замовлення" })).toBeVisible();
    expect(screen.getByLabelText("Зняти тег Подарунок")).toBeVisible();
    expect(screen.getByRole("heading", { name: "Ручна зміна статусу" })).toBeVisible();
    expect(
      screen.getByRole("button", { name: "Повторити створення відправлення" }),
    ).toBeVisible();
    expect(screen.getByRole("heading", { name: "Історія статусів" })).toBeVisible();
    expect(screen.getAllByText("Статус змінено вручну")[0]).toBeVisible();
    expect(screen.getByRole("heading", { name: "Аудит" })).toBeVisible();
    expect(screen.getByRole("heading", { name: "Аудит подій" })).toBeVisible();
  });

  it("renders collapsible stacked sections without dense tables", () => {
    render(
      <OwnerOrderDetailsView availableTags={[]} order={createOrderDetails()} />,
    );

    const sections = screen.getAllByTestId("owner-order-detail-section");

    expect(sections).toHaveLength(8);
    for (const section of sections) {
      expect(section.tagName).toBe("DETAILS");
      expect(section).toHaveAttribute("open");
    }
    expect(screen.getByTestId("owner-order-products-list")).toBeVisible();
    expect(screen.getByTestId("owner-order-audit-list")).toBeVisible();
    expect(screen.queryByRole("table")).not.toBeInTheDocument();
  });

  it("keeps audit events visible in the compact audit section", () => {
    render(
      <OwnerOrderDetailsView availableTags={[]} order={createOrderDetails()} />,
    );

    const auditList = screen.getByTestId("owner-order-audit-list");

    expect(
      within(auditList).getByText("Статус змінено вручну"),
    ).toBeVisible();
    expect(
      within(auditList).getByText(/Статус замовлення змінено вручну/),
    ).toBeVisible();
  });

  it("keeps the MonoPay retry action available for failed payments", () => {
    render(
      <OwnerOrderDetailsView
        availableTags={[]}
        order={createOrderDetails({
          payments: [
            {
              amountMinor: 2_400_00,
              createdAt: new Date("2026-04-30T10:00:00.000Z"),
              currency: "UAH",
              failureReason: "Оплату відхилено",
              id: "payment-2",
              orderId: "order-1",
              paidAt: null,
              provider: "MONOBANK",
              providerInvoiceId: "invoice-old",
              providerModifiedAt: null,
              status: "FAILED",
              updatedAt: new Date("2026-04-30T10:00:00.000Z"),
            },
          ],
          status: "PAYMENT_FAILED",
        })}
      />,
    );

    expect(
      screen.getByRole("button", { name: "Повторити оплату" }),
    ).toBeVisible();
  });

  it("keeps the shipment retry action available for failed active-carrier shipments", () => {
    render(
      <OwnerOrderDetailsView availableTags={[]} order={createOrderDetails()} />,
    );

    expect(
      screen.getByRole("button", { name: "Повторити створення відправлення" }),
    ).toBeEnabled();
  });

  it("submits the manual status update action", async () => {
    const user = userEvent.setup();
    vi.mocked(updateOwnerOrderStatusAction).mockResolvedValue({
      message: "Статус замовлення оновлено",
      ok: true,
    });

    render(
      <OwnerOrderDetailsView availableTags={[]} order={createOrderDetails()} />,
    );

    await user.selectOptions(screen.getByLabelText("Новий статус"), "CANCELLED");
    await user.click(screen.getByRole("button", { name: "Оновити статус" }));

    await waitFor(() => {
      expect(updateOwnerOrderStatusAction).toHaveBeenCalledWith(
        "order-1",
        expect.any(FormData),
      );
    });
    await waitFor(() => {
      expect(screen.getByText("Статус замовлення оновлено")).toBeVisible();
    });
  });

  it("shows failed manual status update feedback", async () => {
    const user = userEvent.setup();
    vi.mocked(updateOwnerOrderStatusAction).mockResolvedValue({
      message: "Такий перехід статусу недоступний",
      ok: false,
    });

    render(
      <OwnerOrderDetailsView availableTags={[]} order={createOrderDetails()} />,
    );

    await user.selectOptions(screen.getByLabelText("Новий статус"), "CANCELLED");
    await user.click(screen.getByRole("button", { name: "Оновити статус" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Такий перехід статусу недоступний",
    );
  });

  it("shows successful tag update feedback", async () => {
    const user = userEvent.setup();
    vi.mocked(createAndAssignOrderTagAction).mockResolvedValue({
      message: "Тег додано до замовлення",
      ok: true,
    });

    render(
      <OwnerOrderDetailsView availableTags={[]} order={createOrderDetails()} />,
    );

    await user.type(screen.getByLabelText("Новий тег"), "VIP");
    await user.click(screen.getAllByRole("button", { name: "Додати" })[0]);

    await waitFor(() => {
      expect(screen.getByText("Тег додано до замовлення")).toBeVisible();
    });
  });

  it("shows failed tag update feedback", async () => {
    const user = userEvent.setup();
    vi.mocked(createAndAssignOrderTagAction).mockResolvedValue({
      message: "Назва тегу має містити від 2 до 40 символів",
      ok: false,
    });

    render(
      <OwnerOrderDetailsView availableTags={[]} order={createOrderDetails()} />,
    );

    await user.type(screen.getByLabelText("Новий тег"), "A");
    await user.click(screen.getAllByRole("button", { name: "Додати" })[0]);

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Назва тегу має містити від 2 до 40 символів",
    );
  });

  it("shows shipment retry feedback", async () => {
    const user = userEvent.setup();
    vi.mocked(retryShipmentCreationAction).mockResolvedValue({
      message: "Повторне створення відправлення заплановано",
      ok: true,
    });

    render(
      <OwnerOrderDetailsView availableTags={[]} order={createOrderDetails()} />,
    );

    await user.click(
      screen.getByRole("button", { name: "Повторити створення відправлення" }),
    );

    await waitFor(() => {
      expect(
        screen.getByText("Повторне створення відправлення заплановано"),
      ).toBeVisible();
    });
  });

  it("shows failed payment retry feedback", async () => {
    const user = userEvent.setup();
    vi.mocked(retryOwnerMonobankPaymentAction).mockResolvedValue({
      message: "Повторити оплату MonoPay зараз неможливо.",
      ok: false,
    });

    render(
      <OwnerOrderDetailsView
        availableTags={[]}
        order={createOrderDetails({
          payments: [
            {
              amountMinor: 2_400_00,
              createdAt: new Date("2026-04-30T10:00:00.000Z"),
              currency: "UAH",
              failureReason: "Оплату відхилено",
              id: "payment-2",
              orderId: "order-1",
              paidAt: null,
              provider: "MONOBANK",
              providerInvoiceId: "invoice-old",
              providerModifiedAt: null,
              status: "FAILED",
              updatedAt: new Date("2026-04-30T10:00:00.000Z"),
            },
          ],
          status: "PAYMENT_FAILED",
        })}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Повторити оплату" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Повторити оплату MonoPay зараз неможливо.",
    );
  });

  it("renders Ukrainian empty states for missing related records", () => {
    render(
      <OwnerOrderDetailsView
        availableTags={[]}
        order={createOrderDetails({
          auditEvents: [],
          items: [],
          payments: [],
          shipments: [],
          statusHistory: [],
          tags: [],
        })}
      />,
    );

    expect(screen.getByText(/У замовленні немає товарів/i)).toBeVisible();
    expect(screen.getByText(/Доставка ще не вказана/i)).toBeVisible();
    expect(screen.getByText(/Оплата ще не створена/i)).toBeVisible();
    expect(screen.getByText(/У замовлення ще немає тегів/i)).toBeVisible();
    expect(screen.getByText(/Історія статусів ще порожня/i)).toBeVisible();
    expect(screen.getByText(/Подій аудиту ще немає/i)).toBeVisible();
  });

  it("shows historical Ukrposhta shipments as disabled without retry access", () => {
    const order = createOrderDetails();

    render(
      <OwnerOrderDetailsView
        availableTags={[]}
        order={{
          ...order,
          shipments: order.shipments.map((shipment) => ({
            ...shipment,
            carrier: "UKRPOSHTA",
            status: "FAILED",
          })),
        }}
      />,
    );

    expect(screen.getAllByText("Укрпошта (вимкнено)")[0]).toBeVisible();
    expect(
      screen.getByRole("button", { name: "Повторити створення відправлення" }),
    ).toBeDisabled();
  });

  it("shows a Ukrainian disabled-shipping message to the owner", () => {
    render(
      <OwnerOrderDetailsView
        availableTags={[]}
        order={createOrderDetails()}
        shippingLabelCreationMode="disabled"
      />,
    );

    expect(
      screen.getByText(
        "Створення відправлень вимкнено до завершення виробничих налаштувань доставки.",
      ),
    ).toBeVisible();
    expect(
      screen.getByRole("button", { name: "Повторити створення відправлення" }),
    ).toBeDisabled();
  });
});

function createOrderDetails(
  input: Partial<OwnerOrderDetails> = {},
): OwnerOrderDetails {
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
      instagramUsername: "olena.shop",
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
    ...input,
  };
}
