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

  test("owner session survives dashboard navigation, shipping settings, and logout stays public-origin", async ({
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

    await navigation
      .getByRole("link", { exact: true, name: "Налаштування" })
      .click();
    await expect(page).toHaveURL(`${baseUrl}/dashboard/settings`);
    await expect(
      page.getByRole("heading", { name: "Налаштування" }),
    ).toBeVisible();

    await page.getByRole("link", { name: /Доставка/ }).click();
    await expect(page).toHaveURL(`${baseUrl}/dashboard/settings/shipping`);
    await expect(page.getByRole("heading", { name: "Доставка" })).toBeVisible();
    await expect(page.getByLabel("Середовище API")).toBeVisible();
    await expect(
      page.locator('select[name="apiEnvironment"] option[value="stage"]'),
    ).toHaveText("Тестове середовище");
    await expect(page.getByLabel("ПІБ відправника")).toBeVisible();
    await expect(
      page.getByLabel("Створення відправлень увімкнено"),
    ).toBeVisible();

    const fullNovaPostApiKey = process.env.E2E_PROD_SHIPPING_API_KEY;

    if (fullNovaPostApiKey) {
      const replaceApiKey = page.getByLabel("Замінити API ключ");

      if (await replaceApiKey.isVisible()) {
        await replaceApiKey.check();
      }

      await page.getByLabel("API ключ Nova Post").fill(fullNovaPostApiKey);
      await page.getByLabel("ПІБ відправника").fill("Тестовий Відправник");
      await page.getByLabel("Телефон відправника").fill("+380671234567");
      await page.getByLabel("Код країни").fill("UA");
      await page
        .getByLabel("ID відділення або філії")
        .fill(process.env.E2E_PROD_SHIPPING_SENDER_DIVISION_ID ?? "11759");
      await page.getByRole("button", { name: "Зберегти налаштування" }).click();
      await expect(
        page.getByText("Налаштування доставки збережено"),
      ).toBeVisible();
      await expect(page.getByText("API ключ збережено")).toBeVisible();
      const fullApiKeyIsVisible = await page.locator("body").evaluate(
        (body, apiKey) => (body.textContent ?? "").includes(apiKey),
        fullNovaPostApiKey,
      );
      expect(fullApiKeyIsVisible).toBe(false);
    }

    await page.getByRole("button", { name: "Перевірити підключення" }).click();
    await expect(
      page.getByText(
        /Спочатку збережіть налаштування доставки|Збережіть API ключ Nova Post перед перевіркою|Налаштуйте APP_ENCRYPTION_KEY перед перевіркою підключення|Не вдалося перевірити підключення|Підключення працює/,
      ),
    ).toBeVisible();

    const publicOrderUrl = process.env.E2E_PROD_PUBLIC_ORDER_URL;

    if (publicOrderUrl) {
      const normalizedPublicOrderUrl = publicOrderUrl.replace(/\/$/, "");
      const deliveryUrl = normalizedPublicOrderUrl.endsWith("/delivery")
        ? normalizedPublicOrderUrl
        : `${normalizedPublicOrderUrl}/delivery`;

      await page.goto(deliveryUrl);
      await expect(
        page.getByRole("heading", { name: "Доставка та оплата" }),
      ).toBeVisible();
      await expect(page.getByLabel("Служба доставки")).toHaveValue(
        "NOVA_POSHTA",
      );
      await expect(page.locator("#delivery-carrier option")).toHaveText([
        "Нова пошта",
      ]);
      await expect(page.getByText(/MonoPay|Monobank|Монобанк/i)).toHaveCount(0);
      await expect(page.getByText("Укрпошта")).toHaveCount(0);
      await page.goto("/dashboard");
    }

    await page.getByRole("button", { name: "Вийти" }).click();
    await expect(page).toHaveURL(`${baseUrl}/login?logout=1`);
    await expect(page.getByText("Ви вийшли з кабінету.")).toBeVisible();

    expect(
      requestUrls.filter((url) => url.startsWith("https://localhost:8080")),
    ).toEqual([]);
  });
});
