import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent, { type UserEvent } from "@testing-library/user-event";
import { ProductForm } from "./product-form";
import type { ProductActionResult } from "./product-actions";
import type { ProductFormValues } from "@/modules/catalog/application/product-validation";

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

  it("renders Ukrainian product step labels", () => {
    render(
      <ProductForm
        action={vi.fn()}
        cancelHref="/dashboard/products"
        submitLabel="Створити товар"
      />,
    );

    expect(
      screen.getByRole("navigation", { name: "Прогрес форми" }),
    ).toBeVisible();
    expect(screen.getByRole("heading", { name: "Основне" })).toBeVisible();
    expect(screen.getByText("Ціна та залишок")).toBeVisible();
    expect(screen.getByText("Зображення")).toBeVisible();
    expect(screen.getByText("Перевірка")).toBeVisible();
    expect(screen.getByLabelText("Назва товару")).toBeInTheDocument();
    expect(screen.getByLabelText("Артикул")).toBeInTheDocument();
    expect(screen.getByLabelText("Опис")).toBeInTheDocument();
    expect(screen.getByLabelText("Активний товар")).toBeInTheDocument();
  });

  it("validates only the current step before moving forward", async () => {
    const user = userEvent.setup();
    const action = vi.fn();
    render(
      <ProductForm
        action={action}
        cancelHref="/dashboard/products"
        submitLabel="Створити товар"
      />,
    );

    await user.click(screen.getByRole("button", { name: "Далі" }));

    expect(await screen.findByText("Перевірте поля цього кроку")).toBeVisible();
    expect(screen.getByText("Вкажіть назву товару")).toBeVisible();
    expect(screen.getByText("Вкажіть артикул")).toBeVisible();
    expect(screen.queryByText("Вкажіть ціну")).not.toBeInTheDocument();
    expect(
      screen.queryByText("Додайте посилання на зображення"),
    ).not.toBeInTheDocument();
    expect(action).not.toHaveBeenCalled();
  });

  it("keeps entered values when moving between steps", async () => {
    const user = userEvent.setup();
    render(
      <ProductForm
        action={vi.fn()}
        cancelHref="/dashboard/products"
        submitLabel="Створити товар"
      />,
    );

    await fillBasicStep(user, {
      description: "Срібна каблучка",
      name: "Каблучка",
      sku: "RING-1",
    });
    await user.click(screen.getByRole("button", { name: "Далі" }));
    await screen.findByRole("heading", { name: "Ціна та залишок" });
    await user.click(screen.getByRole("button", { name: "Назад" }));

    expect(await screen.findByLabelText("Назва товару")).toHaveValue(
      "Каблучка",
    );
    expect(screen.getByLabelText("Артикул")).toHaveValue("RING-1");
    expect(screen.getByLabelText("Опис")).toHaveValue("Срібна каблучка");
  });

  it("validates price fields before the image step", async () => {
    const user = userEvent.setup();
    render(
      <ProductForm
        action={vi.fn()}
        cancelHref="/dashboard/products"
        submitLabel="Створити товар"
      />,
    );

    await fillBasicStep(user);
    await user.click(screen.getByRole("button", { name: "Далі" }));
    await user.click(await screen.findByRole("button", { name: "Далі" }));

    expect(await screen.findByText("Вкажіть ціну")).toBeVisible();
    expect(
      screen.queryByText("Додайте посилання на зображення"),
    ).not.toBeInTheDocument();
  });

  it("adds image URL fields, previews images, and submits the create action from the final step", async () => {
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

    await fillProductThroughImageStep(user, {
      imageUrls: [
        "https://example.com/ring.jpg",
        "https://example.com/ring-2.jpg",
      ],
    });

    expect(screen.getByAltText("Зображення товару 1")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Далі" }));

    expect(
      await screen.findByRole("heading", { name: "Перевірка" }),
    ).toBeVisible();
    expect(screen.getByText("Підсумок товару")).toBeVisible();
    expect(screen.getByText("Каблучка")).toBeVisible();
    expect(screen.getByText("RING-1")).toBeVisible();
    expect(screen.getByText("1200,50 грн")).toBeVisible();
    expect(screen.getByText("https://example.com/ring-2.jpg")).toBeVisible();

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

  it("preloads edit values across steps", async () => {
    const user = userEvent.setup();
    render(
      <ProductForm
        action={vi.fn()}
        cancelHref="/dashboard/products"
        defaultValues={editProductValues}
        submitLabel="Зберегти товар"
      />,
    );

    expect(screen.getByLabelText("Назва товару")).toHaveValue(
      "Сережки з перлами",
    );
    expect(screen.getByLabelText("Артикул")).toHaveValue("EAR-2");
    expect(screen.getByLabelText("Активний товар")).not.toBeChecked();

    await user.click(screen.getByRole("button", { name: "Далі" }));
    expect(await screen.findByLabelText("Ціна, грн")).toHaveValue("2400");
    expect(screen.getByLabelText("Залишок")).toHaveValue("7");

    await user.click(screen.getByRole("button", { name: "Далі" }));
    expect(await screen.findByLabelText("URL зображення")).toHaveValue(
      "https://example.com/earrings.jpg",
    );

    await user.click(screen.getByRole("button", { name: "Далі" }));
    const summary = await screen.findByText("Підсумок товару");
    expect(summary).toBeVisible();
    expect(screen.getByText("Неактивний товар")).toBeVisible();
    expect(screen.getByText("https://example.com/earrings.jpg")).toBeVisible();
  });

  it("renders product image delete as a large touch target", async () => {
    const user = userEvent.setup();
    render(
      <ProductForm
        action={vi.fn()}
        cancelHref="/dashboard/products"
        submitLabel="Створити товар"
      />,
    );

    await fillBasicStep(user);
    await user.click(screen.getByRole("button", { name: "Далі" }));
    await fillPricingStep(user);
    await user.click(screen.getByRole("button", { name: "Далі" }));

    const deleteButton = await screen.findByRole("button", {
      name: "Видалити зображення",
    });

    expect(deleteButton).toHaveClass("size-12");
    expect(deleteButton.querySelector("svg")).toHaveClass("size-5");
  });

  it("shows Ukrainian server field errors on the matching step", async () => {
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

    await fillProductThroughImageStep(user);
    await user.click(screen.getByRole("button", { name: "Далі" }));
    await user.click(
      await screen.findByRole("button", { name: /Створити товар/i }),
    );

    expect(await screen.findByText("Перевірте дані товару")).toBeVisible();
    expect(
      await screen.findByRole("heading", { name: "Основне" }),
    ).toBeVisible();
    expect(screen.getByText("Назва товару вже використовується")).toBeVisible();
    expect(screen.getByLabelText("Назва товару")).toHaveAccessibleDescription(
      "Назва товару вже використовується",
    );
  });

  it("reveals the image step when server validation returns image URL errors", async () => {
    const user = userEvent.setup();
    const action = vi.fn(async (): Promise<ProductActionResult> => ({
      fieldErrors: {
        imageUrls: ["Вкажіть коректне посилання на зображення"],
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

    await fillProductThroughImageStep(user);
    await user.click(screen.getByRole("button", { name: "Далі" }));
    await user.click(
      await screen.findByRole("button", { name: /Створити товар/i }),
    );

    expect(await screen.findByText("Перевірте дані товару")).toBeVisible();
    expect(
      await screen.findByRole("heading", { name: "Зображення" }),
    ).toBeVisible();
    expect(
      screen.getByText("Вкажіть коректне посилання на зображення"),
    ).toBeVisible();
  });

  it("keeps the review step visible for server messages without field errors", async () => {
    const user = userEvent.setup();
    const action = vi.fn(async (): Promise<ProductActionResult> => ({
      message: "Товар з таким артикулом уже існує",
      ok: false,
    }));

    render(
      <ProductForm
        action={action}
        cancelHref="/dashboard/products"
        defaultValues={{
          ...editProductValues,
          description: "",
          isActive: true,
          name: "Каблучка",
          sku: "RING-1",
        }}
        submitLabel="Створити товар"
      />,
    );

    await user.click(screen.getByRole("button", { name: "Далі" }));
    await user.click(screen.getByRole("button", { name: "Далі" }));
    await user.click(screen.getByRole("button", { name: "Далі" }));

    expect(
      await screen.findByRole("heading", { name: "Перевірка" }),
    ).toBeVisible();
    expect(screen.getByText("Не вказано")).toBeVisible();

    await user.click(screen.getByRole("button", { name: /Створити товар/i }));

    expect(
      await screen.findByText("Товар з таким артикулом уже існує"),
    ).toBeVisible();
    expect(screen.getByRole("heading", { name: "Перевірка" })).toBeVisible();
  });

  it("keeps the active step marked for assistive technologies", async () => {
    const user = userEvent.setup();
    render(
      <ProductForm
        action={vi.fn()}
        cancelHref="/dashboard/products"
        submitLabel="Створити товар"
      />,
    );

    await fillBasicStep(user);
    await user.click(screen.getByRole("button", { name: "Далі" }));

    const progress = screen.getByRole("navigation", {
      name: "Прогрес форми",
    });
    const currentStep = within(progress).getByText("Ціна та залишок");

    expect(currentStep.closest("[aria-current='step']")).not.toBeNull();
  });
});

const editProductValues: ProductFormValues = {
  description: "Перли та срібло",
  imageUrls: [{ url: "https://example.com/earrings.jpg" }],
  isActive: false,
  name: "Сережки з перлами",
  price: "2400",
  sku: "EAR-2",
  stockQuantity: "7",
};

async function fillBasicStep(
  user: UserEvent,
  values: Partial<Pick<ProductFormValues, "description" | "name" | "sku">> = {},
) {
  await user.type(screen.getByLabelText("Назва товару"), values.name ?? "Каблучка");
  await user.type(screen.getByLabelText("Артикул"), values.sku ?? "RING-1");

  if (values.description !== undefined) {
    await user.type(screen.getByLabelText("Опис"), values.description);
  }
}

async function fillPricingStep(
  user: UserEvent,
  values: Partial<Pick<ProductFormValues, "price" | "stockQuantity">> = {},
) {
  await user.type(screen.getByLabelText("Ціна, грн"), values.price ?? "1200,50");
  await user.clear(screen.getByLabelText("Залишок"));
  await user.type(
    screen.getByLabelText("Залишок"),
    values.stockQuantity ?? "3",
  );
}

async function fillProductThroughImageStep(
  user: UserEvent,
  values: Partial<{
    imageUrls: string[];
    price: string;
    stockQuantity: string;
  }> = {},
) {
  await fillBasicStep(user);
  await user.click(screen.getByRole("button", { name: "Далі" }));
  await screen.findByRole("heading", { name: "Ціна та залишок" });
  await fillPricingStep(user, values);
  await user.click(screen.getByRole("button", { name: "Далі" }));
  await screen.findByRole("heading", { name: "Зображення" });

  const [firstImageUrl, ...additionalImageUrls] = values.imageUrls ?? [
    "https://example.com/ring.jpg",
  ];

  await user.type(screen.getByLabelText("URL зображення"), firstImageUrl);

  for (const imageUrl of additionalImageUrls) {
    await user.click(
      screen.getByRole("button", { name: "Додати зображення" }),
    );
    const imageInputs = screen.getAllByLabelText("URL зображення");
    await user.type(imageInputs[imageInputs.length - 1], imageUrl);
  }
}
