import { expect, type Page, test } from "@playwright/test";

const cookieUrl = process.env.PLAYWRIGHT_BASE_URL ?? "http://127.0.0.1:3000";

test("owner product and order lists use desktop tables and mobile cards", async ({
  page,
}) => {
  await seedSession(page, "owner");
  await page.setViewportSize({ height: 900, width: 1440 });

  const stamp = Date.now();
  const productName = `Адаптивна каблучка ${stamp}`;
  const sku = `RESP-${stamp}`;
  const customerName = `Олена Адаптивна ${stamp}`;
  const customerPhone = `+38067${String(stamp).slice(-7)}`;

  await createProduct(page, {
    description: "Товар для перевірки адаптивного списку",
    imageUrl: "https://example.com/e2e-responsive-ring.jpg",
    name: productName,
    price: "1590",
    sku,
    stock: "7",
  });

  await expect(page).toHaveURL(/\/dashboard\/products$/);
  await expect(page.getByTestId("product-desktop-table")).toBeVisible();
  await expect(page.getByTestId("product-mobile-list")).toBeHidden();
  const productTable = page.getByTestId("product-desktop-table");
  await expect(
    productTable.getByRole("columnheader", { name: "Товар" }),
  ).toBeVisible();
  await expect(
    productTable.getByRole("columnheader", { name: "Ціна і залишок" }),
  ).toBeVisible();
  await expect(productTable.getByText(productName)).toBeVisible();
  await expect(productTable.getByText(`Артикул: ${sku}`)).toBeVisible();
  await expectNoHorizontalOverflow(page);

  await page.setViewportSize({ height: 844, width: 390 });
  await page.goto("/dashboard/products");
  await expect(page.getByTestId("product-mobile-list")).toBeVisible();
  await expect(page.getByTestId("product-desktop-table")).toBeHidden();
  const productCard = page
    .getByTestId("product-mobile-card")
    .filter({ hasText: productName })
    .first();
  await expect(productCard).toBeVisible();
  await expect(productCard.getByText(`Артикул: ${sku}`)).toBeVisible();
  await expect(productCard.getByText("Активний")).toBeVisible();
  await expect(productCard.getByRole("link", { name: "Редагувати" })).toBeVisible();
  await expect(productCard.getByRole("button", { name: "Вимкнути" })).toBeVisible();
  await expectNoHorizontalOverflow(page);

  await page.setViewportSize({ height: 900, width: 1440 });
  await createConfirmedOrder(page, {
    customerName,
    customerPhone,
    productName,
  });

  await page.goto("/dashboard/orders");
  await expect(page.getByRole("heading", { name: "Замовлення" })).toBeVisible();
  await expect(page.getByTestId("owner-orders-desktop-table")).toBeVisible();
  await expect(page.getByTestId("owner-orders-mobile-list")).toBeHidden();
  const ordersTable = page.getByTestId("owner-orders-desktop-table");
  await expect(
    ordersTable.getByRole("columnheader", { name: "Замовлення" }),
  ).toBeVisible();
  await expect(
    ordersTable.getByRole("columnheader", { name: "Сума і теги" }),
  ).toBeVisible();
  const orderRow = ordersTable.getByRole("row", {
    name: new RegExp(customerName),
  });
  await expect(orderRow).toBeVisible();
  await expect(orderRow.getByText("Готується відправлення")).toBeVisible();
  await expectNoHorizontalOverflow(page);

  await page.setViewportSize({ height: 844, width: 390 });
  await page.goto("/dashboard/orders");
  await expect(page.getByTestId("owner-orders-mobile-list")).toBeVisible();
  await expect(page.getByTestId("owner-orders-desktop-table")).toBeHidden();
  const orderCard = page
    .getByTestId("owner-orders-mobile-card")
    .filter({ hasText: customerName })
    .first();
  await expect(orderCard).toBeVisible();
  await expect(orderCard.getByText(customerPhone)).toBeVisible();
  await expect(orderCard.getByText("Готується відправлення")).toBeVisible();
  await expect(orderCard.getByText("Без тегів")).toBeVisible();
  await expect(orderCard.getByRole("link", { name: "Відкрити" })).toBeVisible();
  await expectNoHorizontalOverflow(page);

  await page.goto("/dashboard/orders?status=SHIPMENT_PENDING");
  const filterToggle = page.getByRole("button", {
    name: /^(Показати|Сховати) фільтри$/,
  });
  await expect(filterToggle).toHaveAttribute("aria-expanded", "false");
  await expect(page.getByText("Статус: Готується відправлення")).toBeVisible();
  await expect(page.getByLabel("Статус")).toBeHidden();
  await filterToggle.click();
  await expect(filterToggle).toHaveAttribute("aria-expanded", "true");
  await expect(page.getByLabel("Статус")).toBeVisible();
  await page.getByRole("link", { name: "Скинути фільтри" }).click();
  await expect(page).toHaveURL(/\/dashboard\/orders$/);
  await expectNoHorizontalOverflow(page);

  await page.setViewportSize({ height: 740, width: 360 });
  await page.goto("/dashboard/orders");
  await expectNoHorizontalOverflow(page);
});

test("owner order details use mobile sections and keep owner actions visible", async ({
  page,
}) => {
  await seedSession(page, "owner");
  await page.setViewportSize({ height: 844, width: 390 });

  const stamp = Date.now();
  const productName = `Детальна каблучка ${stamp}`;
  const sku = `DETAIL-${stamp}`;
  const customerName = `Олена Детальна ${stamp}`;
  const customerPhone = `+38067${String(stamp).slice(-7)}`;

  await createProduct(page, {
    description: "Товар для мобільної сторінки деталей",
    imageUrl: "https://example.com/e2e-details-ring.jpg",
    name: productName,
    price: "1840",
    sku,
    stock: "4",
  });
  await expect(page).toHaveURL(/\/dashboard\/products$/);

  await createConfirmedOrder(page, {
    customerName,
    customerPhone,
    productName,
  });

  await page.goto("/dashboard/orders");
  await expect(page.getByTestId("owner-orders-mobile-list")).toBeVisible();
  const orderCard = page
    .getByTestId("owner-orders-mobile-card")
    .filter({ hasText: customerName })
    .first();

  await expect(orderCard).toBeVisible();
  await Promise.all([
    page.waitForURL(/\/dashboard\/orders\/[^/]+$/),
    orderCard.getByRole("link", { name: "Відкрити" }).click(),
  ]);

  await expect(page.getByRole("heading", { name: /Замовлення #/ })).toBeVisible();
  for (const heading of [
    "Огляд",
    "Товари",
    "Клієнт",
    "Доставка",
    "Оплата",
    "Теги",
    "Історія статусів",
    "Аудит",
  ]) {
    await expect(
      page.getByRole("heading", { exact: true, name: heading }),
    ).toBeVisible();
  }
  await expect(
    page.getByTestId("owner-order-product-card").filter({ hasText: productName }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Повторити створення відправлення" }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Оновити статус" }),
  ).toBeVisible();
  await expect(page.getByLabel("Новий тег")).toBeVisible();
  await expect(page.getByText("Клієнт підтвердив замовлення").first()).toBeVisible();
  await expectNoHorizontalOverflow(page);

  await page.setViewportSize({ height: 740, width: 360 });
  await expectNoHorizontalOverflow(page);
});

async function createConfirmedOrder(
  page: Page,
  input: {
    customerName: string;
    customerPhone: string;
    productName: string;
  },
) {
  await page.goto("/dashboard/orders/new");
  await page.getByLabel(`Додати ${input.productName}`).check();
  await page.getByRole("button", { name: "Далі" }).click();
  await page
    .getByRole("spinbutton", { name: `Кількість для ${input.productName}` })
    .fill("1");
  await page.getByRole("button", { name: "Далі" }).click();
  await page.getByRole("button", { name: "Створити посилання" }).click();
  const publicUrl = await page
    .getByRole("textbox", { name: "Публічне посилання" })
    .inputValue();

  await page.goto(publicUrl);
  await page
    .getByRole("link", { name: "Перейти до доставки й оплати" })
    .click();
  await page.getByLabel("Повне ім’я").fill(input.customerName);
  await page.getByLabel("Телефон").fill(input.customerPhone);
  await page.getByRole("button", { name: "Далі" }).click();
  await page.getByLabel("Місто або населений пункт").fill("Київ");
  await page.getByRole("button", { name: /Київ.*Київська область/ }).click();
  await page.getByLabel("Відділення або поштове відділення").fill("1");
  await page.getByRole("button", { name: /Відділення №1/ }).click();
  await page.getByRole("button", { name: "Далі" }).click();
  await page.getByRole("radio", { name: /Післяплата/ }).check();
  await page.getByRole("button", { name: "Далі" }).click();
  await page.getByRole("button", { name: "Підтвердити замовлення" }).click();
  await expect(
    page.getByText("Замовлення підтверджено. Оплата при отриманні."),
  ).toBeVisible();
}

async function createProduct(
  page: Page,
  product: {
    description: string;
    imageUrl: string;
    name: string;
    price: string;
    sku: string;
    stock: string;
  },
) {
  await page.goto("/dashboard/products/new");
  await page.getByLabel("Назва товару").fill(product.name);
  await page.getByLabel("Артикул").fill(product.sku);
  await page.getByLabel("Опис").fill(product.description);
  await page.getByRole("button", { name: "Далі" }).click();
  await page.getByLabel("Ціна, грн").fill(product.price);
  await page.getByRole("textbox", { exact: true, name: "Залишок" }).fill(product.stock);
  await page.getByRole("button", { name: "Далі" }).click();
  await page.getByLabel("URL зображення").fill(product.imageUrl);
  await page.getByRole("button", { name: "Далі" }).click();
  await expect(page.getByRole("heading", { name: "Перевірка" })).toBeVisible();
  await page.getByRole("button", { name: "Створити товар" }).click();
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
