"use client";

import { CreditCard } from "lucide-react";
import { useState, useTransition } from "react";
import type { PaymentRetryActionResult } from "@/modules/payments/ui/payment-actions";
import { ActionFeedbackMessage } from "@/shared/ui/action-feedback-message";
import { Button } from "@/shared/ui/button";

type PaymentRetryFormProps = {
  action: () => Promise<PaymentRetryActionResult>;
};

export function PaymentRetryForm({ action }: PaymentRetryFormProps) {
  const [message, setMessage] = useState<PaymentRetryActionResult | null>(null);
  const [isPending, startTransition] = useTransition();

  function onSubmit() {
    setMessage(null);
    startTransition(() => {
      void action().then((result) => {
        setMessage(result);

        if (result.ok) {
          window.location.assign(result.paymentRedirectUrl);
        }
      });
    });
  }

  return (
    <div className="grid gap-3">
      {message ? (
        <ActionFeedbackMessage
          kind={message.ok ? "success" : "error"}
          message={message.message}
        />
      ) : isPending ? (
        <ActionFeedbackMessage
          kind="pending"
          message="Створюємо нове посилання для оплати…"
        />
      ) : null}

      <form action={onSubmit}>
        <Button className="w-full sm:w-auto" disabled={isPending} type="submit">
          <CreditCard aria-hidden="true" className="size-4" />
          {isPending ? "Створення посилання…" : "Повторити оплату"}
        </Button>
      </form>
    </div>
  );
}
