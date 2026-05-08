import { render, screen } from "@testing-library/react";
import { getPaymentRequisiteRepository } from "@/modules/payments/infrastructure/payment-requisite-repository-factory";
import { requireOwnerSession } from "@/modules/users/ui/require-owner-session";
import DashboardPage from "./page";

vi.mock("@/modules/users/ui/require-owner-session", () => ({
  requireOwnerSession: vi.fn(),
}));

vi.mock(
  "@/modules/payments/infrastructure/payment-requisite-repository-factory",
  () => ({
    getPaymentRequisiteRepository: vi.fn(),
  }),
);

describe("DashboardPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(requireOwnerSession).mockResolvedValue({
      email: "owner@example.com",
      id: "owner-1",
      name: "Власниця",
      role: "owner",
    });
    vi.mocked(getPaymentRequisiteRepository).mockReturnValue({
      listActiveByOwnerId: vi.fn(async () => [
        {
          bankName: null,
          displayValue: "4441 1111 2222 3333",
          id: "requisite-1",
          label: "Основна картка",
          note: null,
          recipientName: null,
        },
      ]),
    } as never);
  });

  it("renders Ukrainian owner dashboard labels", async () => {
    render(await DashboardPage());

    expect(
      screen.getByRole("heading", { name: "Панель власника" }),
    ).toBeVisible();
    expect(screen.getByRole("link", { name: /Додати товар/i })).toBeVisible();
    expect(screen.getByText("Каталог товарів")).toBeVisible();
  });

  it("warns when no active payment requisites are configured", async () => {
    vi.mocked(getPaymentRequisiteRepository).mockReturnValue({
      listActiveByOwnerId: vi.fn(async () => []),
    } as never);

    render(await DashboardPage());

    expect(
      screen.getByRole("heading", {
        name: "Немає активних реквізитів для оплати картою",
      }),
    ).toBeVisible();
    expect(
      screen.getByRole("link", { name: "Налаштувати оплату" }),
    ).toHaveAttribute("href", "/dashboard/settings/payment");
  });
});
