import { render, screen } from "@testing-library/react";
import type { PersistedOrder } from "@/modules/orders/application/order-repository";
import { getOrderRepository } from "@/modules/orders/infrastructure/order-repository-factory";
import { getPaymentRepository } from "@/modules/payments/infrastructure/payment-repository-factory";
import PublicOrderPage from "./page";

const validToken = "secure_public_token_123456789012345";

vi.mock("@/modules/orders/infrastructure/order-repository-factory", () => ({
  getOrderRepository: vi.fn(),
}));

vi.mock("@/modules/payments/infrastructure/payment-repository-factory", () => ({
  getPaymentRepository: vi.fn(),
}));

describe("PublicOrderPage", () => {
  beforeEach(() => {
    vi.mocked(getPaymentRepository).mockReturnValue({
      findByOrderId: vi.fn(async () => []),
    } as never);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("renders the public order review without exposing the internal order id", async () => {
    vi.mocked(getOrderRepository).mockReturnValue({
      findByPublicToken: vi.fn(async () => createOrder()),
    } as never);

    render(
      await PublicOrderPage({
        params: Promise.resolve({ token: validToken }),
      }),
    );

    expect(
      screen.getByRole("heading", { name: "Ваше замовлення" }),
    ).toBeVisible();
    expect(screen.getByText("Каблучка")).toBeVisible();
    expect(
      screen.queryByText("55e143f7-1f01-4bd9-9bcb-4c7417db75bb"),
    ).not.toBeInTheDocument();
  });

  it("renders the public status page after customer confirmation", async () => {
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
      await PublicOrderPage({
        params: Promise.resolve({ token: validToken }),
      }),
    );

    expect(
      screen.getByRole("heading", { name: "Замовлення #55e143f7" }),
    ).toBeVisible();
    expect(screen.getByText("Ваше замовлення обробляється.")).toBeVisible();
    expect(
      screen.queryByRole("link", { name: "Перейти до доставки й оплати" }),
    ).not.toBeInTheDocument();
  });

  it("renders a safe unavailable page for expired links", async () => {
    vi.mocked(getOrderRepository).mockReturnValue({
      findByPublicToken: vi.fn(async () =>
        createOrder({
          publicTokenExpiresAt: new Date("2020-04-01T10:00:00.000Z"),
        }),
      ),
    } as never);

    render(
      await PublicOrderPage({
        params: Promise.resolve({ token: validToken }),
      }),
    );

    expect(
      screen.getByRole("heading", { name: "Посилання недоступне" }),
    ).toBeVisible();
  });
});

function createOrder(input: Partial<PersistedOrder> = {}): PersistedOrder {
  const now = new Date("2026-04-30T10:00:00.000Z");

  return {
    confirmedAt: null,
    createdAt: now,
    currency: "UAH",
    customerId: null,
    id: "55e143f7-1f01-4bd9-9bcb-4c7417db75bb",
    items: [
      {
        createdAt: now,
        id: "item-1",
        lineTotalMinor: 2_400_00,
        orderId: "55e143f7-1f01-4bd9-9bcb-4c7417db75bb",
        productId: "product-1",
        productImageUrlsSnapshot: ["https://example.com/ring.jpg"],
        productNameSnapshot: "Каблучка",
        productSkuSnapshot: "RING-1",
        quantity: 2,
        unitPriceMinor: 1_200_00,
      },
    ],
    ownerId: "owner-1",
    publicToken: validToken,
    publicTokenExpiresAt: new Date("2099-05-14T10:00:00.000Z"),
    sentAt: now,
    status: "SENT_TO_CUSTOMER",
    totalMinor: 2_400_00,
    updatedAt: now,
    ...input,
  };
}
