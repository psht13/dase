import { expect, test } from "@playwright/test";

const productionUrl = "https://web-production-26609.up.railway.app";

test.describe("production auth smoke", () => {
  test.skip(
    process.env.RUN_PROD_SMOKE !== "1",
    "Set RUN_PROD_SMOKE=1 to run the authenticated production smoke test.",
  );

  test("owner session survives dashboard navigation and logout stays public-origin", async ({
    page,
  }) => {
    const email = process.env.E2E_PROD_EMAIL;
    const password = process.env.E2E_PROD_PASSWORD;
    const requestUrls: string[] = [];

    test.skip(
      process.env.PLAYWRIGHT_BASE_URL !== productionUrl,
      `Set PLAYWRIGHT_BASE_URL=${productionUrl}.`,
    );
    test.skip(
      !email || !password,
      "Set E2E_PROD_EMAIL and E2E_PROD_PASSWORD outside the repo.",
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

    await expect(page).toHaveURL(`${productionUrl}/dashboard`);
    await expect(
      page.getByRole("heading", { name: "Панель власника" }),
    ).toBeVisible();

    const navigation = page.locator("aside");

    await navigation
      .getByRole("link", { exact: true, name: "Каталог товарів" })
      .click();
    await expect(page).toHaveURL(`${productionUrl}/dashboard/products`);
    await expect(
      page.getByRole("heading", { name: "Каталог товарів" }),
    ).toBeVisible();

    await navigation
      .getByRole("link", { exact: true, name: "Замовлення" })
      .click();
    await expect(page).toHaveURL(`${productionUrl}/dashboard/orders`);
    await expect(
      page.getByRole("heading", { exact: true, name: "Замовлення" }),
    ).toBeVisible();

    await page.getByRole("button", { name: "Вийти" }).click();
    await expect(page).toHaveURL(`${productionUrl}/login?logout=1`);
    await expect(page.getByText("Ви вийшли з кабінету.")).toBeVisible();

    expect(
      requestUrls.filter((url) => url.startsWith("https://localhost:8080")),
    ).toEqual([]);
  });
});
