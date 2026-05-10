import { expect, test } from "@playwright/test";

const productionUrl = "https://web-production-26609.up.railway.app";
const baseUrl = (process.env.PLAYWRIGHT_BASE_URL ?? productionUrl).replace(
  /\/$/,
  "",
);
const isProductionSmoke = process.env.RUN_PROD_SMOKE === "1";

test.describe("authenticated owner smoke", () => {
  test.skip(
    process.env.RUN_AUTH_SMOKE !== "1" && !isProductionSmoke,
    "Set RUN_AUTH_SMOKE=1 or RUN_PROD_SMOKE=1 to run the authenticated smoke test.",
  );

  test("owner session survives dashboard navigation and logout stays public-origin", async ({
    page,
  }) => {
    const email = isProductionSmoke
      ? (process.env.E2E_PROD_EMAIL ?? process.env.E2E_AUTH_EMAIL)
      : (process.env.E2E_AUTH_EMAIL ?? process.env.E2E_PROD_EMAIL);
    const password = isProductionSmoke
      ? (process.env.E2E_PROD_PASSWORD ?? process.env.E2E_AUTH_PASSWORD)
      : (process.env.E2E_AUTH_PASSWORD ?? process.env.E2E_PROD_PASSWORD);
    const requestUrls: string[] = [];

    test.skip(
      isProductionSmoke && process.env.PLAYWRIGHT_BASE_URL !== productionUrl,
      `Set PLAYWRIGHT_BASE_URL=${productionUrl}.`,
    );
    test.skip(
      !email || !password,
      "Set E2E_AUTH_EMAIL/E2E_AUTH_PASSWORD or E2E_PROD_EMAIL/E2E_PROD_PASSWORD outside tracked files.",
    );

    if (!email || !password) {
      return;
    }

    page.on("request", (request) => {
      requestUrls.push(request.url());
    });

    await page.goto("/login");
    await expect(
      page.getByRole("heading", { name: "Вхід до кабінету" }),
    ).toBeVisible();

    await page.getByLabel("Електронна пошта").fill(email);
    await page.getByLabel("Пароль").fill(password);
    await page.getByRole("button", { name: "Увійти" }).click();

    await expect(page).toHaveURL(`${baseUrl}/dashboard`);
    await expect(
      page.getByRole("heading", { name: "Панель власника" }),
    ).toBeVisible();

    const navigation = page.locator("aside");

    await navigation
      .getByRole("link", { exact: true, name: "Каталог товарів" })
      .click();
    await expect(page).toHaveURL(`${baseUrl}/dashboard/products`);
    await expect(
      page.getByRole("heading", { name: "Каталог товарів" }),
    ).toBeVisible();

    await navigation
      .getByRole("link", { exact: true, name: "Замовлення" })
      .click();
    await expect(page).toHaveURL(`${baseUrl}/dashboard/orders`);
    await expect(
      page.getByRole("heading", { exact: true, name: "Замовлення" }),
    ).toBeVisible();

    await page.getByRole("button", { name: "Вийти" }).click();
    await expect(page).toHaveURL(`${baseUrl}/login?logout=1`);
    await expect(page.getByText("Ви вийшли з кабінету.")).toBeVisible();

    expect(
      requestUrls.filter((url) => url.startsWith("https://localhost:8080")),
    ).toEqual([]);
  });
});
