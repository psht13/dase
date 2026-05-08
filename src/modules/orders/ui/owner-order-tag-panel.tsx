"use client";

import { Plus, Tag, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useRef, useState, useTransition } from "react";
import type { OrderTagRecord } from "@/modules/orders/application/order-tag-repository";
import type { OwnerOrderActionResult } from "@/modules/orders/ui/owner-order-actions";
import { ActionFeedbackMessage } from "@/shared/ui/action-feedback-message";
import { Button } from "@/shared/ui/button";

type OwnerOrderTagPanelProps = {
  actions: {
    assign: (formData: FormData) => Promise<OwnerOrderActionResult>;
    createAndAssign: (formData: FormData) => Promise<OwnerOrderActionResult>;
    remove: (formData: FormData) => Promise<OwnerOrderActionResult>;
  };
  assignedTags: OrderTagRecord[];
  availableTags: OrderTagRecord[];
};

export function OwnerOrderTagPanel({
  actions,
  assignedTags,
  availableTags,
}: OwnerOrderTagPanelProps) {
  const router = useRouter();
  const createFormRef = useRef<HTMLFormElement>(null);
  const [message, setMessage] = useState<OwnerOrderActionResult | null>(null);
  const [isPending, startTransition] = useTransition();
  const unassignedTags = availableTags.filter(
    (tag) => !assignedTags.some((assignedTag) => assignedTag.id === tag.id),
  );

  function runAction(
    formData: FormData,
    action: (formData: FormData) => Promise<OwnerOrderActionResult>,
    reset?: () => void,
  ) {
    setMessage(null);
    startTransition(() => {
      void action(formData).then((result) => {
        setMessage(result);

        if (result.ok) {
          reset?.();
          router.refresh();
        }
      });
    });
  }

  return (
    <section className="grid gap-4">
      <div>
        <h2 className="text-lg font-semibold">Теги замовлення</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Позначайте замовлення для швидкого пошуку та фільтрації.
        </p>
      </div>

      {message ? (
        <ActionFeedbackMessage
          kind={message.ok ? "success" : "error"}
          message={message.message}
        />
      ) : isPending ? (
        <ActionFeedbackMessage kind="pending" message="Оновлюємо теги…" />
      ) : null}

      <div className="flex flex-wrap gap-2">
        {assignedTags.length ? (
          assignedTags.map((tag) => (
            <form
              action={(formData) => runAction(formData, actions.remove)}
              key={tag.id}
            >
              <input name="tagId" type="hidden" value={tag.id} />
              <Button
                aria-label={`Зняти тег ${tag.name}`}
                disabled={isPending}
                size="sm"
                type="submit"
                variant="destructiveOutline"
              >
                <Tag aria-hidden="true" className="size-4" />
                {tag.name}
                <X aria-hidden="true" className="size-4" />
              </Button>
            </form>
          ))
        ) : (
          <p
            className="rounded-md border border-dashed bg-muted/20 p-3 text-sm text-muted-foreground"
            role="status"
          >
            У замовлення ще немає тегів. Створіть новий тег або додайте
            наявний, щоб швидше знаходити це замовлення у списку.
          </p>
        )}
      </div>

      <div className="grid gap-3">
        <form
          action={(formData) =>
            runAction(formData, actions.createAndAssign, () =>
              createFormRef.current?.reset(),
            )
          }
          className="grid gap-2"
          ref={createFormRef}
        >
          <label className="text-sm font-medium" htmlFor="new-order-tag">
            Новий тег
          </label>
          <div className="flex flex-col gap-2 sm:flex-row">
            <input
              autoComplete="off"
              className="h-11 min-w-0 flex-1 rounded-md border border-input bg-background px-3 text-sm"
              id="new-order-tag"
              name="tagName"
              placeholder="Наприклад: Подарунок"
            />
            <Button className="w-full sm:w-auto" disabled={isPending} type="submit">
              <Plus aria-hidden="true" className="size-4" />
              Додати
            </Button>
          </div>
        </form>

        <form
          action={(formData) => runAction(formData, actions.assign)}
          className="grid gap-2"
        >
          <label className="text-sm font-medium" htmlFor="existing-order-tag">
            Додати наявний тег
          </label>
          <div className="flex flex-col gap-2 sm:flex-row">
            <select
              autoComplete="off"
              className="h-11 min-w-0 flex-1 rounded-md border border-input bg-background px-3 text-sm"
              disabled={!unassignedTags.length}
              id="existing-order-tag"
              name="tagId"
            >
              {unassignedTags.length ? (
                unassignedTags.map((tag) => (
                  <option key={tag.id} value={tag.id}>
                    {tag.name}
                  </option>
                ))
              ) : (
                <option value="">Усі доступні теги вже додано</option>
              )}
            </select>
            <Button
              className="w-full sm:w-auto"
              disabled={isPending || !unassignedTags.length}
              type="submit"
            >
              Додати
            </Button>
          </div>
        </form>
      </div>
    </section>
  );
}
