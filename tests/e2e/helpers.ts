import { expect, type Page } from "@playwright/test";

export const cookieUrl =
  process.env.PLAYWRIGHT_BASE_URL ?? "http://127.0.0.1:3100";

export const responsiveViewportMatrix = [
  { height: 740, label: "360x740", width: 360 },
  { height: 844, label: "390x844", width: 390 },
  { height: 932, label: "430x932", width: 430 },
  { height: 1024, label: "768x1024", width: 768 },
  { height: 768, label: "1024x768", width: 1024 },
  { height: 900, label: "1440x900", width: 1440 },
] as const;

export async function expectNoHorizontalOverflow(
  page: Page,
  context = page.url(),
) {
  await page.waitForLoadState("domcontentloaded");

  await expect
    .poll(
      () =>
        page.evaluate(() => {
          const bodyScrollWidth = document.body?.scrollWidth ?? 0;
          const documentScrollWidth = document.documentElement.scrollWidth;

          return Math.max(bodyScrollWidth, documentScrollWidth) - window.innerWidth;
        }),
      {
        message: `${context} should not create page-level horizontal overflow`,
      },
    )
    .toBeLessThanOrEqual(1);

  const diagnostics = await page.evaluate(() => {
    const viewportWidth = window.innerWidth;
    const bodyScrollWidth = document.body?.scrollWidth ?? 0;
    const documentScrollWidth = document.documentElement.scrollWidth;
    const overflowAmount =
      Math.max(bodyScrollWidth, documentScrollWidth) - viewportWidth;
    const offenders = Array.from(document.body.querySelectorAll<HTMLElement>("*"))
      .map((element) => {
        const rect = element.getBoundingClientRect();

        if (rect.width <= 0 || rect.height <= 0) {
          return null;
        }

        if (rect.left >= -1 && rect.right <= viewportWidth + 1) {
          return null;
        }

        const className =
          typeof element.className === "string" ? element.className : "";
        const label =
          element.getAttribute("aria-label") ??
          element.textContent?.trim().slice(0, 40) ??
          "";

        return {
          className,
          label,
          left: Math.round(rect.left),
          right: Math.round(rect.right),
          tagName: element.tagName.toLowerCase(),
          width: Math.round(rect.width),
        };
      })
      .filter(Boolean)
      .slice(0, 5);

    return {
      bodyScrollWidth,
      documentScrollWidth,
      offenders,
      overflowAmount,
      viewportWidth,
    };
  });

  expect(
    diagnostics.overflowAmount,
    `${context} overflow diagnostics: ${JSON.stringify(diagnostics)}`,
  ).toBeLessThanOrEqual(1);
}

export async function seedSession(page: Page, role: "owner" | "user") {
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

export async function createProduct(
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
  await page
    .getByRole("textbox", { exact: true, name: "Залишок" })
    .fill(product.stock);
  await page.getByRole("button", { name: "Далі" }).click();
  await page.getByLabel("URL зображення").fill(product.imageUrl);
  await page.getByRole("button", { name: "Далі" }).click();
  await expect(page.getByRole("heading", { name: "Перевірка" })).toBeVisible();
  await page.getByRole("button", { name: "Створити товар" }).click();
  await page.waitForURL(/\/dashboard\/products$/);
}

export async function saveOwnerShippingSettings(page: Page) {
  const stamp = Date.now();

  await page.goto("/dashboard/settings/shipping");
  await expect(page.getByRole("heading", { name: "Доставка" })).toBeVisible();

  const apiKeyInput = page.getByLabel("API ключ Nova Post");

  if (await apiKeyInput.isVisible()) {
    await apiKeyInput.fill(`fake-owner-nova-post-key-${stamp}`);
  }

  await page.getByLabel("ПІБ відправника").fill("Олена Петренко");
  await page.getByLabel("Телефон відправника").fill("+380671234567");
  await page.getByLabel("Email відправника").fill("olena@example.com");
  await page.getByLabel("Код країни").fill("UA");
  await page.getByLabel("ID відділення або філії").fill("11759");
  await page.getByLabel("Назва компанії").fill("Dase Jewelry");
  await page.getByLabel("ІПН або ЄДРПОУ компанії").fill("12345678");
  await page.getByLabel("Створення відправлень увімкнено").check();
  await page.getByRole("button", { name: "Зберегти налаштування" }).click();
  await expect(page.getByText("Налаштування доставки збережено")).toBeVisible();
  await expect(page.getByText("API ключ збережено")).toBeVisible();
}

export async function createPublicOrderLink(
  page: Page,
  input: {
    productName: string;
    quantity?: string;
  },
) {
  await page.goto("/dashboard/orders/new");
  await page.getByLabel(`Додати ${input.productName}`).check();
  await page.getByRole("button", { name: "Далі" }).click();
  await page
    .getByRole("spinbutton", {
      name: `Кількість для ${input.productName}`,
    })
    .fill(input.quantity ?? "1");
  await page.getByRole("button", { name: "Далі" }).click();
  await page.getByRole("button", { name: "Створити посилання" }).click();
  await expect(page.getByRole("heading", { name: "Посилання" })).toBeVisible();

  return page
    .getByRole("textbox", { name: "Публічне посилання" })
    .inputValue();
}

export async function confirmPublicOrderDelivery(
  page: Page,
  input: {
    customerName: string;
    customerInstagram?: string;
    customerPhone: string;
    publicUrl: string;
  },
) {
  await saveOwnerShippingSettings(page);
  await page.goto(input.publicUrl);
  await page
    .getByRole("link", { name: "Перейти до доставки й оплати" })
    .click();
  await page.getByLabel("Повне ім’я").fill(input.customerName);
  await page.getByLabel("Телефон").fill(input.customerPhone);
  if (input.customerInstagram) {
    await page.getByLabel("Instagram нікнейм").fill(input.customerInstagram);
  }
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
    page.getByRole("heading", { name: /Замовлення #/ }),
  ).toBeVisible();
  await expect(page.getByText(/Ваше замовлення обробляється/)).toBeVisible();
}

export async function createConfirmedOrder(
  page: Page,
  input: {
    customerName: string;
    customerPhone: string;
    productName: string;
  },
) {
  const publicUrl = await createPublicOrderLink(page, {
    productName: input.productName,
  });

  await confirmPublicOrderDelivery(page, {
    customerName: input.customerName,
    customerPhone: input.customerPhone,
    publicUrl,
  });

  return publicUrl;
}
