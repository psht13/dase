import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { DeliveryActionResult } from "@/modules/orders/ui/delivery-actions";
import { DeliveryForm } from "@/modules/orders/ui/delivery-form";

const router = vi.hoisted(() => ({
  push: vi.fn(),
  refresh: vi.fn(),
}));

const activePaymentRequisites = [
  {
    bankName: "ПриватБанк",
    displayValue: "4441 1111 2222 3333",
    id: "requisite-1",
    label: "Основна картка",
    note: "Після оплати надішліть квитанцію",
    recipientName: "Олена Петренко",
  },
];

vi.mock("next/navigation", () => ({
  useRouter: () => router,
}));

describe("DeliveryForm", () => {
  afterEach(() => {
    vi.clearAllMocks();
    vi.unstubAllGlobals();
  });

  it("renders Ukrainian step navigation and validates contacts first", async () => {
    const user = userEvent.setup();
    const action = vi.fn();

    render(
      <DeliveryForm action={action} paymentRequisites={activePaymentRequisites} />,
    );

    expect(screen.getByRole("heading", { name: "Контакти" })).toBeVisible();
    expect(screen.getAllByText("Крок 1 із 4")[0]).toBeVisible();
    expect(screen.getByText("Доставка")).toBeVisible();
    expect(screen.getByText("Оплата")).toBeVisible();
    expect(screen.getByText("Перевірка")).toBeVisible();
    expect(screen.getByLabelText("Повне ім’я")).toBeVisible();
    expect(screen.getByLabelText("Instagram нікнейм")).toBeVisible();
    expect(
      screen.getByText("Допоможе продавцю швидше знайти вашу переписку."),
    ).toBeVisible();
    expect(screen.queryByLabelText("Служба доставки")).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Далі" }));

    expect(await screen.findByText("Вкажіть ім’я та прізвище")).toBeVisible();
    expect(
      screen.getByText("Вкажіть телефон у форматі +380XXXXXXXXX"),
    ).toBeVisible();
    expect(screen.getByRole("heading", { name: "Контакти" })).toBeVisible();
    expect(action).not.toHaveBeenCalled();
  });

  it("navigates between contact and delivery steps", async () => {
    const user = userEvent.setup();

    render(
      <DeliveryForm
        action={vi.fn()}
        paymentRequisites={activePaymentRequisites}
      />,
    );

    await fillContacts(user);
    await user.click(screen.getByRole("button", { name: "Далі" }));

    expect(screen.getByRole("heading", { name: "Доставка" })).toBeVisible();
    expect(screen.getByLabelText("Служба доставки")).toHaveValue(
      "NOVA_POSHTA",
    );
    expect(screen.getByRole("option", { name: "Нова пошта" })).toBeVisible();
    expect(screen.queryByRole("option", { name: /Укрпошта/ })).toBeNull();

    await user.click(screen.getByRole("button", { name: "Назад" }));

    expect(screen.getByRole("heading", { name: "Контакти" })).toBeVisible();
    expect(screen.getByLabelText("Повне ім’я")).toHaveValue("Олена Петренко");
  });

  it("keeps city and warehouse lookup selection mobile-friendly", async () => {
    const user = userEvent.setup();
    stubCarrierLookup();

    render(
      <DeliveryForm
        action={vi.fn()}
        paymentRequisites={activePaymentRequisites}
      />,
    );

    await fillContacts(user);
    await user.click(screen.getByRole("button", { name: "Далі" }));
    await selectDelivery(user);

    expect(screen.getByText("Обране місто")).toBeVisible();
    expect(screen.getAllByText("Київ")[0]).toBeVisible();
    expect(screen.getByText("Обране відділення")).toBeVisible();
    expect(screen.getAllByText("Відділення №1")[0]).toBeVisible();
    expect(screen.getAllByText("вул. Хрещатик, 1")[0]).toBeVisible();
    expect(screen.getByText("Підсумок доставки")).toBeVisible();

    await user.click(screen.getByRole("button", { name: "Змінити відділення" }));

    expect(screen.getByLabelText("Відділення або поштове відділення")).toHaveValue(
      "",
    );
    expect(screen.queryByText("Обране відділення")).not.toBeInTheDocument();
  });

  it("shows the payment step and final review before cash confirmation", async () => {
    const user = userEvent.setup();
    const submittedForms: FormData[] = [];
    const action = vi.fn(
      async (formData: FormData): Promise<DeliveryActionResult> => {
        submittedForms.push(formData);

        return {
          message: "Замовлення підтверджено. Оплата при отриманні.",
          ok: true,
          statusPageUrl: "/o/public-token",
        };
      },
    );
    stubCarrierLookup();

    render(
      <DeliveryForm action={action} paymentRequisites={activePaymentRequisites} />,
    );

    await completeDeliveryStep(user);
    await user.click(screen.getByRole("button", { name: "Далі" }));

    expect(screen.getByRole("heading", { name: "Оплата" })).toBeVisible();
    expect(
      screen.getByRole("radio", { name: /Оплата картою онлайн/ }),
    ).toBeChecked();
    expect(screen.queryByText(/MonoPay|Monobank/i)).not.toBeInTheDocument();
    expect(
      screen.getByText(/Переказ можна зробити на одну з карток нижче/),
    ).toBeVisible();
    expect(screen.getByText("4441 1111 2222 3333")).toBeVisible();

    await user.click(screen.getByRole("radio", { name: /Післяплата/ }));
    await user.click(screen.getByRole("button", { name: "Далі" }));

    expect(screen.getByRole("heading", { name: "Перевірка" })).toBeVisible();
    expect(screen.getByRole("heading", { name: "Контакти" })).toBeVisible();
    expect(screen.getByRole("heading", { name: "Доставка" })).toBeVisible();
    expect(screen.getByRole("heading", { name: "Оплата" })).toBeVisible();
    expect(screen.getByText("Олена Петренко")).toBeVisible();
    expect(screen.getByText("@olena.shop")).toBeVisible();
    expect(screen.getByText("Післяплата")).toBeVisible();

    await user.dblClick(
      screen.getByRole("button", { name: "Підтвердити замовлення" }),
    );

    await waitFor(() => expect(action).toHaveBeenCalledTimes(1));
    const formData = submittedForms[0];

    expect(formData?.get("cityId")).toBe("city-1");
    expect(formData?.get("instagramUsername")).toBe("olena.shop");
    expect(formData?.get("warehouseId")).toBe("warehouse-1");
    expect(formData?.get("paymentMethod")).toBe("CASH_ON_DELIVERY");
    expect(
      await screen.findByText("Замовлення підтверджено. Оплата при отриманні."),
    ).toBeVisible();
    expect(router.push).toHaveBeenCalledWith("/o/public-token");
  });

  it("uses cash on delivery as the fallback when no active requisites exist", async () => {
    const user = userEvent.setup();
    const submittedForms: FormData[] = [];
    const action = vi.fn(
      async (formData: FormData): Promise<DeliveryActionResult> => {
        submittedForms.push(formData);

        return {
          message: "Замовлення підтверджено. Оплата при отриманні.",
          ok: true,
          statusPageUrl: "/o/public-token",
        };
      },
    );
    stubCarrierLookup();

    render(<DeliveryForm action={action} paymentRequisites={[]} />);

    await completeDeliveryStep(user);
    await user.click(screen.getByRole("button", { name: "Далі" }));
    expect(screen.queryByRole("radio", { name: /MonoPay/ })).toBeNull();
    expect(
      screen.queryByRole("radio", { name: /Оплата картою онлайн/ }),
    ).toBeNull();
    expect(screen.getByRole("radio", { name: /Післяплата/ })).toBeChecked();
    await user.click(screen.getByRole("button", { name: "Далі" }));
    await user.click(
      screen.getByRole("button", { name: "Підтвердити замовлення" }),
    );

    await waitFor(() => expect(action).toHaveBeenCalledTimes(1));
    expect(submittedForms[0]?.get("paymentMethod")).toBe("CASH_ON_DELIVERY");
    expect(
      await screen.findByText("Замовлення підтверджено. Оплата при отриманні."),
    ).toBeVisible();
  });
});

async function completeDeliveryStep(
  user: ReturnType<typeof userEvent.setup>,
) {
  await fillContacts(user);
  await user.click(screen.getByRole("button", { name: "Далі" }));
  await selectDelivery(user);
}

async function fillContacts(user: ReturnType<typeof userEvent.setup>) {
  await user.type(screen.getByLabelText("Повне ім’я"), "Олена Петренко");
  await user.clear(screen.getByLabelText("Телефон"));
  await user.type(screen.getByLabelText("Телефон"), "+380671234567");
  await user.type(screen.getByLabelText("Instagram нікнейм"), "olena.shop");
}

async function selectDelivery(user: ReturnType<typeof userEvent.setup>) {
  await user.type(screen.getByLabelText("Місто або населений пункт"), "Київ");
  await user.click(
    await screen.findByRole("button", { name: /Київ.*Київська область/ }),
  );
  await user.click(
    await screen.findByRole("button", { name: /Відділення №1/ }),
  );
}

function stubCarrierLookup() {
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: string) => {
      if (url.includes("/api/carriers/cities")) {
        return jsonResponse({
          cities: [
            { id: "city-1", name: "Київ", region: "Київська область" },
          ],
        });
      }

      return jsonResponse({
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
      });
    }),
  );
}

function jsonResponse(body: unknown): Response {
  return {
    json: vi.fn(async () => body),
    ok: true,
  } as unknown as Response;
}
