import { z } from "zod";

export const ownerSetupFormSchema = z.object({
  email: z.email("Вкажіть коректну електронну пошту"),
  name: z.string().trim().min(2, "Вкажіть ім’я власника"),
  password: z
    .string()
    .min(8, "Пароль має містити щонайменше 8 символів")
    .max(128, "Пароль має містити не більше 128 символів"),
  setupToken: z.string().optional(),
});

export type OwnerSetupFormValues = z.infer<typeof ownerSetupFormSchema>;
