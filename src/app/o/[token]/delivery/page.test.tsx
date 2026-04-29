import { render, screen } from "@testing-library/react";
import type { PersistedOrder } from "@/modules/orders/application/order-repository";
import { getOrderRepository } from "@/modules/orders/infrastructure/order-repository-factory";
import PublicDeliveryPage from "./page";

const validToken = "secure_public_token_123456789012345";

vi.mock("@/modules/orders/infrastructure/order-repository-factory", () => ({
  getOrderRepository: vi.fn(),
}));

describe("PublicDeliveryPage", () => {
  it("renders the Ukrainian delivery and payment form placeholder", async () => {
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
    expect(screen.getByText("Повне ім’я")).toBeVisible();
    expect(screen.getByText("Спосіб доставки")).toBeVisible();
    expect(screen.getByText("Спосіб оплати")).toBeVisible();
    expect(screen.getByRole("link", { name: "Назад" })).toHaveAttribute(
      "href",
      `/o/${validToken}`,
    );
  });
});

function createOrder(): PersistedOrder {
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
  };
}
