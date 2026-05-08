import { render, screen, within } from "@testing-library/react";
import { ProductTable } from "./product-table";
import type { ProductRecord } from "@/modules/catalog/application/product-repository";

describe("ProductTable", () => {
  it("renders compact Ukrainian desktop table hierarchy", () => {
    render(
      <ProductTable
        products={[createProduct({ isActive: true })]}
        toggleAction={vi.fn()}
      />,
    );

    const table = within(screen.getByTestId("product-desktop-table"));

    expect(table.getByRole("columnheader", { name: "Товар" })).toBeVisible();
    expect(
      table.getByRole("columnheader", { name: "Ціна і залишок" }),
    ).toBeVisible();
    expect(table.getByRole("columnheader", { name: "Стан" })).toBeVisible();
    expect(table.getByRole("columnheader", { name: "Дії" })).toBeVisible();
    expect(
      table.queryByRole("columnheader", { name: "Фото" }),
    ).not.toBeInTheDocument();
    expect(
      table.queryByRole("columnheader", { name: "Артикул" }),
    ).not.toBeInTheDocument();
    expect(table.getByText("Каблучка")).toBeVisible();
    expect(table.getByText("Артикул: RING-1")).toBeVisible();
    expect(table.getByText("Залишок: 3")).toBeVisible();
    expect(table.getByText("Активний")).toBeVisible();
    expect(table.getByRole("link", { name: /Редагувати/i })).toBeVisible();
    expect(table.getByRole("button", { name: /Вимкнути/i })).toBeVisible();
  });

  it("renders mobile product cards with key details and actions", () => {
    render(
      <ProductTable
        products={[createProduct({ isActive: false })]}
        toggleAction={vi.fn()}
      />,
    );

    const card = within(screen.getByTestId("product-mobile-card"));

    expect(card.getByRole("heading", { name: "Каблучка" })).toBeVisible();
    expect(card.getByText("Артикул: RING-1")).toBeVisible();
    expect(card.getByText(/120,00/)).toBeVisible();
    expect(card.getByText("Залишок")).toBeVisible();
    expect(card.getByText("3")).toBeVisible();
    expect(card.getByText("Неактивний")).toBeVisible();
    expect(card.getByRole("link", { name: /Редагувати/i })).toBeVisible();
    expect(card.getByRole("button", { name: /Увімкнути/i })).toBeVisible();
  });

  it("renders a Ukrainian empty state", () => {
    render(<ProductTable products={[]} toggleAction={vi.fn()} />);

    expect(screen.getByText("Каталог порожній")).toBeVisible();
    expect(screen.getByText(/Створіть перший товар/i)).toBeVisible();
  });
});

function createProduct(input: { isActive: boolean }): ProductRecord {
  const now = new Date("2026-04-30T00:00:00.000Z");

  return {
    createdAt: now,
    currency: "UAH",
    description: "Срібна каблучка",
    id: "product-1",
    images: [
      {
        altText: "Каблучка",
        createdAt: now,
        id: "image-1",
        productId: "product-1",
        sortOrder: 0,
        url: "https://example.com/ring.jpg",
      },
    ],
    isActive: input.isActive,
    name: "Каблучка",
    ownerId: "owner-1",
    priceMinor: 120_00,
    sku: "RING-1",
    stockQuantity: 3,
    updatedAt: now,
  };
}
