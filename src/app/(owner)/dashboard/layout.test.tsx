import { render, screen } from "@testing-library/react";
import DashboardLayout from "./layout";
import { requireOwnerSession } from "@/modules/users/ui/require-owner-session";

vi.mock("@/modules/users/ui/require-owner-session", () => ({
  requireOwnerSession: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  usePathname: () => "/dashboard/products",
}));

describe("DashboardLayout", () => {
  it("renders the Ukrainian owner dashboard shell", async () => {
    vi.mocked(requireOwnerSession).mockResolvedValue({
      email: "owner@example.com",
      id: "owner-1",
      name: "Власниця",
      role: "owner",
    });

    const { container } = render(
      await DashboardLayout({ children: <p>Вміст сторінки</p> }),
    );

    expect(screen.getByText("Кабінет власника")).toBeVisible();
    expect(screen.getAllByRole("link", { name: /Огляд/i })[0]).toBeVisible();
    expect(
      screen.getAllByRole("link", { name: /Каталог товарів/i })[0],
    ).toBeVisible();
    expect(
      screen.getAllByRole("link", { name: /Створити замовлення/i })[0],
    ).toBeVisible();
    expect(
      screen.getAllByRole("link", { name: /Налаштування/i })[0],
    ).toBeVisible();
    expect(screen.getByText("Роль: власник")).toBeVisible();
    expect(screen.getByTestId("mobile-dashboard-nav")).toHaveClass(
      "grid-cols-5",
    );
    expect(screen.getByText("Поточний розділ")).toBeVisible();
    expect(screen.getAllByText("Каталог товарів")[0]).toBeVisible();
    const logoutButtons = screen.getAllByRole("button", { name: "Вийти" });
    expect(logoutButtons).toHaveLength(2);
    for (const button of logoutButtons) {
      expect(button.closest("form")).toHaveAttribute("action", "/logout");
      expect(button.closest("form")).toHaveAttribute("method", "post");
    }
    expect(container.querySelector('a[href="/logout"]')).not.toBeInTheDocument();
    expect(screen.getByText("Вміст сторінки")).toBeVisible();

    const shell = container.querySelector("#main-content > div");
    expect(shell).toHaveClass("w-full", "min-w-0");
    expect(shell).not.toHaveClass("mx-auto");
    expect(shell).not.toHaveClass("max-w-7xl");

    const sidebar = container.querySelector("aside");
    expect(sidebar).toHaveClass("hidden", "lg:sticky", "lg:top-0", "lg:h-dvh");
  });
});
