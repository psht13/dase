import { expect, test } from "@playwright/test";
import {
  confirmPublicOrderDelivery,
  createConfirmedOrder,
  createProduct,
  createPublicOrderLink,
  expectNoHorizontalOverflow,
  responsiveViewportMatrix,
  seedSession,
} from "./helpers";

test("critical pages do not overflow across the final viewport matrix", async ({
  page,
}) => {
  test.setTimeout(120_000);

  await seedSession(page, "owner");

  const stamp = Date.now();
  const productName = `Фінальна каблучка ${stamp}`;
  const customerName = `Олена Фінальна ${stamp}`;
  const customerPhone = `+38067${String(stamp).slice(-7)}`;

  await createProduct(page, {
    description: "Товар для фінальної адаптивної перевірки",
    imageUrl: "https://example.com/final-responsive-ring.jpg",
    name: productName,
    price: "1990",
    sku: `FINAL-${stamp}`,
    stock: "5",
  });

  const editHref = await page
    .getByRole("row", { name: new RegExp(productName) })
    .getByRole("link", { name: "Редагувати" })
    .getAttribute("href");
  const publicUrl = await createPublicOrderLink(page, {
    productName,
    quantity: "2",
  });
  await createConfirmedOrder(page, {
    customerName,
    customerPhone,
    productName,
  });

  await page.setViewportSize({ height: 844, width: 390 });
  await page.goto("/dashboard/orders");
  const orderDetailsHref = await page
    .getByTestId("owner-orders-mobile-card")
    .filter({ hasText: customerName })
    .first()
    .getByRole("link", { name: "Відкрити" })
    .getAttribute("href");

  if (!editHref || !orderDetailsHref) {
    throw new Error("Expected edit and order details links for responsive QA");
  }

  const criticalPages = [
    { label: "home", path: "/" },
    { label: "login", path: "/login" },
    { label: "setup", path: "/setup" },
    { label: "dashboard", path: "/dashboard" },
    { label: "products list", path: "/dashboard/products" },
    { label: "product create", path: "/dashboard/products/new" },
    { label: "product edit", path: editHref },
    { label: "order builder", path: "/dashboard/orders/new" },
    { label: "orders list", path: "/dashboard/orders" },
    { label: "order details", path: orderDetailsHref },
    { label: "public review", path: publicUrl },
    { label: "public delivery", path: `${publicUrl}/delivery` },
  ];

  for (const viewport of responsiveViewportMatrix) {
    await page.setViewportSize({
      height: viewport.height,
      width: viewport.width,
    });

    for (const criticalPage of criticalPages) {
      await page.goto(criticalPage.path);
      await expectNoHorizontalOverflow(
        page,
        `${criticalPage.label} at ${viewport.label}`,
      );
    }
  }
});

test("keyboard navigation reaches mobile nav, steppers, filters, and actions", async ({
  page,
}) => {
  await seedSession(page, "owner");
  await page.setViewportSize({ height: 740, width: 360 });

  await page.goto("/dashboard");
  const skipLink = page.getByRole("link", {
    name: "Перейти до основного вмісту",
  });
  await page.keyboard.press("Tab");
  await expect(skipLink).toBeFocused();
  await expect(skipLink).toBeVisible();

  const catalogLink = page.getByRole("link", {
    exact: true,
    name: "Каталог товарів",
  });
  await catalogLink.focus();
  await expect(catalogLink).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(/\/dashboard\/products$/);
  await expectNoHorizontalOverflow(page, "mobile catalog after keyboard nav");

  await page.goto("/dashboard/products/new");
  const firstNextButton = page.getByRole("button", { name: "Далі" });
  await firstNextButton.focus();
  await page.keyboard.press("Enter");
  await expect(
    page.getByText("Перевірте поля цього кроку").first(),
  ).toBeVisible();
  await expect(page.getByLabel("Назва товару")).toBeFocused();

  const stamp = Date.now();
  const productName = `Клавіатурна каблучка ${stamp}`;
  await createProduct(page, {
    description: "Товар для перевірки клавіатурної навігації",
    imageUrl: "https://example.com/keyboard-ring.jpg",
    name: productName,
    price: "2100",
    sku: `KEY-${stamp}`,
    stock: "4",
  });

  await page.goto("/dashboard/orders/new");
  const productCheckbox = page.getByLabel(`Додати ${productName}`);
  await productCheckbox.focus();
  await page.keyboard.press("Space");
  await expect(productCheckbox).toBeChecked();

  await page.getByRole("button", { name: "Далі" }).focus();
  await page.keyboard.press("Enter");
  await expect(page.getByRole("heading", { name: "Кількість" })).toBeVisible();

  const increaseQuantityButton = page.getByRole("button", {
    name: `Збільшити кількість для ${productName}`,
  });
  await increaseQuantityButton.focus();
  await expect(increaseQuantityButton).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(
    page.getByRole("spinbutton", { name: `Кількість для ${productName}` }),
  ).toHaveValue("2");

  await page.goto("/dashboard/orders?status=SHIPMENT_PENDING");
  const filterToggle = page.getByRole("button", {
    name: /^(Показати|Сховати) фільтри$/,
  });
  await filterToggle.focus();
  await page.keyboard.press("Enter");
  await expect(filterToggle).toHaveAttribute("aria-expanded", "true");
  await page.getByLabel("Пошук").focus();
  await expect(page.getByLabel("Пошук")).toBeFocused();

  await page.goto("/dashboard/products");
  const editAction = page
    .getByTestId("product-mobile-card")
    .filter({ hasText: productName })
    .first()
    .getByRole("link", { name: "Редагувати" });
  await editAction.focus();
  await expect(editAction).toBeFocused();

  await page.setViewportSize({ height: 900, width: 1440 });
  await page.goto("/dashboard");
  await expect(page.getByTestId("mobile-dashboard-nav")).toBeHidden();
  await expect(
    page.getByRole("navigation", { name: "Основна навігація кабінету" }),
  ).toBeVisible();
  await page
    .getByRole("link", { exact: true, name: "Створити замовлення" })
    .click();
  await expect(page).toHaveURL(/\/dashboard\/orders\/new$/);
  await expectNoHorizontalOverflow(page, "desktop order builder");
});

test("mobile delivery states stay Ukrainian and responsive", async ({ page }) => {
  await seedSession(page, "owner");
  const stamp = Date.now();
  const productName = `Стан доставки ${stamp}`;

  await createProduct(page, {
    description: "Товар для перевірки станів доставки",
    imageUrl: "https://example.com/delivery-state-ring.jpg",
    name: productName,
    price: "1750",
    sku: `STATE-${stamp}`,
    stock: "3",
  });
  const publicUrl = await createPublicOrderLink(page, { productName });

  await page.route("**/api/carriers/cities?**", async (route) => {
    const url = new URL(route.request().url());
    const query = url.searchParams.get("query") ?? "";

    await new Promise((resolve) => setTimeout(resolve, 250));
    await route.fulfill({
      body: JSON.stringify({
        cities: query.includes("Нема")
          ? []
          : [{ id: "city-1", name: "Київ", region: "Київська область" }],
      }),
      contentType: "application/json",
      status: 200,
    });
  });
  await page.route("**/api/carriers/warehouses?**", async (route) => {
    await new Promise((resolve) => setTimeout(resolve, 250));
    await route.fulfill({
      body: JSON.stringify({
        warehouses: [
          {
            address: "вул. Хрещатик, 1",
            cityId: "city-1",
            id: "warehouse-1",
            name: "Відділення №1",
            number: "1",
            type: "warehouse",
          },
        ],
      }),
      contentType: "application/json",
      status: 200,
    });
  });

  await page.setViewportSize({ height: 844, width: 390 });
  await page.goto(`${publicUrl}/delivery`);
  await page.getByLabel("Повне ім’я").fill(`Олена Стан ${stamp}`);
  await page.getByLabel("Телефон").fill("+380671234567");
  await page.getByRole("button", { name: "Далі" }).click();

  await page.getByLabel("Місто або населений пункт").fill("Нема");
  await expect(page.getByText("Пошук міст…")).toBeVisible();
  await expect(page.getByText("Місто не знайдено")).toBeVisible();
  await expectNoHorizontalOverflow(page, "delivery city empty state");

  await page.getByLabel("Місто або населений пункт").fill("Київ");
  await expect(page.getByText("Пошук міст…")).toBeVisible();
  await page.getByRole("button", { name: /Київ.*Київська область/ }).click();
  await expect(page.getByText("Пошук відділень…")).toBeVisible();
  await page.getByRole("button", { name: /Відділення №1/ }).click();
  await page.getByRole("button", { name: "Далі" }).click();
  await page.getByRole("radio", { name: /Післяплата/ }).check();
  await page.getByRole("button", { name: "Далі" }).click();
  await expect(page.getByRole("heading", { name: "Перевірка" })).toBeVisible();
  await expectNoHorizontalOverflow(page, "delivery review state");

  await confirmPublicOrderDelivery(page, {
    customerName: `Олена Успіх ${stamp}`,
    customerPhone: "+380671234567",
    publicUrl,
  });
  await expectNoHorizontalOverflow(page, "delivery success state");
});
