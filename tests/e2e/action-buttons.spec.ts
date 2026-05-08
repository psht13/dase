import { expect, test, type Locator } from "@playwright/test";
import {
  createConfirmedOrder,
  createProduct,
  createPublicOrderLink,
  expectNoHorizontalOverflow,
  seedSession,
} from "./helpers";

test("form action buttons keep stable desktop and mobile placement", async ({
  page,
}) => {
  test.setTimeout(120_000);

  await seedSession(page, "owner");
  await page.setViewportSize({ height: 900, width: 1440 });

  await page.goto("/dashboard/products/new");
  const productActions = page.locator("form footer").last();
  const cancelProduct = productActions.getByRole("link", { name: "Скасувати" });
  const nextProduct = productActions.getByRole("button", { name: "Далі" });

  await expect(cancelProduct).toBeVisible();
  await expect(nextProduct).toBeVisible();
  await expectSameRow(cancelProduct, nextProduct);
  await expectMinWidth(nextProduct, 144);
  await expectNoHorizontalOverflow(page, "desktop product form actions");

  const stamp = Date.now();
  const productName = `Кнопкова каблучка ${stamp}`;
  await createProduct(page, {
    description: "Товар для перевірки кнопок",
    imageUrl: "https://example.com/action-buttons-ring.jpg",
    name: productName,
    price: "1290",
    sku: `BTN-${stamp}`,
    stock: "5",
  });
  const publicUrl = await createPublicOrderLink(page, { productName });

  await page.setViewportSize({ height: 844, width: 390 });
  await page.goto(`${publicUrl}/delivery`);

  const deliveryActions = page.locator("form footer").last();
  const deliveryNext = deliveryActions.getByRole("button", { name: "Далі" });
  const deliveryCancel = deliveryActions.getByRole("link", {
    name: "Назад до замовлення",
  });

  await expect(deliveryNext).toBeVisible();
  await expect(deliveryCancel).toBeVisible();
  await expect(deliveryActions.getByRole("button", { name: "Назад" })).toHaveCount(
    0,
  );
  await expectStackedFullWidth(deliveryNext, deliveryCancel);
  await expectNoHorizontalOverflow(page, "mobile delivery form actions");

  await expect(
    page.getByRole("link", { name: "Назад до замовлення" }),
  ).toHaveCount(1);
  await page.goto(publicUrl);
  await expect(page.getByRole("link", { name: /Назад/ })).toHaveCount(0);
});

test("owner order details action group stays inside mobile viewport", async ({
  page,
}) => {
  test.setTimeout(120_000);

  await seedSession(page, "owner");
  await page.setViewportSize({ height: 844, width: 390 });

  const stamp = Date.now();
  const productName = `Деталі кнопок ${stamp}`;
  const customerName = `Олена Кнопкова ${stamp}`;
  await createProduct(page, {
    description: "Товар для перевірки деталей замовлення",
    imageUrl: "https://example.com/order-actions-ring.jpg",
    name: productName,
    price: "1490",
    sku: `OD-${stamp}`,
    stock: "3",
  });
  await createConfirmedOrder(page, {
    customerName,
    customerPhone: `+38067${String(stamp).slice(-7)}`,
    productName,
  });

  await page.goto("/dashboard/orders");
  const orderCard = page
    .getByTestId("owner-orders-mobile-card")
    .filter({ hasText: customerName })
    .first();

  await expect(orderCard).toBeVisible();
  await Promise.all([
    page.waitForURL(/\/dashboard\/orders\/[^/]+$/),
    orderCard.getByRole("link", { name: "Відкрити" }).click(),
  ]);

  const backLink = page.getByRole("link", { name: "До списку замовлень" });
  const publicLink = page.getByRole("link", { name: "Публічна сторінка" });

  await expect(backLink).toBeVisible();
  await expect(publicLink).toBeVisible();
  await expectWithinViewport(backLink);
  await expectWithinViewport(publicLink);
  await expectNoHorizontalOverflow(page, "mobile owner order detail actions");
});

async function expectSameRow(left: Locator, right: Locator) {
  const [leftBox, rightBox] = await Promise.all([
    left.boundingBox(),
    right.boundingBox(),
  ]);

  expect(leftBox).not.toBeNull();
  expect(rightBox).not.toBeNull();
  expect(Math.abs(leftBox!.y - rightBox!.y)).toBeLessThanOrEqual(1);
  expect(Math.abs(leftBox!.height - rightBox!.height)).toBeLessThanOrEqual(1);
  expect(leftBox!.x).toBeLessThan(rightBox!.x);
}

async function expectMinWidth(locator: Locator, minWidth: number) {
  const box = await locator.boundingBox();

  expect(box).not.toBeNull();
  expect(box!.width).toBeGreaterThanOrEqual(minWidth);
}

async function expectStackedFullWidth(top: Locator, bottom: Locator) {
  const [topBox, bottomBox] = await Promise.all([
    top.boundingBox(),
    bottom.boundingBox(),
  ]);

  expect(topBox).not.toBeNull();
  expect(bottomBox).not.toBeNull();
  expect(topBox!.y).toBeLessThan(bottomBox!.y);
  expect(topBox!.width).toBeGreaterThanOrEqual(320);
  expect(bottomBox!.width).toBeGreaterThanOrEqual(320);
  expect(Math.abs(topBox!.width - bottomBox!.width)).toBeLessThanOrEqual(1);
}

async function expectWithinViewport(locator: Locator) {
  const box = await locator.boundingBox();

  expect(box).not.toBeNull();
  expect(box!.x).toBeGreaterThanOrEqual(0);
  expect(box!.x + box!.width).toBeLessThanOrEqual(390);
}
