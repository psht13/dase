"use client";

import { LogIn } from "lucide-react";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { Button } from "@/shared/ui/button";

export function LoginForm() {
  const router = useRouter();
  const [message, setMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(null);
    setIsSubmitting(true);

    const formData = new FormData(event.currentTarget);
    const response = await fetch("/api/auth/sign-in/email", {
      body: JSON.stringify({
        callbackURL: "/dashboard",
        email: formValue(formData, "email"),
        password: formValue(formData, "password"),
        rememberMe: true,
      }),
      credentials: "same-origin",
      headers: {
        "content-type": "application/json",
      },
      method: "POST",
    });

    setIsSubmitting(false);

    if (!response.ok) {
      setMessage("Електронна пошта або пароль неправильні");
      return;
    }

    router.replace("/dashboard");
    router.refresh();
  }

  return (
    <form className="grid gap-4" onSubmit={onSubmit}>
      {message ? (
        <p
          className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive"
          role="alert"
        >
          {message}
        </p>
      ) : null}

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

      <Button disabled={isSubmitting} type="submit">
        <LogIn aria-hidden="true" className="size-4" />
        {isSubmitting ? "Вхід…" : "Увійти"}
      </Button>
    </form>
  );
}

function formValue(formData: FormData, key: string): string {
  const value = formData.get(key);

  return typeof value === "string" ? value : "";
}
