export type OwnerSetupActionState = {
  fieldErrors?: Record<string, string[]>;
  message: string | null;
  ok: boolean;
};

export const initialOwnerSetupActionState: OwnerSetupActionState = {
  message: null,
  ok: false,
};
