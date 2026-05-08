import { render, screen } from "@testing-library/react";
import {
  PublicOrderReview,
  PublicOrderStatus,
  PublicOrderUnavailable,
} from "@/modules/orders/ui/public-order-review";
import type {
  PublicOrderReview as PublicOrderReviewData,
  PublicOrderStatus as PublicOrderStatusData,
} from "@/modules/orders/application/lookup-public-order";

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
      <PublicOrderStatus
        order={createPublicOrderStatus({
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

  it("renders a Ukrainian MonoPay retry action when retry is available", () => {
    render(
      <PublicOrderStatus
        order={createPublicOrderStatus({
          canRetryMonobankPayment: true,
          paymentProvider: "MONOBANK",
          paymentStatus: "FAILED",
          status: "PAYMENT_FAILED",
        })}
        paymentRetryAction={vi.fn()}
      />,
    );

    expect(
      screen.getByRole("button", { name: "Повторити оплату" }),
    ).toBeVisible();
  });

  it("renders active manual card payment requisites with customer instruction", () => {
    render(
      <PublicOrderStatus
        order={createPublicOrderStatus({
          paymentProvider: "MANUAL_CARD_TRANSFER",
          paymentRequisites: [
            {
              bankName: "monobank",
              displayValue: "4441 1111 2222 3333",
              id: "requisite-1",
              label: "Основна картка",
              note: "Надішліть квитанцію",
              recipientName: "Олена Петренко",
            },
          ],
          paymentStatus: "PENDING",
          status: "PAYMENT_PENDING",
          statusLabel: "Очікує оплату",
          statusMessage: "Очікуємо оплату картою.",
        })}
      />,
    );

    expect(screen.getByText("Оплата картою онлайн")).toBeVisible();
    expect(
      screen.getByText(/Після оплати надішліть квитанцію продавцю/),
    ).toBeVisible();
    expect(screen.getByText("4441 1111 2222 3333")).toBeVisible();
    expect(screen.getByText(/Олена Петренко/)).toBeVisible();
  });


  it("renders a compact Ukrainian status page after confirmation", () => {
    render(<PublicOrderStatus order={createPublicOrderStatus()} />);

    expect(
      screen.getByRole("heading", { name: "Замовлення #55e143f7" }),
    ).toBeVisible();
    expect(screen.getByText("Поточний статус")).toBeVisible();
    expect(screen.getByText("Підтверджено клієнтом")).toBeVisible();
    expect(screen.getByText("Ваше замовлення обробляється.")).toBeVisible();
    expect(
      screen.getByText("Якщо маєте питання, зверніться до продавця в чаті."),
    ).toBeVisible();
    expect(screen.getByText("Товари у замовленні")).toBeVisible();
    expect(screen.getByText("Каблучка")).toBeVisible();
    expect(screen.getByText("Разом")).toBeVisible();
    expect(
      screen.queryByRole("link", { name: "Перейти до доставки й оплати" }),
    ).not.toBeInTheDocument();
  });
});

function createPublicOrder(
  input: Partial<PublicOrderReviewData> = {},
): PublicOrderReviewData {
  return {
    canRetryMonobankPayment: false,
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
    paymentRequisites: [],
    paymentStatus: null,
    publicToken: "public-token",
    publicTokenExpiresAt: new Date("2026-05-14T10:00:00.000Z"),
    state: "review",
    status: "SENT_TO_CUSTOMER",
    totalMinor: 2_400_00,
    ...input,
  };
}

function createPublicOrderStatus(
  input: Partial<PublicOrderStatusData> = {},
): PublicOrderStatusData {
  return {
    canRetryMonobankPayment: false,
    currency: "UAH",
    displayNumber: "#55e143f7",
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
    paymentRequisites: [],
    paymentStatus: null,
    publicToken: "public-token",
    publicTokenExpiresAt: new Date("2026-05-14T10:00:00.000Z"),
    state: "status",
    status: "CONFIRMED_BY_CUSTOMER",
    statusLabel: "Підтверджено клієнтом",
    statusMessage: "Ваше замовлення обробляється.",
    totalMinor: 2_400_00,
    ...input,
  };
}
