import { safeParsePaymentRequisiteInput } from "@/modules/payments/application/payment-requisite-validation";

describe("payment requisite validation", () => {
  it("accepts owner-provided card, IBAN, or payment details without strict card validation", () => {
    const result = safeParsePaymentRequisiteInput({
      bankName: "ПриватБанк",
      displayValue: "UA12 3456 7890 1234 5678 9012 345",
      isActive: true,
      label: "Основна картка",
      note: "",
      recipientName: "Олена Петренко",
      sortOrder: 1,
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.note).toBeNull();
      expect(result.data.displayValue).toBe(
        "UA12 3456 7890 1234 5678 9012 345",
      );
    }
  });

  it("requires label and display value with Ukrainian errors", () => {
    const result = safeParsePaymentRequisiteInput({
      bankName: "",
      displayValue: "",
      isActive: true,
      label: "",
      note: "",
      recipientName: "",
      sortOrder: 0,
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      const errors = result.error.flatten().fieldErrors;

      expect(errors.label).toContain("Вкажіть назву реквізитів");
      expect(errors.displayValue).toContain(
        "Вкажіть номер картки, IBAN або реквізити",
      );
    }
  });

  it("limits text field lengths", () => {
    const result = safeParsePaymentRequisiteInput({
      bankName: "Б".repeat(81),
      displayValue: "4".repeat(121),
      isActive: true,
      label: "Н".repeat(81),
      note: "П".repeat(241),
      recipientName: "О".repeat(121),
      sortOrder: -1,
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      const errors = result.error.flatten().fieldErrors;

      expect(errors.label).toContain("Назва має бути до 80 символів");
      expect(errors.displayValue).toContain(
        "Реквізити мають бути до 120 символів",
      );
      expect(errors.sortOrder).toContain("Порядок не може бути від’ємним");
    }
  });
});
