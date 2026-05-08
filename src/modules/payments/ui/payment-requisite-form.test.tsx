import { render, screen } from "@testing-library/react";
import * as React from "react";
import { initialPaymentRequisiteActionState } from "@/modules/payments/ui/payment-requisite-action-state";
import { PaymentRequisiteForm } from "@/modules/payments/ui/payment-requisite-form";

vi.mock("react", async () => {
  const actual = await vi.importActual<typeof import("react")>("react");

  return {
    ...actual,
    useActionState: vi.fn(),
  };
});

describe("PaymentRequisiteForm", () => {
  beforeEach(() => {
    vi.mocked(React.useActionState).mockReturnValue([
      initialPaymentRequisiteActionState,
      vi.fn(),
      false,
    ] as never);
  });

  it("renders Ukrainian labels for owner payment requisite settings", () => {
    render(<PaymentRequisiteForm action={vi.fn()} mode="create" />);

    expect(screen.getByLabelText("Назва")).toBeVisible();
    expect(screen.getByLabelText("Банк")).toBeVisible();
    expect(screen.getByLabelText("Отримувач")).toBeVisible();
    expect(
      screen.getByLabelText("Номер картки, IBAN або реквізити"),
    ).toBeVisible();
    expect(screen.getByLabelText("Примітка")).toBeVisible();
    expect(
      screen.getByRole("checkbox", { name: /Активні реквізити/ }),
    ).toBeChecked();
    expect(
      screen.getByRole("button", { name: "Додати реквізити" }),
    ).toBeVisible();
  });

  it("shows Ukrainian validation feedback from the server action state", () => {
    vi.mocked(React.useActionState).mockReturnValue([
      {
        fieldErrors: {
          displayValue: ["Вкажіть номер картки, IBAN або реквізити"],
          label: ["Вкажіть назву реквізитів"],
        },
        message: "Перевірте реквізити",
        ok: false,
      },
      vi.fn(),
      false,
    ] as never);

    render(<PaymentRequisiteForm action={vi.fn()} mode="create" />);

    expect(screen.getByText("Перевірте реквізити")).toBeVisible();
    expect(screen.getByText("Вкажіть назву реквізитів")).toBeVisible();
    expect(
      screen.getByText("Вкажіть номер картки, IBAN або реквізити"),
    ).toBeVisible();
  });
});
