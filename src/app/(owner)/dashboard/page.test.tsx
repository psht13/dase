import { render, screen } from "@testing-library/react";
import DashboardPage from "./page";

describe("DashboardPage", () => {
  it("renders Ukrainian owner dashboard labels", () => {
    render(<DashboardPage />);

    expect(
      screen.getByRole("heading", { name: "Панель власника" }),
    ).toBeVisible();
    expect(screen.getByRole("link", { name: /Додати товар/i })).toBeVisible();
    expect(screen.getByText("Каталог товарів")).toBeVisible();
  });
});
