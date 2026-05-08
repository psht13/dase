export type PaymentRequisiteActionState = {
  fieldErrors?: Record<string, string[]>;
  message: string;
  ok: boolean;
};

export const initialPaymentRequisiteActionState: PaymentRequisiteActionState = {
  fieldErrors: {},
  message: "",
  ok: false,
};
