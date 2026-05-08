import { expect, type Page, test } from "@playwright/test";

const cookieUrl = process.env.PLAYWRIGHT_BASE_URL ?? "http://127.0.0.1:3000";

test("owner creates an order link and the public page shows selected products", async ({
  page,
}) => {
  await seedSession(page, "owner");
  const stamp = Date.now();
  const sku = `ORDER-E2E-${stamp}`;
  const secondSku = `ORDER-E2E-2-${stamp}`;
  const productName = `Підвіска Playwright ${stamp}`;
  const secondProductName = `Сережки Playwright ${stamp}`;

  await createProduct(page, {
    description: "Срібна підвіска для e2e перевірки",
    imageUrl: "https://example.com/e2e-pendant.jpg",
    name: productName,
    price: "1750",
    sku,
    stock: "8",
  });
  await createProduct(page, {
    description: "Срібні сережки для e2e перевірки",
    imageUrl: "https://example.com/e2e-earrings.jpg",
    name: secondProductName,
    price: "980",
    sku: secondSku,
    stock: "6",
  });

  await expect(page).toHaveURL(/\/dashboard\/products$/);
  const productTable = page.getByTestId("product-desktop-table");
  await expect(productTable.getByText(productName)).toBeVisible();
  await expect(productTable.getByText(secondProductName)).toBeVisible();

  await page.setViewportSize({ height: 844, width: 390 });
  await page.goto("/dashboard/orders/new");
  await expect(
    page.getByRole("heading", { name: "Створити посилання замовлення" }),
  ).toBeVisible();
  await expect(page.getByRole("heading", { name: "Вибір товарів" })).toBeVisible();
  await expectNoHorizontalOverflow(page);
  await page.getByLabel(`Додати ${productName}`).check();
  await page.getByLabel(`Додати ${secondProductName}`).check();
  await page.getByRole("button", { name: "Далі" }).click();
  await expect(page.getByRole("heading", { name: "Кількість" })).toBeVisible();
  await expectNoHorizontalOverflow(page);
  await page
    .getByRole("spinbutton", { name: `Кількість для ${productName}` })
    .fill("2");
  await page
    .getByRole("spinbutton", { name: `Кількість для ${secondProductName}` })
    .fill("3");
  await page.getByRole("button", { name: "Далі" }).click();
  await expect(page.getByRole("heading", { name: "Перевірка" })).toBeVisible();
  await expect(page.getByText(secondProductName)).toBeVisible();
  await expectNoHorizontalOverflow(page);
  await page.getByRole("button", { name: "Створити посилання" }).click();
  await expect(page.getByRole("heading", { name: "Посилання" })).toBeVisible();
  await expectNoHorizontalOverflow(page);

  const publicLinkInput = page.getByRole("textbox", {
    name: "Публічне посилання",
  });
  await expect(publicLinkInput).toHaveValue(/\/o\/[A-Za-z0-9_-]+$/);
  const publicUrl = await publicLinkInput.inputValue();

  await page.goto(publicUrl);
  await expect(
    page.getByRole("heading", { name: "Ваше замовлення" }),
  ).toBeVisible();
  await expect(page.getByText(productName)).toBeVisible();
  await expect(page.getByText(`Артикул: ${sku}`)).toBeVisible();
  await expect(page.getByText("Кількість: 2")).toBeVisible();
  await expect(page.getByText(secondProductName)).toBeVisible();
  await expect(page.getByText(`Артикул: ${secondSku}`)).toBeVisible();
  await expect(page.getByText("Кількість: 3")).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Перейти до доставки й оплати" }),
  ).toBeVisible();
});

async function expectNoHorizontalOverflow(page: Page) {
  await expect
    .poll(() =>
      page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth + 1,
      ),
    )
    .toBe(true);
}

async function createProduct(
  page: Page,
  product: {
    description: string;
    imageUrl: string;
    name: string;
    price: string;
    sku: string;
    stock: string;
  },
) {
  await page.goto("/dashboard/products/new");
  await page.getByLabel("Назва товару").fill(product.name);
  await page.getByLabel("Артикул").fill(product.sku);
  await page.getByLabel("Опис").fill(product.description);
  await page.getByRole("button", { name: "Далі" }).click();
  await page.getByLabel("Ціна, грн").fill(product.price);
  await page.getByRole("textbox", { exact: true, name: "Залишок" }).fill(product.stock);
  await page.getByRole("button", { name: "Далі" }).click();
  await page.getByLabel("URL зображення").fill(product.imageUrl);
  await page.getByRole("button", { name: "Далі" }).click();
  await expect(page.getByRole("heading", { name: "Перевірка" })).toBeVisible();
  await page.getByRole("button", { name: "Створити товар" }).click();
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
