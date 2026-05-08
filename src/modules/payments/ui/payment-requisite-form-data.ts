import type { PaymentRequisiteInput } from "@/modules/payments/application/payment-requisite-validation";

export function paymentRequisiteInputFromFormData(
  formData: FormData,
): PaymentRequisiteInput {
  return {
    bankName: formValue(formData, "bankName"),
    displayValue: formValue(formData, "displayValue"),
    isActive: formData.get("isActive") === "on",
    label: formValue(formData, "label"),
    note: formValue(formData, "note"),
    recipientName: formValue(formData, "recipientName"),
    sortOrder: numberValue(formData, "sortOrder"),
  };
}

function formValue(formData: FormData, key: string): string {
  return String(formData.get(key) ?? "");
}

function numberValue(formData: FormData, key: string): number {
  const value = Number(formData.get(key) ?? 0);

  return Number.isFinite(value) ? value : Number.NaN;
}
