import { render, screen } from "@testing-library/react";
import DashboardLayout from "./layout";
import { requireOwnerSession } from "@/modules/users/ui/require-owner-session";

vi.mock("@/modules/users/ui/require-owner-session", () => ({
  requireOwnerSession: vi.fn(),
}));

describe("DashboardLayout", () => {
  it("renders the Ukrainian owner dashboard shell", async () => {
    vi.mocked(requireOwnerSession).mockResolvedValue({
      email: "owner@example.com",
      id: "owner-1",
      name: "Власниця",
      role: "owner",
    });

    render(await DashboardLayout({ children: <p>Вміст сторінки</p> }));

    expect(screen.getByText("Кабінет власника")).toBeVisible();
    expect(screen.getByRole("link", { name: /Огляд/i })).toBeVisible();
    expect(screen.getByRole("link", { name: /Каталог товарів/i })).toBeVisible();
    expect(
      screen.getByRole("link", { name: /Створити замовлення/i }),
    ).toBeVisible();
    expect(screen.getByText("Роль: власник")).toBeVisible();
    expect(screen.getByText("Вміст сторінки")).toBeVisible();
  });
});
