import type { DeliveryFormValues } from "@/modules/orders/application/delivery-form-validation";

export const emptyDeliveryFormValues: DeliveryFormValues = {
  carrier: "NOVA_POSHTA",
  cityId: "",
  cityName: "",
  fullName: "",
  paymentMethod: "MONOBANK",
  phone: "+380",
  warehouseAddress: "",
  warehouseId: "",
  warehouseName: "",
};

export function deliveryFormValuesFromFormData(
  formData: FormData,
): DeliveryFormValues {
  return {
    carrier: String(formData.get("carrier") ?? ""),
    cityId: String(formData.get("cityId") ?? ""),
    cityName: String(formData.get("cityName") ?? ""),
    fullName: String(formData.get("fullName") ?? ""),
    paymentMethod: String(formData.get("paymentMethod") ?? ""),
    phone: String(formData.get("phone") ?? ""),
    warehouseAddress: String(formData.get("warehouseAddress") ?? ""),
    warehouseId: String(formData.get("warehouseId") ?? ""),
    warehouseName: String(formData.get("warehouseName") ?? ""),
  };
}

export function deliveryFormValuesToFormData(
  values: DeliveryFormValues,
): FormData {
  const formData = new FormData();

  formData.set("carrier", values.carrier);
  formData.set("cityId", values.cityId);
  formData.set("cityName", values.cityName);
  formData.set("fullName", values.fullName);
  formData.set("paymentMethod", values.paymentMethod);
  formData.set("phone", values.phone);
  formData.set("warehouseAddress", values.warehouseAddress);
  formData.set("warehouseId", values.warehouseId);
  formData.set("warehouseName", values.warehouseName);

  return formData;
}
