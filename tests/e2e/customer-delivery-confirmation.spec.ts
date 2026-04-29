import { expect, type Page, test } from "@playwright/test";

const cookieUrl = process.env.PLAYWRIGHT_BASE_URL ?? "http://127.0.0.1:3000";

test("customer confirms delivery with mocked carrier lookup", async ({ page }) => {
  await seedSession(page, "owner");
  const sku = `DELIVERY-E2E-${Date.now()}`;
  const productName = `Каблучка доставка ${Date.now()}`;

  await page.goto("/dashboard/products/new");
  await page.getByLabel("Назва товару").fill(productName);
  await page.getByLabel("Артикул").fill(sku);
  await page.getByLabel("Опис").fill("Срібна каблучка для e2e перевірки");
  await page.getByLabel("Ціна, грн").fill("1450");
  await page.getByLabel("Залишок").fill("4");
  await page
    .getByLabel("URL зображення")
    .fill("https://example.com/e2e-ring.jpg");
  await page.getByRole("button", { name: "Створити товар" }).click();
  await expect(page).toHaveURL(/\/dashboard\/products$/);
  await expect(page.getByText(productName)).toBeVisible();

  await page.goto("/dashboard/orders/new");
  await page.getByLabel(`Додати ${productName}`).check();
  await page.getByLabel(`Кількість для ${productName}`).fill("1");
  await page.getByRole("button", { name: "Створити посилання" }).click();

  const publicUrl = await page.getByLabel("Публічне посилання").inputValue();

  await page.setViewportSize({ height: 844, width: 390 });
  await page.goto(publicUrl);
  await expect(page.getByRole("heading", { name: "Ваше замовлення" })).toBeVisible();
  await expect(page.getByText(productName)).toBeVisible();
  await expectNoHorizontalOverflow(page);
  await page
    .getByRole("link", { name: "Перейти до доставки й оплати" })
    .click();
  await expect(
    page.getByRole("heading", { name: "Доставка та оплата" }),
  ).toBeVisible();
  await expect(page.getByLabel("Повне ім’я")).toBeVisible();
  await expect(page.getByLabel("Місто або населений пункт")).toBeVisible();
  await expect(page.getByLabel("Спосіб оплати")).toBeVisible();
  await expectNoHorizontalOverflow(page);

  await page.getByLabel("Повне ім’я").fill("Олена Петренко");
  await page.getByLabel("Телефон").fill("+380671234567");
  await page.getByLabel("Місто або населений пункт").fill("Київ");
  await page.getByRole("button", { name: /Київ.*Київська область/ }).click();
  await page.getByLabel("Відділення або поштове відділення").fill("1");
  await page.getByRole("button", { name: /Відділення №1/ }).click();
  await page.getByLabel("Спосіб оплати").selectOption("CASH_ON_DELIVERY");
  await page.getByRole("button", { name: "Підтвердити замовлення" }).click();

  await expect(
    page.getByText("Замовлення підтверджено. Оплата при отриманні."),
  ).toBeVisible();
});

async function expectNoHorizontalOverflow(page: Page) {
  await expect
    .poll(() =>
      page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    )
    .toBe(true);
}

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
