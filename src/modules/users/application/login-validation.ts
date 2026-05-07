import { z } from "zod";

export const ownerLoginFormSchema = z.object({
  email: z.email("Вкажіть коректну електронну пошту"),
  password: z.string().min(1, "Вкажіть пароль"),
});

export type OwnerLoginFormValues = z.infer<typeof ownerLoginFormSchema>;
