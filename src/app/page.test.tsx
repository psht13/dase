import { render, screen } from "@testing-library/react";
import Home from "./page";

describe("Home page", () => {
  it("renders Ukrainian starter copy", () => {
    render(<Home />);

    expect(
      screen.getByRole("heading", {
        name: "Підтвердження замовлень для ювелірних продавців",
      }),
    ).toBeInTheDocument();
    expect(screen.getByText("Каталог товарів")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Перейти до налаштування" }),
    ).toBeInTheDocument();
  });
});
