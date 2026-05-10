import { render, screen } from "@testing-library/react";
import type { PersistedOrder } from "@/modules/orders/application/order-repository";
import { getOrderRepository } from "@/modules/orders/infrastructure/order-repository-factory";
import { getPaymentRequisiteRepository } from "@/modules/payments/infrastructure/payment-requisite-repository-factory";
import { getPaymentRepository } from "@/modules/payments/infrastructure/payment-repository-factory";
import PublicDeliveryPage from "./page";

const validToken = "secure_public_token_123456789012345";

vi.mock("@/modules/orders/infrastructure/order-repository-factory", () => ({
  getOrderRepository: vi.fn(),
}));

vi.mock("@/modules/payments/infrastructure/payment-repository-factory", () => ({
  getPaymentRepository: vi.fn(),
}));

vi.mock(
  "@/modules/payments/infrastructure/payment-requisite-repository-factory",
  () => ({
    getPaymentRequisiteRepository: vi.fn(),
  }),
);

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    refresh: vi.fn(),
  }),
}));

describe("PublicDeliveryPage", () => {
  beforeEach(() => {
    vi.mocked(getPaymentRepository).mockReturnValue({
      findByOrderId: vi.fn(async () => []),
    } as never);
    vi.mocked(getPaymentRequisiteRepository).mockReturnValue({
      listActiveByOwnerId: vi.fn(async () => [
        {
          bankName: "ПриватБанк",
          displayValue: "4441 1111 2222 3333",
          id: "requisite-1",
          label: "Основна картка",
          note: null,
          recipientName: "Олена Петренко",
        },
      ]),
    } as never);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("renders the Ukrainian delivery and payment form", async () => {
    vi.mocked(getOrderRepository).mockReturnValue({
      findByPublicToken: vi.fn(async () => createOrder()),
    } as never);

    render(
      await PublicDeliveryPage({
        params: Promise.resolve({ token: validToken }),
      }),
    );

    expect(
      screen.getByRole("heading", { name: "Доставка та оплата" }),
    ).toBeVisible();
    expect(screen.getByRole("heading", { name: "Контакти" })).toBeVisible();
    expect(screen.getAllByText("Крок 1 із 4")[0]).toBeVisible();
    expect(screen.getByText("Повне ім’я")).toBeVisible();
    expect(screen.getByText("Доставка")).toBeVisible();
    expect(screen.getByText("Оплата")).toBeVisible();
    expect(screen.getByText("Перевірка")).toBeVisible();
    expect(
      screen.getByRole("link", { name: "Назад до замовлення" }),
    ).toHaveAttribute(
      "href",
      `/o/${validToken}`,
    );
  });

  it("renders the status page instead of the form after confirmation", async () => {
    vi.mocked(getOrderRepository).mockReturnValue({
      findByPublicToken: vi.fn(async () =>
        createOrder({
          confirmedAt: new Date("2026-04-30T11:00:00.000Z"),
          customerId: "customer-1",
          id: "55e143f7-1f01-4bd9-9bcb-4c7417db75bb",
          status: "CONFIRMED_BY_CUSTOMER",
        }),
      ),
    } as never);

    render(
      await PublicDeliveryPage({
        params: Promise.resolve({ token: validToken }),
      }),
    );

    expect(
      screen.getByRole("heading", { name: "Замовлення #55e143f7" }),
    ).toBeVisible();
    expect(screen.getByText("Ваше замовлення обробляється.")).toBeVisible();
    expect(screen.queryByLabelText("Повне ім’я")).not.toBeInTheDocument();
  });
});

function createOrder(input: Partial<PersistedOrder> = {}): PersistedOrder {
  const now = new Date("2026-04-30T10:00:00.000Z");

  return {
    confirmedAt: null,
    createdAt: now,
    currency: "UAH",
    customerId: null,
    id: "order-1",
    items: [],
    ownerId: "owner-1",
    publicToken: validToken,
    publicTokenExpiresAt: new Date("2099-05-14T10:00:00.000Z"),
    sentAt: now,
    status: "SENT_TO_CUSTOMER",
    totalMinor: 0,
    updatedAt: now,
    ...input,
  };
}
