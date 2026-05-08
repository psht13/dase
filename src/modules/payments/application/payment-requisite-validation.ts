import { z } from "zod";

export const paymentRequisiteInputSchema = z.object({
  bankName: optionalText(80, "Назва банку має бути до 80 символів"),
  displayValue: z
    .string()
    .trim()
    .min(1, "Вкажіть номер картки, IBAN або реквізити")
    .max(120, "Реквізити мають бути до 120 символів"),
  isActive: z.boolean(),
  label: z
    .string()
    .trim()
    .min(1, "Вкажіть назву реквізитів")
    .max(80, "Назва має бути до 80 символів"),
  note: optionalText(240, "Примітка має бути до 240 символів"),
  recipientName: optionalText(120, "Ім’я отримувача має бути до 120 символів"),
  sortOrder: z
    .number()
    .int("Порядок має бути цілим числом")
    .min(0, "Порядок не може бути від’ємним")
    .max(10_000, "Порядок має бути до 10000"),
});

export type PaymentRequisiteInput = z.infer<
  typeof paymentRequisiteInputSchema
>;

export function safeParsePaymentRequisiteInput(input: unknown):
  | {
      data: PaymentRequisiteInput;
      success: true;
    }
  | {
      error: z.ZodError<PaymentRequisiteInput>;
      success: false;
    } {
  return paymentRequisiteInputSchema.safeParse(input);
}

function optionalText(maxLength: number, message: string) {
  return z
    .string()
    .trim()
    .max(maxLength, message)
    .transform((value) => value || null);
}
