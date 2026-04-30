"use client";

import { CreditCard } from "lucide-react";
import { useState, useTransition } from "react";
import type { PaymentRetryActionResult } from "@/modules/payments/ui/payment-actions";
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
        <p
          className={
            message.ok
              ? "rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-950"
              : "rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive"
          }
          role={message.ok ? "status" : "alert"}
        >
          {message.message}
        </p>
      ) : null}

      <form action={onSubmit}>
        <Button disabled={isPending} type="submit">
          <CreditCard aria-hidden="true" className="size-4" />
          {isPending ? "Створення посилання…" : "Повторити оплату"}
        </Button>
      </form>
    </div>
  );
}
