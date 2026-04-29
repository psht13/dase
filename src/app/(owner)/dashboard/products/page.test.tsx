import { render, screen } from "@testing-library/react";
import type { ProductRecord } from "@/modules/catalog/application/product-repository";
import { getProductRepository } from "@/modules/catalog/infrastructure/product-repository-factory";
import { requireOwnerSession } from "@/modules/users/ui/require-owner-session";
import ProductsPage from "./page";

vi.mock("@/modules/users/ui/require-owner-session", () => ({
  requireOwnerSession: vi.fn(),
}));

vi.mock("@/modules/catalog/infrastructure/product-repository-factory", () => ({
  getProductRepository: vi.fn(),
}));

describe("ProductsPage", () => {
  it("renders the owner's product catalog", async () => {
    vi.mocked(requireOwnerSession).mockResolvedValue({
      email: "owner@example.com",
      id: "owner-1",
      name: "Власниця",
      role: "owner",
    });
    vi.mocked(getProductRepository).mockReturnValue({
      listByOwnerId: vi.fn(async () => [createProduct()]),
    } as never);

    render(await ProductsPage());

    expect(
      screen.getByRole("heading", { name: "Каталог товарів" }),
    ).toBeVisible();
    expect(screen.getByRole("link", { name: /Створити товар/i })).toBeVisible();
    expect(screen.getByText("Каблучка")).toBeVisible();
    expect(screen.getByText("RING-1")).toBeVisible();
  });
});

function createProduct(): ProductRecord {
  const now = new Date("2026-04-30T00:00:00.000Z");

  return {
    createdAt: now,
    currency: "UAH",
    description: "Срібна каблучка",
    id: "product-1",
    images: [],
    isActive: true,
    name: "Каблучка",
    ownerId: "owner-1",
    priceMinor: 120_00,
    sku: "RING-1",
    stockQuantity: 3,
    updatedAt: now,
  };
}
