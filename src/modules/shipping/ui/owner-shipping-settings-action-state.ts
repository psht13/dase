import type { OwnerShippingSettingsFormValues } from "@/modules/shipping/ui/owner-shipping-settings-form-data";

export type OwnerShippingSettingsFieldErrors = Record<string, string[]>;

export type OwnerShippingSettingsActionState = {
  fieldErrors: OwnerShippingSettingsFieldErrors;
  message: string | null;
  ok: boolean;
  settings?: OwnerShippingSettingsFormValues;
};

export type OwnerShippingConnectionTestActionState = {
  checkedAtIso: string | null;
  message: string | null;
  ok: boolean | null;
};

export const initialOwnerShippingSettingsActionState: OwnerShippingSettingsActionState =
  {
    fieldErrors: {},
    message: null,
    ok: false,
  };

export const initialOwnerShippingConnectionTestActionState: OwnerShippingConnectionTestActionState =
  {
    checkedAtIso: null,
    message: null,
    ok: null,
  };
