import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { OrderBuilderForm } from "@/modules/orders/ui/order-builder-form";
import type { OrderBuilderProduct } from "@/modules/orders/application/list-order-builder-products";

describe("OrderBuilderForm", () => {
  it("selects products, calculates total, and shows a public link", async () => {
    const user = userEvent.setup();
    const submittedForms: FormData[] = [];
    const action = vi.fn(async (formData: FormData) => {
      submittedForms.push(formData);

      return {
      message: "Посилання замовлення створено",
      ok: true,
      publicUrl: "http://127.0.0.1:3000/o/public-token",
      } as const;
    });

    render(<OrderBuilderForm action={action} products={[createProduct()]} />);

    await user.click(screen.getByLabelText("Додати Каблучка"));
    await user.clear(screen.getByLabelText("Кількість для Каблучка"));
    await user.type(screen.getByLabelText("Кількість для Каблучка"), "2");

    expect(screen.getByText("Разом до сплати")).toBeVisible();
    expect(screen.getAllByText(/2\s*400,00/)[0]).toBeVisible();

    await user.click(
      screen.getByRole("button", { name: "Створити посилання" }),
    );

    expect(await screen.findByText("Публічне посилання готове")).toBeVisible();
    expect(screen.getByLabelText("Публічне посилання")).toHaveValue(
      "http://127.0.0.1:3000/o/public-token",
    );

    const submittedFormData = submittedForms[0];
    if (!submittedFormData) {
      throw new Error("Expected order builder form submission");
    }

    expect(submittedFormData.getAll("productId")).toEqual(["product-1"]);
    expect(submittedFormData.get("quantity:product-1")).toBe("2");
  });

  it("renders a Ukrainian empty state", () => {
    render(<OrderBuilderForm action={vi.fn()} products={[]} />);

    expect(screen.getByText("Немає активних товарів")).toBeVisible();
    expect(screen.getByText(/Увімкніть товари в каталозі/i)).toBeVisible();
  });

  it("renders a Ukrainian alert when no product is selected", async () => {
    const user = userEvent.setup();
    const action = vi.fn();

    render(<OrderBuilderForm action={action} products={[createProduct()]} />);

    await user.click(
      screen.getByRole("button", { name: "Створити посилання" }),
    );

    expect(screen.getByRole("alert")).toHaveTextContent(
      "Оберіть хоча б один товар",
    );
    expect(action).not.toHaveBeenCalled();
  });
});

function createProduct(): OrderBuilderProduct {
  return {
    currency: "UAH",
    id: "product-1",
    imageUrl: "https://example.com/ring.jpg",
    name: "Каблучка",
    priceMinor: 1_200_00,
    sku: "RING-1",
    stockQuantity: 3,
  };
}
