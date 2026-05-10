import { render, screen } from "@testing-library/react";
import SettingsPage from "./page";

describe("SettingsPage", () => {
  it("renders settings landing cards for payment and shipping", () => {
    render(<SettingsPage />);

    expect(screen.getByRole("heading", { name: "Налаштування" })).toBeVisible();
    expect(
      screen.getByRole("link", { name: /Реквізити для оплати/i }),
    ).toHaveAttribute("href", "/dashboard/settings/payment");
    expect(screen.getByRole("link", { name: /Доставка/i })).toHaveAttribute(
      "href",
      "/dashboard/settings/shipping",
    );
  });
});
