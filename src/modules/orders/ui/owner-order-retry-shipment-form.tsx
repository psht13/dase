"use client";

import { RotateCcw } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import type { ShipmentRetryActionResult } from "@/modules/shipping/ui/shipment-actions";
import { Button } from "@/shared/ui/button";

type OwnerOrderRetryShipmentFormProps = {
  action: () => Promise<ShipmentRetryActionResult>;
  canRetry: boolean;
};

export function OwnerOrderRetryShipmentForm({
  action,
  canRetry,
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
        <Button disabled={!canRetry || isPending} type="submit" variant="outline">
          <RotateCcw className="size-4" />
          {isPending ? "Планування..." : "Повторити створення відправлення"}
        </Button>
      </form>
    </section>
  );
}
