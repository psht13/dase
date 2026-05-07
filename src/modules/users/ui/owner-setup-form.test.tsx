import { render, screen } from "@testing-library/react";
import { OwnerSetupForm } from "@/modules/users/ui/owner-setup-form";

vi.mock("@/modules/users/ui/owner-setup-actions", () => ({
  createFirstOwnerAction: vi.fn(),
  initialOwnerSetupActionState: {
    message: null,
    ok: false,
  },
}));

describe("OwnerSetupForm", () => {
  it("shows a Ukrainian setup token field in production mode", () => {
    render(<OwnerSetupForm requiresSetupToken />);

    expect(screen.getByLabelText("Токен налаштування")).toBeVisible();
    expect(screen.getByLabelText("Ім’я власника")).toBeVisible();
    expect(
      screen.getByRole("button", { name: "Створити власника" }),
    ).toBeVisible();
  });

  it("allows non-production setup without a token field", () => {
    render(<OwnerSetupForm requiresSetupToken={false} />);

    expect(screen.queryByLabelText("Токен налаштування")).not.toBeInTheDocument();
    expect(screen.getByLabelText("Електронна пошта")).toBeVisible();
  });
});
