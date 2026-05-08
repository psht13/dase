import { expect, test } from "@playwright/test";
import {
  createProduct,
  createPublicOrderLink,
  expectNoHorizontalOverflow,
  seedSession,
} from "./helpers";

const wizardViewports = [
  { height: 844, label: "390x844", width: 390 },
  { height: 1024, label: "768x1024", width: 768 },
  { height: 900, label: "1440x900", width: 1440 },
] as const;

test("wizard forms stay balanced without horizontal overflow", async ({
  page,
}) => {
  test.setTimeout(120_000);

  await seedSession(page, "owner");

  const stamp = Date.now();
  const productName = `Адаптивний товар ${stamp}`;

  await createProduct(page, {
    description: "Товар для перевірки адаптивних майстрів форм",
    imageUrl: "https://example.com/wizard-layout-ring.jpg",
    name: productName,
    price: "1850",
    sku: `WIZ-${stamp}`,
    stock: "6",
  });

  const publicUrl = await createPublicOrderLink(page, {
    productName,
    quantity: "1",
  });

  for (const viewport of wizardViewports) {
    await page.setViewportSize({
      height: viewport.height,
      width: viewport.width,
    });

    await page.goto("/dashboard/products/new");
    await expect(page.getByRole("heading", { name: "Новий товар" })).toBeVisible();
    await expect(page.getByText("Крок 1 із 4").first()).toBeVisible();
    await expect(page.getByLabel("Назва товару")).toBeVisible();
    await expect(page.getByRole("button", { name: "Далі" })).toBeVisible();
    await expectNoHorizontalOverflow(page, `product wizard ${viewport.label}`);

    await page.goto("/dashboard/orders/new");
    await expect(
      page.getByRole("heading", { name: "Створити посилання замовлення" }),
    ).toBeVisible();
    await expect(page.getByText("Крок 1 із 4").first()).toBeVisible();
    await expect(page.getByLabel("Пошук товарів")).toBeVisible();
    await expect(page.getByLabel(`Додати ${productName}`)).toBeVisible();
    await expectNoHorizontalOverflow(
      page,
      `order builder wizard ${viewport.label}`,
    );

    await page.goto(`${publicUrl}/delivery`);
    await expect(
      page.getByRole("heading", { name: "Доставка та оплата" }),
    ).toBeVisible();
    await expect(page.getByText("Крок 1 із 4").first()).toBeVisible();
    await expect(page.getByLabel("Повне ім’я")).toBeVisible();
    await expect(page.getByLabel("Instagram нікнейм")).toBeVisible();
    await expectNoHorizontalOverflow(
      page,
      `public delivery wizard ${viewport.label}`,
    );
  }
});
