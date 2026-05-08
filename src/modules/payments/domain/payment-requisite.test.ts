import { maskPaymentRequisiteDisplayValue } from "@/modules/payments/domain/payment-requisite";

describe("payment requisite display helpers", () => {
  it("masks card-like values for owner lists", () => {
    expect(maskPaymentRequisiteDisplayValue("4441 1111 2222 3333")).toBe(
      "•••• 3333",
    );
  });

  it("keeps short non-card details readable", () => {
    expect(maskPaymentRequisiteDisplayValue("IBAN")).toBe("IBAN");
  });
});
