import { expect, type Page, test } from "@playwright/test";

const cookieUrl = process.env.PLAYWRIGHT_BASE_URL ?? "http://127.0.0.1:3000";

test("owner creates a product from the dashboard catalog", async ({ page }) => {
  await seedSession(page, "owner");
  const sku = `RING-E2E-${Date.now()}`;
  const productName = `Каблучка Playwright ${Date.now()}`;

  await page.goto("/dashboard/products");
  await expect(
    page.getByRole("heading", { name: "Каталог товарів" }),
  ).toBeVisible();
  await page.keyboard.press("Tab");
  await expect(
    page.getByRole("link", { name: "Перейти до основного вмісту" }),
  ).toBeFocused();

  await page.getByRole("link", { name: "Створити товар" }).click();
  await page.getByRole("button", { name: "Створити товар" }).click();
  await expect(page.getByText("Вкажіть назву товару")).toBeVisible();
  await expect(page.getByText("Вкажіть артикул")).toBeVisible();
  await expect(
    page.getByText("Додайте посилання на зображення", { exact: true }),
  ).toBeVisible();

  await page.getByLabel("Назва товару").fill(productName);
  await page.getByLabel("Артикул").fill(sku);
  await page.getByLabel("Опис").fill("Срібна каблучка для e2e перевірки");
  await page.getByLabel("Ціна, грн").fill("1499,50");
  await page.getByLabel("Залишок").fill("4");
  await page
    .getByLabel("URL зображення")
    .fill("https://example.com/e2e-ring.jpg");
  await page.getByRole("button", { name: "Створити товар" }).click();

  await expect(page).toHaveURL(/\/dashboard\/products$/);
  const productRow = page.getByRole("row", {
    name: new RegExp(`${productName}.*${sku}`),
  });
  await expect(productRow).toBeVisible();
  await expect(productRow.getByText("Активний")).toBeVisible();
});

test("user role cannot access the owner dashboard", async ({ page }) => {
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
