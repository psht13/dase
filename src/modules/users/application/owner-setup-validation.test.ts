import { ownerSetupFormSchema } from "@/modules/users/application/owner-setup-validation";

describe("ownerSetupFormSchema", () => {
  it("returns Ukrainian validation messages", () => {
    const result = ownerSetupFormSchema.safeParse({
      email: "wrong",
      name: "",
      password: "short",
    });

    expect(result.success).toBe(false);

    if (!result.success) {
      expect(result.error.flatten().fieldErrors).toMatchObject({
        email: ["Вкажіть коректну електронну пошту"],
        name: ["Вкажіть ім’я власника"],
        password: ["Пароль має містити щонайменше 8 символів"],
      });
    }
  });
});
