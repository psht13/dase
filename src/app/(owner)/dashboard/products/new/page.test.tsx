import { render, screen } from "@testing-library/react";
import NewProductPage from "./page";

vi.mock("@/modules/catalog/ui/product-form", () => ({
  ProductForm: () => <div>Форма товару</div>,
}));

describe("NewProductPage", () => {
  it("renders Ukrainian product creation copy", () => {
    render(<NewProductPage />);

    expect(screen.getByRole("heading", { name: "Новий товар" })).toBeVisible();
    expect(screen.getByText("Форма товару")).toBeVisible();
  });
});
