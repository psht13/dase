import { CreditCard, Power, PowerOff } from "lucide-react";
import type { PaymentRequisiteRecord } from "@/modules/payments/application/payment-requisite-repository";
import { maskPaymentRequisiteDisplayValue } from "@/modules/payments/domain/payment-requisite";
import { createPaymentRequisiteAction } from "@/modules/payments/ui/payment-requisite-actions";
import type { PaymentRequisiteActionState } from "@/modules/payments/ui/payment-requisite-action-state";
import { PaymentRequisiteCopyButton } from "@/modules/payments/ui/payment-requisite-copy-button";
import { PaymentRequisiteForm } from "@/modules/payments/ui/payment-requisite-form";
import { Button } from "@/shared/ui/button";
import { cn } from "@/shared/utils/cn";

type PaymentRequisitesSettingsProps = {
  requisites: PaymentRequisiteRecord[];
  setActiveAction: (requisiteId: string, isActive: boolean) => Promise<void>;
  updateAction: (
    requisiteId: string,
    ...args: Parameters<typeof createPaymentRequisiteAction>
  ) => ReturnType<typeof createPaymentRequisiteAction>;
};

type PaymentRequisiteFormAction = (
  state: PaymentRequisiteActionState,
  formData: FormData,
) => Promise<PaymentRequisiteActionState>;

export function PaymentRequisitesSettings({
  requisites,
  setActiveAction,
  updateAction,
}: PaymentRequisitesSettingsProps) {
  return (
    <div className="grid min-w-0 gap-6">
      <section className="grid min-w-0 gap-4 rounded-md border bg-card p-4 shadow-sm sm:p-5">
        <div className="min-w-0">
          <h2 className="text-lg font-semibold">Нові реквізити</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Додайте картку, IBAN або інші реквізити, які покупці зможуть
            скопіювати для переказу.
          </p>
        </div>
        <PaymentRequisiteForm action={createPaymentRequisiteAction} mode="create" />
      </section>

      <section className="grid min-w-0 gap-4">
        <div className="min-w-0">
          <h2 className="text-lg font-semibold">Збережені реквізити</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Покупці бачать лише активні реквізити. Вимкнені записи залишаються
            в кабінеті для редагування.
          </p>
        </div>

        {requisites.length ? (
          <div
            className="grid min-w-0 gap-4 lg:grid-cols-2"
            data-testid="payment-requisites-list"
          >
            {requisites.map((requisite) => (
              <PaymentRequisiteCard
                key={requisite.id}
                requisite={requisite}
                setActiveAction={setActiveAction}
                updateAction={updateAction.bind(null, requisite.id)}
              />
            ))}
          </div>
        ) : (
          <div className="rounded-md border border-dashed p-6 text-center sm:p-8">
            <p className="mx-auto max-w-xl text-sm text-muted-foreground">
              Додайте картку або реквізити, які покупці бачитимуть під час
              оплати.
            </p>
          </div>
        )}
      </section>
    </div>
  );
}

function PaymentRequisiteCard({
  requisite,
  setActiveAction,
  updateAction,
}: {
  requisite: PaymentRequisiteRecord;
  setActiveAction: PaymentRequisitesSettingsProps["setActiveAction"];
  updateAction: PaymentRequisiteFormAction;
}) {
  return (
    <article className="grid min-w-0 gap-4 rounded-md border bg-card p-4 shadow-sm">
      <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="flex min-w-0 flex-wrap items-center gap-2">
            <CreditCard
              aria-hidden="true"
              className="size-4 text-muted-foreground"
            />
            <h3 className="break-words font-semibold">{requisite.label}</h3>
            <PaymentRequisiteStatusBadge isActive={requisite.isActive} />
          </div>
          <dl className="mt-3 grid min-w-0 gap-2 text-sm">
            <InfoRow label="Банк" value={requisite.bankName} />
            <InfoRow label="Отримувач" value={requisite.recipientName} />
            <InfoRow
              label="Реквізити"
              value={maskPaymentRequisiteDisplayValue(requisite.displayValue)}
            />
            <InfoRow label="Порядок" value={String(requisite.sortOrder)} />
          </dl>
          {requisite.note ? (
            <p className="mt-3 break-words text-sm text-muted-foreground">
              {requisite.note}
            </p>
          ) : null}
        </div>
      </div>

      <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:items-center">
        <PaymentRequisiteCopyButton displayValue={requisite.displayValue} />
        <form
          action={setActiveAction.bind(null, requisite.id, !requisite.isActive)}
          className="min-w-0"
        >
          <Button className="w-full sm:w-auto" size="sm" type="submit" variant="outline">
            {requisite.isActive ? (
              <PowerOff aria-hidden="true" className="size-4" />
            ) : (
              <Power aria-hidden="true" className="size-4" />
            )}
            {requisite.isActive ? "Вимкнути" : "Увімкнути"}
          </Button>
        </form>
      </div>

      <details className="group min-w-0 rounded-md border border-border/80 bg-background p-3">
        <summary className="cursor-pointer text-sm font-medium">
          Редагувати
        </summary>
        <div className="mt-4">
          <PaymentRequisiteForm
            action={updateAction}
            defaultValues={requisite}
            mode="edit"
          />
        </div>
      </details>
    </article>
  );
}

function PaymentRequisiteStatusBadge({ isActive }: { isActive: boolean }) {
  return (
    <span
      className={cn(
        "inline-flex rounded-md px-2 py-1 text-xs font-medium",
        isActive
          ? "bg-emerald-100 text-emerald-800"
          : "bg-muted text-muted-foreground",
      )}
    >
      {isActive ? "Активні" : "Вимкнені"}
    </span>
  );
}

function InfoRow({ label, value }: { label: string; value?: string | null }) {
  return (
    <div className="grid min-w-0 gap-1 sm:grid-cols-[7rem_minmax(0,1fr)]">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="min-w-0 break-words font-medium">{value || "Не вказано"}</dd>
    </div>
  );
}
