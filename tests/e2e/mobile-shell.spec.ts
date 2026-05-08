import { expect, type Page, test } from "@playwright/test";

const cookieUrl = process.env.PLAYWRIGHT_BASE_URL ?? "http://127.0.0.1:3000";

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
  const publicUrl = await createPublicOrderLink(page);

  await page.setViewportSize({ height: 740, width: 360 });

  for (const path of ["/", "/login", "/setup", publicUrl, `${publicUrl}/delivery`]) {
    await page.goto(path);
    await expectNoHorizontalOverflow(page);
  }
});

async function createPublicOrderLink(page: Page) {
  await seedSession(page, "owner");
  const sku = `MOBILE-E2E-${Date.now()}`;
  const productName = `Мобільна обручка ${Date.now()}`;

  await page.goto("/dashboard/products/new");
  await page.getByLabel("Назва товару").fill(productName);
  await page.getByLabel("Артикул").fill(sku);
  await page.getByLabel("Опис").fill("Товар для мобільної перевірки");
  await page.getByLabel("Ціна, грн").fill("1900");
  await page.getByLabel("Залишок").fill("6");
  await page
    .getByLabel("URL зображення")
    .fill("https://example.com/e2e-mobile-ring.jpg");
  await page.getByRole("button", { name: "Створити товар" }).click();
  await expect(page).toHaveURL(/\/dashboard\/products$/);

  await page.goto("/dashboard/orders/new");
  await page.getByLabel(`Додати ${productName}`).check();
  await page.getByLabel(`Кількість для ${productName}`).fill("1");
  await page.getByRole("button", { name: "Створити посилання" }).click();

  return page.getByLabel("Публічне посилання").inputValue();
}

async function expectNoHorizontalOverflow(page: Page) {
  await expect
    .poll(() =>
      page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth + 1,
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
