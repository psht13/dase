import { expect, test } from "@playwright/test";

test("home page exposes Ukrainian starter UI", async ({ page }) => {
  await page.goto("/");

  await expect(
    page.getByRole("heading", {
      name: "Підтвердження замовлень для ювелірних продавців",
    }),
  ).toBeVisible();
  const setupLink = page.getByRole("link", {
    name: /Перейти до налаштування|Увійти до кабінету/,
  });

  await expect(setupLink).toBeVisible();
  await expect(setupLink).toHaveAttribute("href", /\/(setup|login)$/);

  await setupLink.click();
  await expect(page).toHaveURL(/\/(setup|login)(?:\?|$)/);
  await expect(
    page.getByRole("heading", {
      name: /Створення першого власника|Налаштування недоступне|Вхід до кабінету/,
    }),
  ).toBeVisible();
});

test("health route returns ok", async ({ request }) => {
  const response = await request.get("/api/health");
  const body = await response.json();

  expect(response.ok()).toBeTruthy();
  expect(body).toMatchObject({
    service: "dase",
    status: "ok",
  });
});
