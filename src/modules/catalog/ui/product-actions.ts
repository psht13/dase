"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import {
  createProductUseCase,
  ProductSkuAlreadyExistsError,
} from "@/modules/catalog/application/create-product";
import {
  ProductNotFoundError,
  setProductActiveUseCase,
  updateProductUseCase,
} from "@/modules/catalog/application/update-product";
import { safeParseProductFormValues } from "@/modules/catalog/application/product-validation";
import { getProductRepository } from "@/modules/catalog/infrastructure/product-repository-factory";
import { productFormValuesFromFormData } from "@/modules/catalog/ui/product-form-data";
import { requireOwnerSession } from "@/modules/users/ui/require-owner-session";

export type ProductActionResult =
  | {
      message: string;
      ok: false;
      fieldErrors?: Record<string, string[]>;
    }
  | {
      message: string;
      ok: true;
      redirectTo: string;
    };

export async function createProductAction(
  formData: FormData,
): Promise<ProductActionResult> {
  const owner = await requireOwnerSession();
  const parsed = safeParseProductFormValues(
    productFormValuesFromFormData(formData),
  );

  if (!parsed.success) {
    return validationErrorResult(parsed.error);
  }

  try {
    await createProductUseCase(
      {
        ...parsed.data,
        ownerId: owner.id,
      },
      { productRepository: getProductRepository() },
    );
  } catch (error) {
    return productMutationErrorResult(error);
  }

  revalidatePath("/dashboard/products");

  return {
    message: "Товар створено",
    ok: true,
    redirectTo: "/dashboard/products",
  };
}

export async function updateProductAction(
  productId: string,
  formData: FormData,
): Promise<ProductActionResult> {
  const owner = await requireOwnerSession();
  const parsed = safeParseProductFormValues(
    productFormValuesFromFormData(formData),
  );

  if (!parsed.success) {
    return validationErrorResult(parsed.error);
  }

  try {
    await updateProductUseCase(
      {
        ...parsed.data,
        ownerId: owner.id,
        productId,
      },
      { productRepository: getProductRepository() },
    );
  } catch (error) {
    return productMutationErrorResult(error);
  }

  revalidatePath("/dashboard/products");
  revalidatePath(`/dashboard/products/${productId}/edit`);

  return {
    message: "Товар оновлено",
    ok: true,
    redirectTo: "/dashboard/products",
  };
}

export async function toggleProductActiveAction(
  productId: string,
  isActive: boolean,
): Promise<void> {
  const owner = await requireOwnerSession();

  await setProductActiveUseCase(
    {
      isActive,
      ownerId: owner.id,
      productId,
    },
    { productRepository: getProductRepository() },
  );

  revalidatePath("/dashboard/products");
}

function validationErrorResult(
  error: z.ZodError,
): Extract<ProductActionResult, { ok: false }> {
  const flattenedFieldErrors = error.flatten().fieldErrors as Record<
    string,
    string[] | undefined
  >;
  const fieldErrors = Object.fromEntries(
    Object.entries(flattenedFieldErrors).map(([field, messages = []]) => [
      field,
      messages.filter(Boolean),
    ]),
  );

  return {
    fieldErrors,
    message: "Перевірте дані товару",
    ok: false,
  };
}

function productMutationErrorResult(
  error: unknown,
): Extract<ProductActionResult, { ok: false }> {
  if (error instanceof ProductSkuAlreadyExistsError) {
    return {
      message: "Товар з таким артикулом уже існує",
      ok: false,
    };
  }

  if (error instanceof ProductNotFoundError) {
    return {
      message: "Товар не знайдено",
      ok: false,
    };
  }

  throw error;
}
