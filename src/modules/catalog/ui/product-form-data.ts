import type { ProductFormValues } from "@/modules/catalog/application/product-validation";

export function productFormValuesFromFormData(
  formData: FormData,
): ProductFormValues {
  const imageUrls = formData
    .getAll("imageUrls")
    .map((value) => ({ url: String(value) }));

  return {
    description: String(formData.get("description") ?? ""),
    imageUrls: imageUrls.length ? imageUrls : [{ url: "" }],
    isActive: parseBooleanFormValue(formData.get("isActive")),
    name: String(formData.get("name") ?? ""),
    price: String(formData.get("price") ?? ""),
    sku: String(formData.get("sku") ?? ""),
    stockQuantity: String(formData.get("stockQuantity") ?? ""),
  };
}

export function productFormValuesToFormData(
  values: ProductFormValues,
): FormData {
  const formData = new FormData();

  formData.set("description", values.description);
  formData.set("isActive", String(values.isActive));
  formData.set("name", values.name);
  formData.set("price", values.price);
  formData.set("sku", values.sku);
  formData.set("stockQuantity", values.stockQuantity);

  for (const image of values.imageUrls) {
    formData.append("imageUrls", image.url);
  }

  return formData;
}

function parseBooleanFormValue(value: FormDataEntryValue | null): boolean {
  return value === "true" || value === "on";
}
