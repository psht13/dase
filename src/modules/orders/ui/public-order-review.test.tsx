import { render, screen } from "@testing-library/react";
import {
  PublicOrderReview,
  PublicOrderUnavailable,
} from "@/modules/orders/ui/public-order-review";
import type { PublicOrderReview as PublicOrderReviewData } from "@/modules/orders/application/lookup-public-order";

describe("PublicOrderReview", () => {
  it("renders public order snapshots with Ukrainian labels", () => {
    render(
      <PublicOrderReview
        deliveryHref="/o/public-token/delivery"
        order={createPublicOrder()}
      />,
    );

    expect(
      screen.getByRole("heading", { name: "Ваше замовлення" }),
    ).toBeVisible();
    expect(screen.getByText("Каблучка")).toBeVisible();
    expect(screen.getByText("Артикул: RING-1")).toBeVisible();
    expect(screen.getByText("Кількість: 2")).toBeVisible();
    expect(screen.getByAltText("Каблучка")).toHaveAttribute(
      "src",
      "https://example.com/ring.jpg",
    );
    expect(
      screen.getByRole("link", { name: "Перейти до доставки й оплати" }),
    ).toHaveAttribute("href", "/o/public-token/delivery");
  });

  it("renders a safe Ukrainian unavailable page", () => {
    render(<PublicOrderUnavailable />);

    expect(
      screen.getByRole("heading", { name: "Посилання недоступне" }),
    ).toBeVisible();
    expect(screen.getByText(/термін його дії завершився/i)).toBeVisible();
  });

  it("renders Ukrainian MonoPay status messages", () => {
    render(
      <PublicOrderReview
        deliveryHref="/o/public-token/delivery"
        order={createPublicOrder({
          paymentProvider: "MONOBANK",
          paymentStatus: "PENDING",
          status: "PAYMENT_PENDING",
        })}
      />,
    );

    expect(
      screen.getByText("Очікуємо підтвердження оплати MonoPay."),
    ).toBeVisible();
  });
});

function createPublicOrder(
  input: Partial<PublicOrderReviewData> = {},
): PublicOrderReviewData {
  return {
    currency: "UAH",
    items: [
      {
        lineTotalMinor: 2_400_00,
        productImageUrlsSnapshot: ["https://example.com/ring.jpg"],
        productNameSnapshot: "Каблучка",
        productSkuSnapshot: "RING-1",
        quantity: 2,
        unitPriceMinor: 1_200_00,
      },
    ],
    paymentProvider: null,
    paymentStatus: null,
    publicToken: "public-token",
    publicTokenExpiresAt: new Date("2026-05-14T10:00:00.000Z"),
    status: "SENT_TO_CUSTOMER",
    totalMinor: 2_400_00,
    ...input,
  };
}
