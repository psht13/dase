"use client";

import { RotateCcw } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import type { ShipmentRetryActionResult } from "@/modules/shipping/ui/shipment-actions";
import { ActionFeedbackMessage } from "@/shared/ui/action-feedback-message";
import { Button } from "@/shared/ui/button";

type OwnerOrderRetryShipmentFormProps = {
  action: () => Promise<ShipmentRetryActionResult>;
  canRetry: boolean;
  notice?: string | null;
};

export function OwnerOrderRetryShipmentForm({
  action,
  canRetry,
  notice,
}: OwnerOrderRetryShipmentFormProps) {
  const router = useRouter();
  const [message, setMessage] = useState<ShipmentRetryActionResult | null>(null);
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
        <h2 className="text-lg font-semibold">Повтор створення відправлення</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Повторне створення доступне для відправлень зі статусом помилки.
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
          message="Плануємо повторне створення відправлення…"
        />
      ) : null}

      {notice ? (
        <p className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-950">
          {notice}
        </p>
      ) : null}

      <form action={onSubmit}>
        <Button
          className="w-full sm:w-auto"
          disabled={!canRetry || isPending}
          type="submit"
          variant="outline"
        >
          <RotateCcw aria-hidden="true" className="size-4" />
          {isPending ? "Планування…" : "Повторити створення відправлення"}
        </Button>
      </form>
    </section>
  );
}
