import { expect, test } from "@playwright/test";

test("owner setup and real login persist across dashboard navigation", async ({
  page,
  request,
}) => {
  await request.post("/api/test/reset");

  const suffix = Date.now();
  const email = `owner-${suffix}@example.com`;
  const password = "Secure-password-123";

  await page.goto("/setup");
  await expect(
    page.getByRole("heading", { name: "Створення першого власника" }),
  ).toBeVisible();
  await expect(page.getByLabel("Токен налаштування")).toHaveCount(0);

  await page.getByLabel("Ім’я власника").fill("Олена");
  await page.getByLabel("Електронна пошта").fill(email);
  await page.getByLabel("Пароль").fill(password);
  await page.getByRole("button", { name: "Створити власника" }).click();

  await expect(page).toHaveURL(/\/login\?setup=created$/);
  await expect(
    page.getByText("Першого власника створено. Увійдіть із новими даними."),
  ).toBeVisible();

  await page.goto("/dashboard");
  await expect(page).toHaveURL(/\/login$/);

  await page.goto("/setup");
  await expect(
    page.getByRole("heading", { name: "Налаштування недоступне" }),
  ).toBeVisible();
  await expect(page.getByText(/Перший власник уже створений/i)).toBeVisible();

  await page.goto("/login");
  await page.getByLabel("Електронна пошта").fill(email);
  await page.getByLabel("Пароль").fill(password);
  await page.getByRole("button", { name: "Увійти" }).click();

  await expect(page).toHaveURL(/\/dashboard$/);
  await expect(
    page.getByRole("heading", { name: "Панель власника" }),
  ).toBeVisible();
  await expect(page.getByText("Роль: власник")).toBeVisible();

  const navigation = page.locator("aside");

  await navigation
    .getByRole("link", { exact: true, name: "Каталог товарів" })
    .click();
  await expect(page).toHaveURL(/\/dashboard\/products$/);
  await expect(
    page.getByRole("heading", { name: "Каталог товарів" }),
  ).toBeVisible();

  await navigation.getByRole("link", { exact: true, name: "Замовлення" }).click();
  await expect(page).toHaveURL(/\/dashboard\/orders$/);
  await expect(
    page.getByRole("heading", { exact: true, name: "Замовлення" }),
  ).toBeVisible();

  await page.reload();
  await expect(page).toHaveURL(/\/dashboard\/orders$/);
  await expect(
    page.getByRole("heading", { exact: true, name: "Замовлення" }),
  ).toBeVisible();

  await navigation
    .getByRole("link", { exact: true, name: "Створити замовлення" })
    .click();
  await expect(page).toHaveURL(/\/dashboard\/orders\/new$/);
  await expect(
    page.getByRole("heading", { name: "Створити посилання замовлення" }),
  ).toBeVisible();

  await page.goBack();
  await expect(page).toHaveURL(/\/dashboard\/orders$/);
  await expect(
    page.getByRole("heading", { exact: true, name: "Замовлення" }),
  ).toBeVisible();

  await page.goForward();
  await expect(page).toHaveURL(/\/dashboard\/orders\/new$/);
  await expect(
    page.getByRole("heading", { name: "Створити посилання замовлення" }),
  ).toBeVisible();

  await navigation.getByRole("link", { exact: true, name: "Огляд" }).click();
  await expect(page).toHaveURL(/\/dashboard$/);
  await expect(
    page.getByRole("heading", { name: "Панель власника" }),
  ).toBeVisible();

  await page.getByRole("button", { name: "Вийти" }).click();
  await expect(page).toHaveURL(/\/login\?logout=1$/);
  await expect(page.getByText("Ви вийшли з кабінету.")).toBeVisible();

  await page.goto("/dashboard");
  await expect(page).toHaveURL(/\/login$/);
});
