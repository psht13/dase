import { render, screen, waitFor } from "@testing-library/react";
import * as React from "react";
import { initialLoginActionState } from "@/modules/users/ui/login-action-state";
import { LoginForm } from "@/modules/users/ui/login-form";

vi.mock("react", async () => {
  const actual = await vi.importActual<typeof import("react")>("react");

  return {
    ...actual,
    useActionState: vi.fn(),
  };
});

vi.mock("@/modules/users/ui/login-actions", () => ({
  loginOwnerAction: vi.fn(),
}));

describe("LoginForm", () => {
  beforeEach(() => {
    vi.mocked(React.useActionState).mockReturnValue([
      initialLoginActionState,
      vi.fn(),
      false,
    ] as never);
  });

  it("renders Ukrainian login labels", () => {
    render(<LoginForm />);

    expect(screen.getByLabelText("Електронна пошта")).toBeVisible();
    expect(screen.getByLabelText("Пароль")).toBeVisible();
    expect(screen.getByRole("button", { name: "Увійти" })).toBeVisible();
  });

  it("shows a Ukrainian loading state", () => {
    vi.mocked(React.useActionState).mockReturnValue([
      initialLoginActionState,
      vi.fn(),
      true,
    ] as never);

    render(<LoginForm />);

    expect(screen.getByRole("button", { name: "Вхід…" })).toBeDisabled();
    expect(screen.getByRole("status")).toHaveTextContent("Виконуємо вхід…");
  });

  it("hard navigates to the dashboard after successful login", async () => {
    const navigateOnSuccess = vi.fn();
    vi.mocked(React.useActionState).mockReturnValue([
      { message: null, ok: true },
      vi.fn(),
      false,
    ] as never);

    render(<LoginForm navigateOnSuccess={navigateOnSuccess} />);

    await waitFor(() => {
      expect(navigateOnSuccess).toHaveBeenCalledWith("/dashboard");
    });
  });
});
