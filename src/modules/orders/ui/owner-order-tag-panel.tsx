"use client";

import { Plus, Tag, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useRef, useState, useTransition } from "react";
import type { OrderTagRecord } from "@/modules/orders/application/order-tag-repository";
import type { OwnerOrderActionResult } from "@/modules/orders/ui/owner-order-actions";
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
        <p
          className={
            message.ok
              ? "rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-950"
              : "rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive"
          }
          aria-live="polite"
          role={message.ok ? "status" : "alert"}
        >
          {message.message}
        </p>
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
                variant="outline"
              >
                <Tag aria-hidden="true" className="size-4" />
                {tag.name}
                <X aria-hidden="true" className="size-4" />
              </Button>
            </form>
          ))
        ) : (
          <p className="text-sm text-muted-foreground">
            У замовлення ще немає тегів.
          </p>
        )}
      </div>

      <div className="grid gap-3 md:grid-cols-2">
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
          <div className="flex gap-2">
            <input
              autoComplete="off"
              className="h-10 min-w-0 flex-1 rounded-md border border-input bg-background px-3 text-sm"
              id="new-order-tag"
              name="tagName"
              placeholder="Наприклад: Подарунок"
            />
            <Button disabled={isPending} type="submit">
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
          <div className="flex gap-2">
            <select
              autoComplete="off"
              className="h-10 min-w-0 flex-1 rounded-md border border-input bg-background px-3 text-sm"
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
                <option value="">Немає доступних тегів</option>
              )}
            </select>
            <Button disabled={isPending || !unassignedTags.length} type="submit">
              Додати
            </Button>
          </div>
        </form>
      </div>
    </section>
  );
}
