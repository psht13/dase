import { expect, type Page, test } from "@playwright/test";

const cookieUrl = process.env.PLAYWRIGHT_BASE_URL ?? "http://127.0.0.1:3000";

test("customer completes a mocked MonoPay payment success flow", async ({
  page,
}) => {
  await seedSession(page, "owner");
  const sku = `MONO-E2E-${Date.now()}`;
  const productName = `Підвіска MonoPay ${Date.now()}`;

  await page.goto("/dashboard/products/new");
  await page.getByLabel("Назва товару").fill(productName);
  await page.getByLabel("Артикул").fill(sku);
  await page.getByLabel("Опис").fill("Срібна підвіска для MonoPay e2e");
  await page.getByLabel("Ціна, грн").fill("1890");
  await page.getByLabel("Залишок").fill("3");
  await page
    .getByLabel("URL зображення")
    .fill("https://example.com/e2e-pendant.jpg");
  await page.getByRole("button", { name: "Створити товар" }).click();

  await page.goto("/dashboard/orders/new");
  await page.getByLabel(`Додати ${productName}`).check();
  await page.getByLabel(`Кількість для ${productName}`).fill("1");
  await page.getByRole("button", { name: "Створити посилання" }).click();

  const publicUrl = await page.getByLabel("Публічне посилання").inputValue();

  await page.goto(publicUrl);
  await page
    .getByRole("link", { name: "Перейти до доставки й оплати" })
    .click();
  await page.getByLabel("Повне ім’я").fill("Олена Петренко");
  await page.getByLabel("Телефон").fill("+380671234567");
  await page.getByLabel("Місто або населений пункт").fill("Київ");
  await page.getByRole("button", { name: /Київ.*Київська область/ }).click();
  await page.getByLabel("Відділення або поштове відділення").fill("1");
  await page.getByRole("button", { name: /Відділення №1/ }).click();
  await page.getByLabel("Спосіб оплати").selectOption("MONOBANK");
  await page.getByRole("button", { name: "Підтвердити замовлення" }).click();

  await page.waitForURL(/payment=monobank/);
  const redirectedUrl = new URL(page.url());
  const invoiceId = redirectedUrl.searchParams.get("invoiceId");

  expect(invoiceId).toMatch(/^e2e-/);
  await expect(
    page.getByText("Очікуємо підтвердження оплати MonoPay."),
  ).toBeVisible();

  const webhookResponse = await page.request.post("/api/webhooks/monobank", {
    data: {
      amount: 1890_00,
      ccy: 980,
      finalAmount: 1890_00,
      invoiceId,
      modifiedDate: "2026-04-30T12:00:00.000Z",
      status: "success",
    },
    headers: {
      "x-sign": "fixture-valid",
    },
  });

  expect(webhookResponse.ok()).toBe(true);
  await page.goto(redirectedUrl.pathname);
  await expect(
    page.getByText("Оплату MonoPay успішно підтверджено."),
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
