"use client";

import { Save } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import type { OwnerOrderActionResult } from "@/modules/orders/ui/owner-order-actions";
import { orderStatusLabels } from "@/modules/orders/application/order-labels";
import {
  canTransitionOrderStatus,
  orderStatuses,
  type OrderStatus,
} from "@/modules/orders/domain/status";
import { ActionFeedbackMessage } from "@/shared/ui/action-feedback-message";
import { Button } from "@/shared/ui/button";

type OwnerOrderStatusFormProps = {
  action: (formData: FormData) => Promise<OwnerOrderActionResult>;
  currentStatus: OrderStatus;
};

export function OwnerOrderStatusForm({
  action,
  currentStatus,
}: OwnerOrderStatusFormProps) {
  const router = useRouter();
  const [message, setMessage] = useState<OwnerOrderActionResult | null>(null);
  const [isPending, startTransition] = useTransition();
  const statusOptions = orderStatuses.filter(
    (status) =>
      status === currentStatus ||
      canTransitionOrderStatus(currentStatus, status),
  );

  function onSubmit(formData: FormData) {
    setMessage(null);
    startTransition(() => {
      void action(formData).then((result) => {
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
        <h2 className="text-lg font-semibold">Ручна зміна статусу</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Доступні лише дозволені переходи для поточного статусу.
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
          message="Оновлюємо статус замовлення…"
        />
      ) : null}

      <form action={onSubmit} className="flex flex-col gap-3 sm:flex-row">
        <label className="grid flex-1 gap-2 text-sm font-medium">
          Новий статус
          <select
            autoComplete="off"
            className="h-11 rounded-md border border-input bg-background px-3 text-sm"
            defaultValue={currentStatus}
            name="status"
          >
            {statusOptions.map((status) => (
              <option key={status} value={status}>
                {orderStatusLabels[status]}
              </option>
            ))}
          </select>
        </label>

        <Button
          className="w-full sm:w-auto sm:self-end"
          disabled={isPending}
          type="submit"
        >
          <Save aria-hidden="true" className="size-4" />
          {isPending ? "Збереження…" : "Оновити статус"}
        </Button>
      </form>
    </section>
  );
}
