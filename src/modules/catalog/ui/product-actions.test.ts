import { revalidatePath } from "next/cache";
import { InMemoryProductRepository } from "@/modules/catalog/infrastructure/in-memory-product-repository";
import { getProductRepository } from "@/modules/catalog/infrastructure/product-repository-factory";
import {
  createProductAction,
  toggleProductActiveAction,
  updateProductAction,
} from "./product-actions";
import { requireOwnerSession } from "@/modules/users/ui/require-owner-session";

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

vi.mock("@/modules/users/ui/require-owner-session", () => ({
  requireOwnerSession: vi.fn(),
}));

vi.mock("@/modules/catalog/infrastructure/product-repository-factory", () => ({
  getProductRepository: vi.fn(),
}));

describe("product server actions", () => {
  let repository: InMemoryProductRepository;

  beforeEach(() => {
    repository = new InMemoryProductRepository();
    vi.mocked(requireOwnerSession).mockResolvedValue({
      email: "owner@example.com",
      id: "owner-1",
      name: "Власниця",
      role: "owner",
    });
    vi.mocked(getProductRepository).mockReturnValue(repository);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("returns Ukrainian validation feedback for invalid product data", async () => {
    const result = await createProductAction(new FormData());

    expect(result).toMatchObject({
      message: "Перевірте дані товару",
      ok: false,
    });
    expect(await repository.listByOwnerId("owner-1")).toHaveLength(0);
  });

  it("creates a product for the current owner", async () => {
    const result = await createProductAction(createFormData());

    expect(result).toEqual({
      message: "Товар створено",
      ok: true,
      redirectTo: "/dashboard/products",
    });
    await expect(repository.listByOwnerId("owner-1")).resolves.toHaveLength(1);
    expect(revalidatePath).toHaveBeenCalledWith("/dashboard/products");
  });

  it("updates and toggles an owner product", async () => {
    const created = await createProductAction(createFormData());
    expect(created.ok).toBe(true);
    const [product] = await repository.listByOwnerId("owner-1");
    const updateFormData = createFormData({
      name: "Оновлена каблучка",
      sku: "RING-2",
    });

    await expect(
      updateProductAction(product.id, updateFormData),
    ).resolves.toMatchObject({
      message: "Товар оновлено",
      ok: true,
    });
    await expect(
      toggleProductActiveAction(product.id, false),
    ).resolves.toBeUndefined();

    await expect(repository.findById(product.id)).resolves.toMatchObject({
      isActive: false,
      name: "Оновлена каблучка",
      sku: "RING-2",
    });
  });
});

function createFormData(overrides: Partial<Record<string, string>> = {}) {
  const formData = new FormData();

  formData.set("description", overrides.description ?? "Срібна каблучка");
  formData.set("imageUrls", overrides.imageUrls ?? "https://example.com/ring.jpg");
  formData.set("isActive", overrides.isActive ?? "true");
  formData.set("name", overrides.name ?? "Каблучка");
  formData.set("price", overrides.price ?? "1200");
  formData.set("sku", overrides.sku ?? "RING-1");
  formData.set("stockQuantity", overrides.stockQuantity ?? "3");

  return formData;
}
