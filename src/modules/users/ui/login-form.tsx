"use client";

import { LogIn } from "lucide-react";
import { useActionState } from "react";
import { initialLoginActionState } from "@/modules/users/ui/login-action-state";
import { loginOwnerAction } from "@/modules/users/ui/login-actions";
import { Button } from "@/shared/ui/button";

export function LoginForm() {
  const [state, formAction, isPending] = useActionState(
    loginOwnerAction,
    initialLoginActionState,
  );

  return (
    <form action={formAction} className="grid gap-4">
      {state.message ? (
        <p
          className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive"
          role="alert"
        >
          {state.message}
        </p>
      ) : null}

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
          autoComplete="current-password"
          className="rounded-md border border-input bg-background px-3 py-2 text-base outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring"
          name="password"
          placeholder="Введіть пароль"
          required
          type="password"
        />
      </label>

      <Button disabled={isPending} type="submit">
        <LogIn aria-hidden="true" className="size-4" />
        {isPending ? "Вхід…" : "Увійти"}
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
