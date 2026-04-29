import { render, screen } from "@testing-library/react";
import type { ProductRecord } from "@/modules/catalog/application/product-repository";
import { getProductRepository } from "@/modules/catalog/infrastructure/product-repository-factory";
import { requireOwnerSession } from "@/modules/users/ui/require-owner-session";
import EditProductPage from "./page";

vi.mock("@/modules/users/ui/require-owner-session", () => ({
  requireOwnerSession: vi.fn(),
}));

vi.mock("@/modules/catalog/infrastructure/product-repository-factory", () => ({
  getProductRepository: vi.fn(),
}));

vi.mock("@/modules/catalog/ui/product-form", () => ({
  ProductForm: () => <div>Форма редагування</div>,
}));

describe("EditProductPage", () => {
  beforeEach(() => {
    vi.mocked(requireOwnerSession).mockResolvedValue({
      email: "owner@example.com",
      id: "owner-1",
      name: "Власниця",
      role: "owner",
    });
  });

  it("renders an owner product edit form", async () => {
    vi.mocked(getProductRepository).mockReturnValue({
      findById: vi.fn(async () => createProduct("owner-1")),
    } as never);

    render(
      await EditProductPage({
        params: Promise.resolve({ productId: "product-1" }),
      }),
    );

    expect(
      screen.getByRole("heading", { name: "Редагування товару" }),
    ).toBeVisible();
    expect(screen.getByText("Каблучка")).toBeVisible();
    expect(screen.getByText("Форма редагування")).toBeVisible();
  });

  it("renders a Ukrainian not found state for another owner's product", async () => {
    vi.mocked(getProductRepository).mockReturnValue({
      findById: vi.fn(async () => createProduct("owner-2")),
    } as never);

    render(
      await EditProductPage({
        params: Promise.resolve({ productId: "product-1" }),
      }),
    );

    expect(
      screen.getByRole("heading", { name: "Товар не знайдено" }),
    ).toBeVisible();
    expect(screen.getByRole("link", { name: "До каталогу" })).toBeVisible();
  });
});

function createProduct(ownerId: string): ProductRecord {
  const now = new Date("2026-04-30T00:00:00.000Z");

  return {
    createdAt: now,
    currency: "UAH",
    description: "Срібна каблучка",
    id: "product-1",
    images: [],
    isActive: true,
    name: "Каблучка",
    ownerId,
    priceMinor: 120_00,
    sku: "RING-1",
    stockQuantity: 3,
    updatedAt: now,
  };
}
