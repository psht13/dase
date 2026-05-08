import { render, screen } from "@testing-library/react";
import { getPaymentRequisiteRepository } from "@/modules/payments/infrastructure/payment-requisite-repository-factory";
import { requireOwnerSession } from "@/modules/users/ui/require-owner-session";
import PaymentSettingsPage from "./page";

vi.mock("@/modules/users/ui/require-owner-session", () => ({
  requireOwnerSession: vi.fn(),
}));

vi.mock(
  "@/modules/payments/infrastructure/payment-requisite-repository-factory",
  () => ({
    getPaymentRequisiteRepository: vi.fn(),
  }),
);

describe("PaymentSettingsPage", () => {
  it("requires owner access and renders Ukrainian payment settings", async () => {
    vi.mocked(requireOwnerSession).mockResolvedValue({
      email: "owner@example.com",
      id: "owner-1",
      name: "Власниця",
      role: "owner",
    });
    vi.mocked(getPaymentRequisiteRepository).mockReturnValue({
      listByOwnerId: vi.fn(async () => []),
    } as never);

    render(await PaymentSettingsPage());

    expect(requireOwnerSession).toHaveBeenCalled();
    expect(
      screen.getByRole("heading", { name: "Реквізити для оплати" }),
    ).toBeVisible();
    expect(
      screen.getByText(
        "Додайте картку або реквізити, які покупці бачитимуть під час оплати.",
      ),
    ).toBeVisible();
  });
});
