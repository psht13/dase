import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ComponentProps } from "react";
import type { OwnerShippingSettingsActionState } from "@/modules/shipping/ui/owner-shipping-settings-action-state";
import type { OwnerShippingSettingsFormValues } from "@/modules/shipping/ui/owner-shipping-settings-form-data";
import { defaultOwnerShippingSettingsFormValues } from "@/modules/shipping/ui/owner-shipping-settings-form-data";
import { OwnerShippingSettingsForm } from "@/modules/shipping/ui/owner-shipping-settings-form";

const savedSettings: OwnerShippingSettingsFormValues = {
  ...defaultOwnerShippingSettingsFormValues,
  apiKeyConfigured: true,
  apiKeyPreview: "****7890",
  formVersion: "saved",
  id: "settings-1",
  senderDivisionId: "11759",
  senderName: "Олена Петренко",
  senderPhone: "+380671234567",
};

describe("OwnerShippingSettingsForm", () => {
  it("renders Ukrainian labels and chooses the test Nova Post endpoint by default", () => {
    renderForm();

    expect(screen.getByRole("heading", { name: "API доступ" })).toBeVisible();
    expect(screen.getByRole("heading", { name: "Відправник" })).toBeVisible();
    expect(
      screen.getByRole("heading", { name: "Параметри посилки" }),
    ).toBeVisible();
    expect(screen.getByRole("heading", { name: "Перевірка" })).toBeVisible();
    expect(screen.getByLabelText("Середовище API")).toHaveValue("stage");
    expect(
      screen.getByText("https://api-stage.novapost.pl/v.1.0/"),
    ).toBeVisible();
    expect(
      screen.getByRole("option", { name: "Виробниче середовище global" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("option", { name: "Виробниче середовище Україна" }),
    ).toBeInTheDocument();
    expect(screen.getByText("URL авторизації")).toBeInTheDocument();
    expect(screen.queryByText("Auth URL override")).not.toBeInTheDocument();
    expect(
      screen.getByLabelText(/Створення відправлень увімкнено/),
    ).not.toBeChecked();
  });

  it("marks custom API URL as HTTPS-only input", async () => {
    const user = userEvent.setup();

    renderForm();

    await user.selectOptions(screen.getByLabelText("Середовище API"), "custom");

    expect(screen.getByLabelText("Адреса API")).toHaveAttribute("type", "url");
    expect(screen.getByLabelText("Адреса API")).toHaveAttribute(
      "pattern",
      "https://.*",
    );
  });

  it("shows only the saved API key preview and submits a replacement key when requested", async () => {
    const user = userEvent.setup();
    let submittedFormData: FormData | null = null;
    const updateAction = vi.fn(
      async (
        _state: OwnerShippingSettingsActionState,
        formData: FormData,
      ): Promise<OwnerShippingSettingsActionState> => {
        submittedFormData = formData;

        return {
          fieldErrors: {},
          message: "Налаштування доставки збережено",
          ok: true,
          settings: {
            ...savedSettings,
            apiKeyPreview: "****4321",
            formVersion: "updated",
          },
        };
      },
    );

    renderForm({ settings: savedSettings, updateAction });

    expect(screen.getByText("API ключ збережено")).toBeVisible();
    expect(screen.getByText("****7890")).toBeVisible();
    expect(screen.queryByText("owner-nova-post-secret-7890")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("API ключ Nova Post")).not.toBeInTheDocument();

    await user.click(screen.getByLabelText(/Замінити API ключ/));
    await user.type(screen.getByLabelText("API ключ Nova Post"), "new-secret-4321");
    await user.click(
      screen.getByRole("button", { name: "Зберегти налаштування" }),
    );

    await waitFor(() => expect(updateAction).toHaveBeenCalled());
    submittedFormData = updateAction.mock.calls[0]?.[1] ?? null;
    expect(submittedFormData?.get("replaceApiKey")).toBe("on");
    expect(submittedFormData?.get("apiKey")).toBe("new-secret-4321");
    expect(await screen.findByText("****4321")).toBeVisible();
  });

  it("submits the enabled state when shipment creation is switched on", async () => {
    const user = userEvent.setup();
    let submittedFormData: FormData | null = null;
    const updateAction = vi.fn(
      async (
        _state: OwnerShippingSettingsActionState,
        formData: FormData,
      ): Promise<OwnerShippingSettingsActionState> => {
        submittedFormData = formData;

        return {
          fieldErrors: {},
          message: "Налаштування доставки збережено",
          ok: true,
        };
      },
    );

    renderForm({ settings: savedSettings, updateAction });

    await user.click(screen.getByLabelText(/Створення відправлень увімкнено/));
    await user.click(
      screen.getByRole("button", { name: "Зберегти налаштування" }),
    );

    await waitFor(() => expect(updateAction).toHaveBeenCalled());
    submittedFormData = updateAction.mock.calls[0]?.[1] ?? null;
    expect(submittedFormData?.get("isEnabled")).toBe("on");
  });
});

function renderForm({
  settings = defaultOwnerShippingSettingsFormValues,
  testConnectionAction = vi.fn(async () => ({
    checkedAtIso: null,
    message: null,
    ok: null,
  })),
  updateAction = vi.fn(async () => ({
    fieldErrors: {},
    message: null,
    ok: false,
  })),
}: {
  settings?: OwnerShippingSettingsFormValues;
  testConnectionAction?: ComponentProps<
    typeof OwnerShippingSettingsForm
  >["testConnectionAction"];
  updateAction?: ComponentProps<typeof OwnerShippingSettingsForm>["updateAction"];
} = {}) {
  return render(
    <OwnerShippingSettingsForm
      settings={settings}
      testConnectionAction={testConnectionAction}
      updateAction={updateAction}
    />,
  );
}
