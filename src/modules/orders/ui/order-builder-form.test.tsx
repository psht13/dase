import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { OrderBuilderProduct } from "@/modules/orders/application/list-order-builder-products";
import { OrderBuilderForm } from "@/modules/orders/ui/order-builder-form";

describe("OrderBuilderForm", () => {
  it("renders a searchable Ukrainian product selection step", async () => {
    const user = userEvent.setup();

    render(
      <OrderBuilderForm
        action={vi.fn()}
        products={[
          createProduct({ name: "Каблучка", sku: "RING-1" }),
          createProduct({
            id: "product-2",
            imageUrl: null,
            name: "Сережки",
            sku: "EARRING-1",
          }),
        ]}
      />,
    );

    expect(screen.getByRole("heading", { name: "Вибір товарів" })).toBeVisible();
    expect(screen.getAllByText("Крок 1 з 4")[0]).toBeVisible();
    expect(screen.getByText("Кількість")).toBeVisible();
    expect(screen.getByText("Перевірка")).toBeVisible();
    expect(screen.getByText("Посилання")).toBeVisible();

    await user.type(screen.getByLabelText("Пошук товарів"), "сер");

    expect(screen.queryByText("Каблучка")).not.toBeInTheDocument();
    expect(screen.getByText("Сережки")).toBeVisible();

    await user.click(screen.getByLabelText("Додати Сережки"));

    expect(screen.getByText("Обрано товарів: 1")).toBeVisible();

    await user.click(screen.getByRole("button", { name: "Далі" }));

    expect(screen.getByRole("heading", { name: "Кількість" })).toBeVisible();
    expect(screen.getByLabelText("Кількість для Сережки")).toBeVisible();
    expect(
      screen.queryByLabelText("Кількість для Каблучка"),
    ).not.toBeInTheDocument();
  });

  it("validates selected product quantities before the summary step", async () => {
    const user = userEvent.setup();
    const action = vi.fn();

    render(<OrderBuilderForm action={action} products={[createProduct()]} />);

    await user.click(screen.getByLabelText("Додати Каблучка"));
    await user.click(screen.getByRole("button", { name: "Далі" }));
    await user.clear(screen.getByLabelText("Кількість для Каблучка"));
    await user.click(screen.getByRole("button", { name: "Далі" }));

    expect(screen.getByRole("alert")).toHaveTextContent(
      "Виправте кількість обраних товарів",
    );
    expect(screen.getByText("Вкажіть кількість")).toBeVisible();
    expect(screen.getByRole("heading", { name: "Кількість" })).toBeVisible();
    expect(action).not.toHaveBeenCalled();
  });

  it("shows the summary step, creates a link, and displays link actions", async () => {
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

    render(
      <OrderBuilderForm
        action={action}
        products={[
          createProduct(),
          createProduct({
            id: "product-2",
            name: "Сережки",
            priceMinor: 900_00,
            sku: "EARRING-1",
          }),
        ]}
      />,
    );

    await user.click(screen.getByLabelText("Додати Каблучка"));
    await user.click(screen.getByLabelText("Додати Сережки"));
    await user.click(screen.getByRole("button", { name: "Далі" }));
    await user.clear(screen.getByLabelText("Кількість для Каблучка"));
    await user.type(screen.getByLabelText("Кількість для Каблучка"), "2");
    await user.click(
      screen.getByRole("button", {
        name: "Збільшити кількість для Сережки",
      }),
    );
    await user.click(screen.getByRole("button", { name: "Далі" }));

    expect(screen.getByRole("heading", { name: "Перевірка" })).toBeVisible();
    expect(screen.getByText("Підсумок замовлення")).toBeVisible();
    expect(screen.getAllByText(/2\s*400,00/)[0]).toBeVisible();
    expect(screen.getAllByText(/1\s*800,00/)[0]).toBeVisible();

    await user.click(
      screen.getByRole("button", { name: "Створити посилання" }),
    );

    expect(await screen.findByRole("heading", { name: "Посилання" })).toBeVisible();
    expect(screen.getByText("Публічне посилання готове")).toBeVisible();
    expect(screen.getByLabelText("Публічне посилання")).toHaveValue(
      "http://127.0.0.1:3000/o/public-token",
    );
    expect(screen.getByRole("button", { name: "Копіювати" })).toBeVisible();
    expect(screen.getByRole("link", { name: "Відкрити" })).toHaveAttribute(
      "href",
      "http://127.0.0.1:3000/o/public-token",
    );

    const submittedFormData = submittedForms[0];
    if (!submittedFormData) {
      throw new Error("Expected order builder form submission");
    }

    expect(submittedFormData.getAll("productId")).toEqual([
      "product-1",
      "product-2",
    ]);
    expect(submittedFormData.get("quantity:product-1")).toBe("2");
    expect(submittedFormData.get("quantity:product-2")).toBe("2");
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

    await user.click(screen.getByRole("button", { name: "Далі" }));

    expect(screen.getByRole("alert")).toHaveTextContent(
      "Оберіть хоча б один товар",
    );
    expect(action).not.toHaveBeenCalled();
  });
});

function createProduct(
  input: Partial<OrderBuilderProduct> = {},
): OrderBuilderProduct {
  return {
    currency: "UAH",
    id: "product-1",
    imageUrl: "https://example.com/ring.jpg",
    name: "Каблучка",
    priceMinor: 1_200_00,
    sku: "RING-1",
    stockQuantity: 3,
    ...input,
  };
}
