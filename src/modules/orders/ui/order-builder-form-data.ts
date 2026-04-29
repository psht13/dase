import type { CreateOrderDraftItemInput } from "@/modules/orders/application/create-order-draft";

const selectedProductFieldName = "productId";
const quantityFieldPrefix = "quantity:";

export function orderBuilderItemsFromFormData(
  formData: FormData,
): CreateOrderDraftItemInput[] {
  return formData
    .getAll(selectedProductFieldName)
    .map((value) => String(value))
    .filter(Boolean)
    .map((productId) => ({
      productId,
      quantity: Number(formData.get(`${quantityFieldPrefix}${productId}`)),
    }));
}

export function appendOrderBuilderItemToFormData(
  formData: FormData,
  item: CreateOrderDraftItemInput,
): void {
  formData.append(selectedProductFieldName, item.productId);
  formData.set(`${quantityFieldPrefix}${item.productId}`, String(item.quantity));
}
