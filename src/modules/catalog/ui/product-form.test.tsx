import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ProductForm } from "./product-form";
import type { ProductActionResult } from "./product-actions";

const push = vi.fn();
const refresh = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push,
    refresh,
  }),
}));

describe("ProductForm", () => {
  afterEach(() => {
    push.mockReset();
    refresh.mockReset();
  });

  it("renders important Ukrainian product labels", () => {
    render(
      <ProductForm
        action={vi.fn()}
        cancelHref="/dashboard/products"
        submitLabel="Створити товар"
      />,
    );

    expect(screen.getByLabelText("Назва товару")).toBeInTheDocument();
    expect(screen.getByLabelText("Артикул")).toBeInTheDocument();
    expect(screen.getByLabelText("Ціна, грн")).toBeInTheDocument();
    expect(screen.getByLabelText("Залишок")).toBeInTheDocument();
    expect(screen.getByText("Зображення товару")).toBeInTheDocument();
    expect(screen.getByLabelText("Активний товар")).toBeInTheDocument();
  });

  it("renders product image delete as a large touch target", () => {
    render(
      <ProductForm
        action={vi.fn()}
        cancelHref="/dashboard/products"
        submitLabel="Створити товар"
      />,
    );

    const deleteButton = screen.getByRole("button", {
      name: "Видалити зображення",
    });

    expect(deleteButton).toHaveClass("size-12");
    expect(deleteButton.querySelector("svg")).toHaveClass("size-5");
  });

  it("shows Ukrainian validation messages and does not submit invalid data", async () => {
    const user = userEvent.setup();
    const action = vi.fn();
    render(
      <ProductForm
        action={action}
        cancelHref="/dashboard/products"
        submitLabel="Створити товар"
      />,
    );

    await user.click(
      screen.getByRole("button", { name: /Створити товар/i }),
    );

    expect(await screen.findByText("Вкажіть назву товару")).toBeVisible();
    expect(screen.getByText("Вкажіть артикул")).toBeVisible();
    expect(screen.getByText("Вкажіть ціну")).toBeVisible();
    expect(screen.getByText("Додайте посилання на зображення")).toBeVisible();
    expect(action).not.toHaveBeenCalled();
  });

  it("adds image URL fields, previews images, and submits form data", async () => {
    const user = userEvent.setup();
    const action = vi.fn(
      async (submittedFormData: FormData): Promise<ProductActionResult> => {
        expect(submittedFormData).toBeInstanceOf(FormData);

        return {
          message: "Товар створено",
          ok: true,
          redirectTo: "/dashboard/products",
        };
      },
    );
    render(
      <ProductForm
        action={action}
        cancelHref="/dashboard/products"
        submitLabel="Створити товар"
      />,
    );

    await user.type(screen.getByLabelText("Назва товару"), "Каблучка");
    await user.type(screen.getByLabelText("Артикул"), "RING-1");
    await user.type(screen.getByLabelText("Ціна, грн"), "1200,50");
    await user.clear(screen.getByLabelText("Залишок"));
    await user.type(screen.getByLabelText("Залишок"), "3");
    await user.type(
      screen.getByLabelText("URL зображення"),
      "https://example.com/ring.jpg",
    );
    await user.click(
      screen.getByRole("button", { name: "Додати зображення" }),
    );
    await user.type(
      screen.getAllByLabelText("URL зображення")[1],
      "https://example.com/ring-2.jpg",
    );

    expect(screen.getByAltText("Зображення товару 1")).toBeInTheDocument();

    await user.click(
      screen.getByRole("button", { name: /Створити товар/i }),
    );

    await waitFor(() => expect(action).toHaveBeenCalledTimes(1));

    const formData = action.mock.calls[0]?.[0];

    if (!(formData instanceof FormData)) {
      throw new Error("Expected product form data to be submitted");
    }

    expect(formData.get("name")).toBe("Каблучка");
    expect(formData.get("sku")).toBe("RING-1");
    expect(formData.getAll("imageUrls")).toEqual([
      "https://example.com/ring.jpg",
      "https://example.com/ring-2.jpg",
    ]);
    expect(push).toHaveBeenCalledWith("/dashboard/products");
  });

  it("shows Ukrainian server field errors next to the matching control", async () => {
    const user = userEvent.setup();
    const action = vi.fn(async (): Promise<ProductActionResult> => ({
      fieldErrors: {
        name: ["Назва товару вже використовується"],
      },
      message: "Перевірте дані товару",
      ok: false,
    }));

    render(
      <ProductForm
        action={action}
        cancelHref="/dashboard/products"
        submitLabel="Створити товар"
      />,
    );

    await user.type(screen.getByLabelText("Назва товару"), "Каблучка");
    await user.type(screen.getByLabelText("Артикул"), "RING-1");
    await user.type(screen.getByLabelText("Ціна, грн"), "1200");
    await user.type(
      screen.getByLabelText("URL зображення"),
      "https://example.com/ring.jpg",
    );
    await user.click(
      screen.getByRole("button", { name: /Створити товар/i }),
    );

    expect(await screen.findByText("Перевірте дані товару")).toBeVisible();
    expect(screen.getByText("Назва товару вже використовується")).toBeVisible();
    expect(screen.getByLabelText("Назва товару")).toHaveAccessibleDescription(
      "Назва товару вже використовується",
    );
  });
});
