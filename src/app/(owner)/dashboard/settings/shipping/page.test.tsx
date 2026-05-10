import { render, screen } from "@testing-library/react";
import { getOwnerShippingSettingsForPage } from "@/modules/shipping/ui/owner-shipping-settings-actions";
import { requireOwnerSession } from "@/modules/users/ui/require-owner-session";
import ShippingSettingsPage from "./page";

vi.mock("@/modules/users/ui/require-owner-session", () => ({
  requireOwnerSession: vi.fn(),
}));

vi.mock("@/modules/shipping/ui/owner-shipping-settings-actions", async () => {
  const formData = await vi.importActual<
    typeof import("@/modules/shipping/ui/owner-shipping-settings-form-data")
  >("@/modules/shipping/ui/owner-shipping-settings-form-data");

  return {
    getOwnerShippingSettingsForPage: vi.fn(async () => ({
      ...formData.defaultOwnerShippingSettingsFormValues,
      senderDivisionId: "",
    })),
    testOwnerNovaPostConnectionAction: vi.fn(),
    updateOwnerShippingSettingsAction: vi.fn(),
  };
});

describe("ShippingSettingsPage", () => {
  it("requires owner access and renders Ukrainian shipping settings", async () => {
    vi.mocked(requireOwnerSession).mockResolvedValue({
      email: "owner@example.com",
      id: "owner-1",
      name: "Власниця",
      role: "owner",
    });

    render(await ShippingSettingsPage());

    expect(requireOwnerSession).toHaveBeenCalled();
    expect(getOwnerShippingSettingsForPage).toHaveBeenCalledWith("owner-1");
    expect(screen.getByRole("heading", { name: "Доставка" })).toBeVisible();
    expect(screen.getByLabelText("Середовище API")).toHaveValue("stage");
    expect(screen.getByLabelText("API ключ Nova Post")).toHaveAttribute(
      "type",
      "password",
    );
  });
});
