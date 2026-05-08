import { expect, test } from "@playwright/test";
import {
  createProduct,
  expectNoHorizontalOverflow,
  seedSession,
} from "./helpers";

test("customer confirms delivery with mocked carrier lookup", async ({ page }) => {
  await seedSession(page, "owner");
  const sku = `DELIVERY-E2E-${Date.now()}`;
  const productName = `Каблучка доставка ${Date.now()}`;

  await createProduct(page, {
    description: "Срібна каблучка для e2e перевірки",
    imageUrl: "https://example.com/e2e-ring.jpg",
    name: productName,
    price: "1450",
    sku,
    stock: "4",
  });
  await expect(page).toHaveURL(/\/dashboard\/products$/);
  await expect(
    page.getByTestId("product-desktop-table").getByText(productName),
  ).toBeVisible();

  await page.goto("/dashboard/orders/new");
  await page.getByLabel(`Додати ${productName}`).check();
  await page.getByRole("button", { name: "Далі" }).click();
  await page
    .getByRole("spinbutton", { name: `Кількість для ${productName}` })
    .fill("1");
  await page.getByRole("button", { name: "Далі" }).click();
  await page.getByRole("button", { name: "Створити посилання" }).click();

  const publicUrl = await page
    .getByRole("textbox", { name: "Публічне посилання" })
    .inputValue();

  await page.setViewportSize({ height: 844, width: 390 });
  await page.goto(publicUrl);
  await expect(page.getByRole("heading", { name: "Ваше замовлення" })).toBeVisible();
  await expect(page.getByText(productName)).toBeVisible();
  await expectNoHorizontalOverflow(page);
  await page
    .getByRole("link", { name: "Перейти до доставки й оплати" })
    .click();
  await expect(
    page.getByRole("heading", { name: "Доставка та оплата" }),
  ).toBeVisible();
  await expect(page.getByRole("heading", { name: "Контакти" })).toBeVisible();
  await expect(page.getByText("Крок 1 з 4").first()).toBeVisible();
  await expect(page.getByLabel("Повне ім’я")).toBeVisible();
  await expectNoHorizontalOverflow(page);

  await page.getByLabel("Повне ім’я").fill("Олена Петренко");
  await page.getByLabel("Телефон").fill("+380671234567");
  await page.getByLabel("Instagram нікнейм").fill("@olena.delivery");
  await expect(
    page.getByText("Допоможе продавцю швидше знайти вашу переписку."),
  ).toBeVisible();
  await page.getByRole("button", { name: "Далі" }).click();
  await expect(
    page.getByRole("heading", { exact: true, name: "Доставка" }),
  ).toBeVisible();
  await expect(page.getByLabel("Служба доставки")).toHaveValue("NOVA_POSHTA");
  await expect(page.locator("#delivery-carrier option")).toHaveText([
    "Нова пошта",
  ]);
  await expect(page.getByLabel("Місто або населений пункт")).toBeVisible();
  await expectNoHorizontalOverflow(page);
  await page.getByLabel("Місто або населений пункт").fill("Київ");
  await page.getByRole("button", { name: /Київ.*Київська область/ }).click();
  await page.getByLabel("Відділення або поштове відділення").fill("1");
  await page.getByRole("button", { name: /Відділення №1/ }).click();
  await expect(page.getByText("Підсумок доставки")).toBeVisible();
  await expect(page.getByRole("button", { name: "Змінити місто" })).toBeVisible();
  await expectNoHorizontalOverflow(page);
  await page.getByRole("button", { name: "Далі" }).click();
  await expect(
    page.getByRole("heading", { exact: true, name: "Оплата" }),
  ).toBeVisible();
  await page.getByRole("radio", { name: /Післяплата/ }).check();
  await expectNoHorizontalOverflow(page);
  await page.getByRole("button", { name: "Далі" }).click();
  await expect(
    page.getByRole("heading", { exact: true, name: "Перевірка" }),
  ).toBeVisible();
  await expect(page.getByText("Олена Петренко")).toBeVisible();
  await expect(page.getByText("@olena.delivery")).toBeVisible();
  await expect(page.getByText("Післяплата")).toBeVisible();
  await expectNoHorizontalOverflow(page);
  await page.getByRole("button", { name: "Підтвердити замовлення" }).click();

  await expect(
    page.getByRole("heading", { name: /Замовлення #/ }),
  ).toBeVisible();
  await expect(page.getByText(/Ваше замовлення обробляється/)).toBeVisible();
  await expect(
    page.getByText("Якщо маєте питання, зверніться до продавця в чаті."),
  ).toBeVisible();
  await expect(page.getByText(productName)).toBeVisible();
  await expect(page.getByText("Разом")).toBeVisible();
  await expect(page.getByLabel("Повне ім’я")).not.toBeVisible();
  await expectNoHorizontalOverflow(page);

  await page.goto(publicUrl);
  await expect(
    page.getByRole("heading", { name: /Замовлення #/ }),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Перейти до доставки й оплати" }),
  ).not.toBeVisible();
  await expect(page.getByLabel("Повне ім’я")).not.toBeVisible();

  await page.goto(`${publicUrl}/delivery`);
  await expect(
    page.getByRole("heading", { name: /Замовлення #/ }),
  ).toBeVisible();
  await expect(page.getByLabel("Повне ім’я")).not.toBeVisible();
});
