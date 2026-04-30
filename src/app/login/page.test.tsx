import { render, screen } from "@testing-library/react";
import LoginPage from "./page";

vi.mock("@/modules/users/ui/login-form", () => ({
  LoginForm: () => <form aria-label="Форма входу" />,
}));

describe("LoginPage", () => {
  it("renders Ukrainian login labels", async () => {
    render(await LoginPage({ searchParams: Promise.resolve({}) }));

    expect(
      screen.getByRole("heading", { name: "Вхід до кабінету" }),
    ).toBeVisible();
    expect(screen.getByRole("form", { name: "Форма входу" })).toBeVisible();
    expect(
      screen.getByRole("link", { name: "Створити першого власника" }),
    ).toHaveAttribute("href", "/setup");
  });

  it("shows Ukrainian setup-created and logout notices", async () => {
    const { rerender } = render(
      await LoginPage({
        searchParams: Promise.resolve({ setup: "created" }),
      }),
    );

    expect(
      screen.getByText("Першого власника створено. Увійдіть із новими даними."),
    ).toBeVisible();

    rerender(
      await LoginPage({
        searchParams: Promise.resolve({ logout: "1" }),
      }),
    );

    expect(screen.getByText("Ви вийшли з кабінету.")).toBeVisible();
  });
});
