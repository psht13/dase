export type LoginActionState = {
  fieldErrors?: Record<string, string[]>;
  message: string | null;
  ok: boolean;
};

export const initialLoginActionState: LoginActionState = {
  message: null,
  ok: false,
};
