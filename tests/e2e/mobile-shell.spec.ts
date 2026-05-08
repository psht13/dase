import { expect, test } from "@playwright/test";
import {
  createProduct,
  createPublicOrderLink,
  expectNoHorizontalOverflow,
  seedSession,
} from "./helpers";

test("mobile dashboard shell shows Ukrainian navigation and reliable logout", async ({
  page,
}) => {
  await page.setViewportSize({ height: 740, width: 360 });
  await seedSession(page, "owner");

  await page.goto("/dashboard");

  await expect(
    page.getByRole("heading", { name: "Панель власника" }),
  ).toBeVisible();
  await expect(page.getByText("Поточний розділ")).toBeVisible();
  await expect(
    page.getByRole("link", { exact: true, name: "Огляд" }),
  ).toBeVisible();
  await expect(page.getByTestId("mobile-dashboard-nav")).toBeVisible();
  await expect(
    page.getByRole("link", { exact: true, name: "Каталог товарів" }),
  ).toBeVisible();
  await expectNoHorizontalOverflow(page);

  await page.getByRole("link", { exact: true, name: "Каталог товарів" }).click();
  await expect(page).toHaveURL(/\/dashboard\/products$/);
  await expect(
    page.getByRole("heading", { name: "Каталог товарів" }),
  ).toBeVisible();
  await expect(page.getByText("Поточний розділ")).toBeVisible();
  await expectNoHorizontalOverflow(page);

  const logoutButton = page.getByRole("button", { name: "Вийти" });
  const logoutForm = page.locator('form[action="/logout"][method="post"]');

  await expect(logoutForm).toHaveCount(2);
  await expect(page.locator('a[href="/logout"]')).toHaveCount(0);
  await logoutButton.click();
  await expect(page).toHaveURL(/\/login\?logout=1$/);
  await expect(page.getByText("Ви вийшли з кабінету.")).toBeVisible();
});

test("public pages do not overflow at 360px", async ({ page }) => {
  await seedSession(page, "owner");
  const stamp = Date.now();
  const productName = `Мобільна обручка ${stamp}`;

  await createProduct(page, {
    description: "Товар для мобільної перевірки",
    imageUrl: "https://example.com/e2e-mobile-ring.jpg",
    name: productName,
    price: "1900",
    sku: `MOBILE-E2E-${stamp}`,
    stock: "6",
  });
  const publicUrl = await createPublicOrderLink(page, { productName });

  await page.setViewportSize({ height: 740, width: 360 });

  for (const path of ["/", "/login", "/setup", publicUrl, `${publicUrl}/delivery`]) {
    await page.goto(path);
    await expectNoHorizontalOverflow(page);
  }
});

test("product create and edit forms do not overflow at 360px", async ({
  page,
}) => {
  await page.setViewportSize({ height: 740, width: 360 });
  await seedSession(page, "owner");
  const stamp = Date.now();
  const sku = `MOBILE-FORM-${stamp}`;
  const productName = `Мобільна форма ${stamp}`;

  await page.goto("/dashboard/products/new");
  await expect(page.getByRole("heading", { name: "Новий товар" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Основне" })).toBeVisible();
  await expectNoHorizontalOverflow(page);

  await page.getByLabel("Назва товару").fill(productName);
  await page.getByLabel("Артикул").fill(sku);
  await page.getByLabel("Опис").fill("Товар для перевірки кроків");
  await page.getByRole("button", { name: "Далі" }).click();
  await expect(
    page.getByRole("heading", { name: "Ціна та залишок" }),
  ).toBeVisible();
  await expectNoHorizontalOverflow(page);

  await page.getByLabel("Ціна, грн").fill("2050");
  await page
    .getByRole("textbox", { exact: true, name: "Залишок" })
    .fill("5");
  await page.getByRole("button", { name: "Далі" }).click();
  await expect(page.getByRole("heading", { name: "Зображення" })).toBeVisible();
  await expectNoHorizontalOverflow(page);

  await page
    .getByLabel("URL зображення")
    .fill("https://example.com/mobile-form-ring.jpg");
  await expect(page.getByAltText("Зображення товару 1")).toBeVisible();
  await expectNoHorizontalOverflow(page);
  await page.getByRole("button", { name: "Далі" }).click();

  await expect(page.getByRole("heading", { name: "Перевірка" })).toBeVisible();
  await expect(page.getByText(productName)).toBeVisible();
  await expectNoHorizontalOverflow(page);
  await page.getByRole("button", { name: "Створити товар" }).click();
  await expect(page).toHaveURL(/\/dashboard\/products$/);

  const productCard = page
    .getByTestId("product-mobile-card")
    .filter({ hasText: productName })
    .first();
  await expect(productCard).toBeVisible();
  const editHref = await productCard
    .getByRole("link", { name: "Редагувати" })
    .getAttribute("href");

  if (!editHref) {
    throw new Error("Expected product edit link to be available");
  }

  await page.goto(editHref);
  await expect(
    page.getByRole("heading", { name: "Редагування товару" }),
  ).toBeVisible();
  await expect(page.getByLabel("Назва товару")).toHaveValue(productName);
  await expectNoHorizontalOverflow(page);
});
