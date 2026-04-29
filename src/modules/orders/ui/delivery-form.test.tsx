import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { DeliveryActionResult } from "@/modules/orders/ui/delivery-actions";
import { DeliveryForm } from "@/modules/orders/ui/delivery-form";

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    refresh: vi.fn(),
  }),
}));

describe("DeliveryForm", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("renders Ukrainian labels and validation messages", async () => {
    const user = userEvent.setup();
    const action = vi.fn();

    render(<DeliveryForm action={action} />);

    expect(screen.getByLabelText("Повне ім’я")).toBeVisible();
    expect(screen.getByLabelText("Телефон")).toBeVisible();
    expect(screen.getByLabelText("Служба доставки")).toBeVisible();
    expect(screen.getByLabelText("Місто або населений пункт")).toBeVisible();
    expect(
      screen.getByLabelText("Відділення або поштове відділення"),
    ).toBeVisible();
    expect(screen.getByLabelText("Спосіб оплати")).toBeVisible();

    await user.click(
      screen.getByRole("button", { name: "Підтвердити замовлення" }),
    );

    expect(await screen.findByText("Вкажіть ім’я та прізвище")).toBeVisible();
    expect(
      screen.getByText("Вкажіть телефон у форматі +380XXXXXXXXX"),
    ).toBeVisible();
    expect(screen.getByText("Оберіть місто зі списку")).toBeVisible();
    expect(screen.getByText("Оберіть відділення зі списку")).toBeVisible();
    expect(action).not.toHaveBeenCalled();
  });

  it("submits selected carrier directory DTOs to the action", async () => {
    const user = userEvent.setup();
    const action = vi.fn(
      async (formData: FormData): Promise<DeliveryActionResult> => {
        expect(formData).toBeInstanceOf(FormData);

        return {
          message: "Замовлення підтверджено",
          ok: true,
        };
      },
    );
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

    render(<DeliveryForm action={action} />);

    await user.type(screen.getByLabelText("Повне ім’я"), "Олена Петренко");
    await user.clear(screen.getByLabelText("Телефон"));
    await user.type(screen.getByLabelText("Телефон"), "+380671234567");
    await user.type(screen.getByLabelText("Місто або населений пункт"), "Київ");
    await user.click(
      await screen.findByRole("button", { name: /Київ.*Київська область/ }),
    );
    await user.click(
      await screen.findByRole("button", { name: /Відділення №1/ }),
    );
    await user.selectOptions(screen.getByLabelText("Спосіб оплати"), [
      "CASH_ON_DELIVERY",
    ]);
    await user.click(
      screen.getByRole("button", { name: "Підтвердити замовлення" }),
    );

    await waitFor(() => expect(action).toHaveBeenCalledTimes(1));
    const formData = action.mock.calls[0][0];

    expect(formData.get("cityId")).toBe("city-1");
    expect(formData.get("warehouseId")).toBe("warehouse-1");
    expect(formData.get("paymentMethod")).toBe("CASH_ON_DELIVERY");
    expect(await screen.findByText("Замовлення підтверджено")).toBeVisible();
  });
});

function jsonResponse(body: unknown): Response {
  return {
    json: vi.fn(async () => body),
    ok: true,
  } as unknown as Response;
}
