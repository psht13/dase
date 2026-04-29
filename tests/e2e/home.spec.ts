import { expect, test } from "@playwright/test";

test("home page exposes Ukrainian starter UI", async ({ page }) => {
  await page.goto("/");

  await expect(
    page.getByRole("heading", {
      name: "Підтвердження замовлень для ювелірних продавців",
    }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Перейти до налаштування" }),
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
