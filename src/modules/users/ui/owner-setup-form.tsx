"use client";

import { UserPlus } from "lucide-react";
import { useActionState } from "react";
import {
  createFirstOwnerAction,
  initialOwnerSetupActionState,
} from "@/modules/users/ui/owner-setup-actions";
import { Button } from "@/shared/ui/button";

type OwnerSetupFormProps = {
  setupToken: string;
};

export function OwnerSetupForm({ setupToken }: OwnerSetupFormProps) {
  const [state, formAction, isPending] = useActionState(
    createFirstOwnerAction,
    initialOwnerSetupActionState,
  );

  return (
    <form action={formAction} className="grid gap-4">
      <input name="setupToken" type="hidden" value={setupToken} />

      {state.message ? (
        <p
          className={
            state.ok
              ? "rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-950"
              : "rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive"
          }
          role={state.ok ? "status" : "alert"}
        >
          {state.message}
        </p>
      ) : null}

      <FieldError messages={state.fieldErrors?.name} />
      <label className="grid gap-2 text-sm font-medium">
        Ім’я власника
        <input
          autoComplete="name"
          className="rounded-md border border-input bg-background px-3 py-2 text-base outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring"
          name="name"
          placeholder="Олена"
          required
        />
      </label>

      <FieldError messages={state.fieldErrors?.email} />
      <label className="grid gap-2 text-sm font-medium">
        Електронна пошта
        <input
          autoComplete="email"
          className="rounded-md border border-input bg-background px-3 py-2 text-base outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring"
          name="email"
          placeholder="owner@example.com"
          required
          type="email"
        />
      </label>

      <FieldError messages={state.fieldErrors?.password} />
      <label className="grid gap-2 text-sm font-medium">
        Пароль
        <input
          autoComplete="new-password"
          className="rounded-md border border-input bg-background px-3 py-2 text-base outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring"
          name="password"
          placeholder="Створіть пароль"
          required
          type="password"
        />
      </label>

      <Button disabled={isPending} type="submit">
        <UserPlus aria-hidden="true" className="size-4" />
        {isPending ? "Створення…" : "Створити власника"}
      </Button>
    </form>
  );
}

function FieldError({ messages }: { messages?: string[] }) {
  if (!messages?.length) {
    return null;
  }

  return (
    <p className="text-sm text-destructive" role="alert">
      {messages[0]}
    </p>
  );
}
