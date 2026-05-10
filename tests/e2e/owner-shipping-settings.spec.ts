import { expect, test } from "@playwright/test";
import { expectNoHorizontalOverflow, seedSession } from "./helpers";

test.beforeEach(async ({ page }) => {
  await page.request.post("/api/test/reset");
});

test("owner saves Nova Post shipping settings with a masked API key", async ({
  page,
}) => {
  const fakeApiKey = "fake-owner-nova-post-key-7890";

  await seedSession(page, "owner");
  await page.goto("/dashboard/settings/shipping");

  await expect(page.getByRole("heading", { name: "Доставка" })).toBeVisible();
  await expect(page.getByLabel("Середовище API")).toHaveValue("stage");
  await expect(
    page.getByText("https://api-stage.novapost.pl/v.1.0/").first(),
  ).toBeVisible();

  await page.getByLabel("API ключ Nova Post").fill(fakeApiKey);
  await page.getByLabel("ПІБ відправника").fill("Олена Петренко");
  await page.getByLabel("Телефон відправника").fill("+380671234567");
  await page.getByLabel("Email відправника").fill("olena@example.com");
  await page.getByLabel("Код країни").fill("UA");
  await page.getByLabel("ID відділення або філії").fill("11759");
  await page.getByLabel("Назва компанії").fill("Dase Jewelry");
  await page.getByLabel("ІПН або ЄДРПОУ компанії").fill("12345678");
  await page.getByLabel("Створення відправлень увімкнено").check();
  await expectNoHorizontalOverflow(page, "/dashboard/settings/shipping");

  await page.getByRole("button", { name: "Зберегти налаштування" }).click();

  await expect(page.getByText("Налаштування доставки збережено")).toBeVisible();
  await expect(page.getByText("API ключ збережено")).toBeVisible();
  await expect(page.getByText("****7890")).toBeVisible();
  await expect(page.getByText(fakeApiKey)).toHaveCount(0);

  await page.goto("/dashboard/settings");
  await page.getByRole("link", { name: /Доставка/ }).click();

  await expect(page).toHaveURL(/\/dashboard\/settings\/shipping$/);
  await expect(page.getByText("API ключ збережено")).toBeVisible();
  await expect(page.getByText("****7890")).toBeVisible();
  await expect(page.getByText(fakeApiKey)).toHaveCount(0);
});

test("user role cannot access owner shipping settings", async ({ page }) => {
  await seedSession(page, "user");

  await page.goto("/dashboard/settings/shipping");

  await expect(page).toHaveURL("/");
});
