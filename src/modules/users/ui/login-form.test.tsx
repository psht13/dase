import { render, screen } from "@testing-library/react";
import { LoginForm } from "@/modules/users/ui/login-form";

vi.mock("@/modules/users/ui/login-actions", () => ({
  initialLoginActionState: {
    message: null,
    ok: false,
  },
  loginOwnerAction: vi.fn(),
}));

describe("LoginForm", () => {
  it("renders Ukrainian login labels", () => {
    render(<LoginForm />);

    expect(screen.getByLabelText("Електронна пошта")).toBeVisible();
    expect(screen.getByLabelText("Пароль")).toBeVisible();
    expect(screen.getByRole("button", { name: "Увійти" })).toBeVisible();
  });
});
