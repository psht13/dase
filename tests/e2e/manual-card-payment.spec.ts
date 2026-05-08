import { expect, test } from "@playwright/test";
import {
  createProduct,
  createPublicOrderLink,
  expectNoHorizontalOverflow,
  seedSession,
} from "./helpers";

test("owner creates payment requisites and customer sees online card payment", async ({
  page,
}) => {
  await seedSession(page, "owner");
  const stamp = Date.now();
  const productName = `Підвіска оплата ${stamp}`;
  const paymentValue = "4441 1111 2222 3333";
  const customerPhone = `+38067${String(stamp).slice(-7).padStart(7, "0")}`;
  const customerInstagram = `@olena.payment.${stamp}`;

  await page.goto("/dashboard/settings/payment");
  await expect(
    page.getByRole("heading", { name: "Реквізити для оплати" }),
  ).toBeVisible();
  await page.getByLabel("Назва").fill("Основна картка");
  await page.getByLabel("Банк").fill("ПриватБанк");
  await page.getByLabel("Отримувач").fill("Олена Петренко");
  await page
    .getByLabel("Номер картки, IBAN або реквізити")
    .fill(paymentValue);
  await page.getByLabel("Примітка").fill("Вкажіть номер замовлення у платежі");
  await page.getByRole("button", { name: "Додати реквізити" }).click();
  await expect(page.getByText("Реквізити додано")).toBeVisible();
  await expect(page.getByText("Основна картка").first()).toBeVisible();
  await expect(page.getByText("•••• 3333")).toBeVisible();

  await createProduct(page, {
    description: "Срібна підвіска для перевірки реквізитів",
    imageUrl: "https://example.com/e2e-payment.jpg",
    name: productName,
    price: "1890",
    sku: `PAYMENT-E2E-${stamp}`,
    stock: "3",
  });
  const publicUrl = await createPublicOrderLink(page, { productName });

  await page.setViewportSize({ height: 844, width: 390 });
  await page.goto(publicUrl);
  await page
    .getByRole("link", { name: "Перейти до доставки й оплати" })
    .click();
  await page.getByLabel("Повне ім’я").fill("Олена Петренко");
  await page.getByLabel("Телефон").fill(customerPhone);
  await page.getByLabel("Instagram нікнейм").fill(customerInstagram);
  await page.getByRole("button", { name: "Далі" }).click();
  await page.getByLabel("Місто або населений пункт").fill("Київ");
  await page.getByRole("button", { name: /Київ.*Київська область/ }).click();
  await page.getByLabel("Відділення або поштове відділення").fill("1");
  await page.getByRole("button", { name: /Відділення №1/ }).click();
  await page.getByRole("button", { name: "Далі" }).click();

  await expect(
    page.getByRole("radio", { name: /Оплата картою онлайн/ }),
  ).toBeChecked();
  await expect(
    page.getByText(
      "Переказ можна зробити на одну з карток нижче. Після оплати надішліть квитанцію продавцю в Instagram чат.",
    ),
  ).toBeVisible();
  await expect(page.getByText(paymentValue)).toBeVisible();
  await expect(page.getByText(/Олена Петренко/).first()).toBeVisible();
  await expectNoHorizontalOverflow(page);

  await page.getByRole("button", { name: "Далі" }).click();
  await expect(page.getByText("Оплата картою онлайн")).toBeVisible();
  await page.getByRole("button", { name: "Підтвердити замовлення" }).click();
  await expect(
    page.getByRole("heading", { name: /Замовлення #/ }),
  ).toBeVisible();
  await expect(page.getByText("Очікуємо оплату").first()).toBeVisible();
  await expect(page.getByText("Очікуємо оплату картою.")).toBeVisible();
  await expect(page.getByText(paymentValue)).toBeVisible();
  await expectNoHorizontalOverflow(page);

  await page.goto(`/dashboard/orders?search=${encodeURIComponent(customerPhone)}`);
  await expect(
    page.getByTestId("owner-orders-mobile-card").getByText(customerPhone),
  ).toBeVisible();
  await page.getByRole("link", { name: "Відкрити" }).first().click();
  await expect(page.getByRole("heading", { name: /Оплата/ })).toBeVisible();
  await expect(page.getByText("Оплата картою онлайн")).toBeVisible();
  await expect(page.getByText("Очікує підтвердження")).toBeVisible();
  await expect(page.getByText(customerInstagram)).toBeVisible();
  await page
    .getByRole("button", { name: "Позначити оплату отриманою" })
    .click();
  await expect(page.getByText("Оплачено").first()).toBeVisible();
  await expect(
    page.getByText("Оплату картою підтверджено", { exact: true }),
  ).toBeVisible();
});
