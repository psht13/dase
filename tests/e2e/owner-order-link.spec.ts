import { expect, test } from "@playwright/test";
import {
  createProduct,
  expectNoHorizontalOverflow,
  seedSession,
} from "./helpers";

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
