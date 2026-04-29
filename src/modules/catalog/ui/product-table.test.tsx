import { render, screen } from "@testing-library/react";
import { ProductTable } from "./product-table";
import type { ProductRecord } from "@/modules/catalog/application/product-repository";

describe("ProductTable", () => {
  it("renders Ukrainian table labels and product status", () => {
    render(
      <ProductTable
        products={[createProduct({ isActive: true })]}
        toggleAction={vi.fn()}
      />,
    );

    expect(screen.getByRole("columnheader", { name: "Назва" })).toBeVisible();
    expect(screen.getByRole("columnheader", { name: "Артикул" })).toBeVisible();
    expect(screen.getByRole("columnheader", { name: "Ціна" })).toBeVisible();
    expect(screen.getByText("Активний")).toBeVisible();
    expect(screen.getByRole("link", { name: /Редагувати/i })).toBeVisible();
    expect(screen.getByRole("button", { name: /Вимкнути/i })).toBeVisible();
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
