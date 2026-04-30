import { expect, type Page, test } from "@playwright/test";

const cookieUrl = process.env.PLAYWRIGHT_BASE_URL ?? "http://127.0.0.1:3000";

test("login page shows Ukrainian owner labels", async ({ page }) => {
  await page.goto("/login");

  await expect(
    page.getByRole("heading", { name: "Вхід до кабінету" }),
  ).toBeVisible();
  await expect(page.getByLabel("Електронна пошта")).toBeVisible();
  await expect(page.getByLabel("Пароль")).toBeVisible();
  await expect(page.getByRole("button", { name: "Увійти" })).toBeVisible();
});

test("owner can access dashboard and user cannot", async ({ page }) => {
  await seedSession(page, "owner");
  await page.goto("/dashboard");

  await expect(
    page.getByRole("heading", { name: "Панель власника" }),
  ).toBeVisible();
  await expect(page.getByText("Роль: власник")).toBeVisible();

  await page.context().clearCookies();
  await seedSession(page, "user");
  await page.goto("/dashboard");

  await expect(page).toHaveURL("/");
  await expect(
    page.getByRole("heading", {
      name: "Підтвердження замовлень для ювелірних продавців",
    }),
  ).toBeVisible();
});

async function seedSession(page: Page, role: "owner" | "user") {
  await page.context().addCookies([
    {
      name: "dase_e2e_role",
      url: cookieUrl,
      value: role,
    },
    {
      name: "dase_e2e_user_id",
      url: cookieUrl,
      value:
        role === "owner"
          ? "00000000-0000-4000-8000-000000000001"
          : "00000000-0000-4000-8000-000000000002",
    },
    {
      name: "dase_e2e_email",
      url: cookieUrl,
      value: `${role}@example.com`,
    },
  ]);
}
