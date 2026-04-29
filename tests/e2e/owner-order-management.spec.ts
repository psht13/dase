import { expect, type Page, test } from "@playwright/test";

const cookieUrl = process.env.PLAYWRIGHT_BASE_URL ?? "http://127.0.0.1:3000";

test("owner filters an order, manages tags, updates status, and sees audit history", async ({
  page,
}) => {
  await seedSession(page, "owner");
  const stamp = Date.now();
  const sku = `MGMT-E2E-${stamp}`;
  const productName = `Сережки керування ${stamp}`;
  const tagName = `Подарунок ${stamp}`;
  const customerName = `Олена Управління ${stamp}`;
  const customerPhone = `+38067${String(stamp).slice(-7)}`;

  await page.goto("/dashboard/products/new");
  await page.getByLabel("Назва товару").fill(productName);
  await page.getByLabel("Артикул").fill(sku);
  await page.getByLabel("Опис").fill("Срібні сережки для e2e перевірки");
  await page.getByLabel("Ціна, грн").fill("2100");
  await page.getByLabel("Залишок").fill("5");
  await page
    .getByLabel("URL зображення")
    .fill("https://example.com/e2e-earrings.jpg");
  await page.getByRole("button", { name: "Створити товар" }).click();
  await expect(page).toHaveURL(/\/dashboard\/products$/);
  await expect(page.getByText(productName)).toBeVisible();

  await page.goto("/dashboard/orders/new");
  await page.getByLabel(`Додати ${productName}`).check();
  await page.getByLabel(`Кількість для ${productName}`).fill("1");
  await page.getByRole("button", { name: "Створити посилання" }).click();
  const publicUrl = await page.getByLabel("Публічне посилання").inputValue();

  await page.goto(publicUrl);
  await page
    .getByRole("link", { name: "Перейти до доставки й оплати" })
    .click();
  await page.getByLabel("Повне ім’я").fill(customerName);
  await page.getByLabel("Телефон").fill(customerPhone);
  await page.getByLabel("Місто або населений пункт").fill("Київ");
  await page.getByRole("button", { name: /Київ.*Київська область/ }).click();
  await page.getByLabel("Відділення або поштове відділення").fill("1");
  await page.getByRole("button", { name: /Відділення №1/ }).click();
  await page.getByLabel("Спосіб оплати").selectOption("CASH_ON_DELIVERY");
  await page.getByRole("button", { name: "Підтвердити замовлення" }).click();
  await expect(
    page.getByText("Замовлення підтверджено. Оплата при отриманні."),
  ).toBeVisible();

  await page.goto("/dashboard/orders");
  await expect(page.getByRole("heading", { name: "Замовлення" })).toBeVisible();
  await expect(page.getByText(customerName)).toBeVisible();
  await page.getByLabel("Пошук").fill(customerPhone.replace(/\D/g, ""));
  await page.getByLabel("Служба доставки").selectOption("NOVA_POSHTA");
  await page.getByLabel("Спосіб оплати").selectOption("CASH_ON_DELIVERY");
  await page.getByRole("button", { name: "Застосувати фільтри" }).click();
  await expect(page.getByText(customerName)).toBeVisible();
  const orderRow = page.getByRole("row", { name: new RegExp(customerName) });
  await expect(orderRow.getByText("Готується відправлення")).toBeVisible();

  await orderRow.getByRole("link", { name: "Відкрити" }).click();
  await expect(page.getByRole("heading", { name: /Замовлення #/ })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Товари" })).toBeVisible();
  await expect(page.getByText(productName)).toBeVisible();
  await expect(page.getByRole("heading", { name: "Аудит подій" })).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Повторити створення відправлення" }),
  ).toBeVisible();

  await page.getByLabel("Новий тег").fill(tagName);
  await page.getByRole("button", { name: "Додати" }).first().click();
  await expect(page.getByRole("status")).toHaveText("Тег додано до замовлення");
  await expect(page.getByLabel(`Зняти тег ${tagName}`)).toBeVisible();

  await page.getByLabel("Новий статус").selectOption("CANCELLED");
  await page.getByRole("button", { name: "Оновити статус" }).click();
  await expect(page.getByText("Статус замовлення оновлено")).toBeVisible();
  await expect(page.getByText("Поточний статус: Скасовано")).toBeVisible();
  await expect(page.getByText("Статус змінено вручну").first()).toBeVisible();

  await page.goto("/dashboard/orders");
  await page.getByLabel("Тег").selectOption({ label: tagName });
  await page.getByRole("button", { name: "Застосувати фільтри" }).click();
  await expect(page.getByText(customerName)).toBeVisible();
  await expect(
    page.getByRole("row", { name: new RegExp(customerName) }).getByText(tagName),
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
