import { render, screen } from "@testing-library/react";
import type { ProductRecord } from "@/modules/catalog/application/product-repository";
import { getProductRepository } from "@/modules/catalog/infrastructure/product-repository-factory";
import { requireOwnerSession } from "@/modules/users/ui/require-owner-session";
import NewOrderPage from "./page";

vi.mock("@/modules/users/ui/require-owner-session", () => ({
  requireOwnerSession: vi.fn(),
}));

vi.mock("@/modules/catalog/infrastructure/product-repository-factory", () => ({
  getProductRepository: vi.fn(),
}));

describe("NewOrderPage", () => {
  it("renders active owner products in the Ukrainian order builder", async () => {
    vi.mocked(requireOwnerSession).mockResolvedValue({
      email: "owner@example.com",
      id: "owner-1",
      name: "Власниця",
      role: "owner",
    });
    vi.mocked(getProductRepository).mockReturnValue({
      listByOwnerId: vi.fn(async () => [
        createProduct({ id: "product-1", isActive: true, name: "Каблучка" }),
        createProduct({ id: "product-2", isActive: false, name: "Ланцюжок" }),
      ]),
    } as never);

    render(await NewOrderPage());

    expect(
      screen.getByRole("heading", { name: "Створити посилання замовлення" }),
    ).toBeVisible();
    expect(screen.getByText("Каблучка")).toBeVisible();
    expect(screen.queryByText("Ланцюжок")).not.toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Створити посилання" }),
    ).toBeVisible();
  });
});

function createProduct(input: Partial<ProductRecord>): ProductRecord {
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
        productId: input.id ?? "product-1",
        sortOrder: 0,
        url: "https://example.com/ring.jpg",
      },
    ],
    isActive: true,
    name: "Каблучка",
    ownerId: "owner-1",
    priceMinor: 1_200_00,
    sku: "RING-1",
    stockQuantity: 3,
    updatedAt: now,
    ...input,
  };
}
