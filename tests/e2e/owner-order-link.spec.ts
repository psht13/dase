import { expect, type Page, test } from "@playwright/test";

const cookieUrl = process.env.PLAYWRIGHT_BASE_URL ?? "http://127.0.0.1:3000";

test("owner creates an order link and the public page shows selected products", async ({
  page,
}) => {
  await seedSession(page, "owner");
  const sku = `ORDER-E2E-${Date.now()}`;
  const productName = `Підвіска Playwright ${Date.now()}`;

  await page.goto("/dashboard/products/new");
  await page.getByLabel("Назва товару").fill(productName);
  await page.getByLabel("Артикул").fill(sku);
  await page.getByLabel("Опис").fill("Срібна підвіска для e2e перевірки");
  await page.getByLabel("Ціна, грн").fill("1750");
  await page.getByLabel("Залишок").fill("8");
  await page
    .getByLabel("URL зображення")
    .fill("https://example.com/e2e-pendant.jpg");
  await page.getByRole("button", { name: "Створити товар" }).click();

  await expect(page).toHaveURL(/\/dashboard\/products$/);
  await expect(page.getByText(productName)).toBeVisible();

  await page.goto("/dashboard/orders/new");
  await expect(
    page.getByRole("heading", { name: "Створити посилання замовлення" }),
  ).toBeVisible();
  await page.getByLabel(`Додати ${productName}`).check();
  await page.getByLabel(`Кількість для ${productName}`).fill("2");
  await page.getByRole("button", { name: "Створити посилання" }).click();

  const publicLinkInput = page.getByLabel("Публічне посилання");
  await expect(publicLinkInput).toHaveValue(/\/o\/[A-Za-z0-9_-]+$/);
  const publicUrl = await publicLinkInput.inputValue();

  await page.goto(publicUrl);
  await expect(
    page.getByRole("heading", { name: "Ваше замовлення" }),
  ).toBeVisible();
  await expect(page.getByText(productName)).toBeVisible();
  await expect(page.getByText(`Артикул: ${sku}`)).toBeVisible();
  await expect(page.getByText("Кількість: 2")).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Перейти до доставки й оплати" }),
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
