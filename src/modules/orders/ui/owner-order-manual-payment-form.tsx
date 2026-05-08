"use client";

import { CheckCircle2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import type { OwnerOrderActionResult } from "@/modules/orders/ui/owner-order-actions";
import { ActionFeedbackMessage } from "@/shared/ui/action-feedback-message";
import { Button } from "@/shared/ui/button";

type OwnerOrderManualPaymentFormProps = {
  action: () => Promise<OwnerOrderActionResult>;
};

export function OwnerOrderManualPaymentForm({
  action,
}: OwnerOrderManualPaymentFormProps) {
  const router = useRouter();
  const [message, setMessage] = useState<OwnerOrderActionResult | null>(null);
  const [isPending, startTransition] = useTransition();

  function onSubmit() {
    setMessage(null);
    startTransition(() => {
      void action().then((result) => {
        setMessage(result);

        if (result.ok) {
          router.refresh();
        }
      });
    });
  }

  return (
    <section className="grid gap-4">
      <div>
        <h3 className="text-base font-semibold">
          Підтвердження оплати картою
        </h3>
        <p className="mt-1 text-sm text-muted-foreground">
          Натисніть після того, як отримали переказ і перевірили квитанцію в
          Instagram чаті.
        </p>
      </div>

      {message ? (
        <ActionFeedbackMessage
          kind={message.ok ? "success" : "error"}
          message={message.message}
        />
      ) : isPending ? (
        <ActionFeedbackMessage
          kind="pending"
          message="Підтверджуємо оплату…"
        />
      ) : null}

      <form action={onSubmit}>
        <Button className="w-full sm:w-auto" disabled={isPending} type="submit">
          <CheckCircle2 aria-hidden="true" className="size-4" />
          {isPending ? "Підтвердження…" : "Позначити оплату отриманою"}
        </Button>
      </form>
    </section>
  );
}
