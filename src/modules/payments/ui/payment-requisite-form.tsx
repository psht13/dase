"use client";

import { Save } from "lucide-react";
import type { InputHTMLAttributes } from "react";
import { useActionState, useEffect, useRef } from "react";
import type { PaymentRequisiteRecord } from "@/modules/payments/application/payment-requisite-repository";
import { initialPaymentRequisiteActionState } from "@/modules/payments/ui/payment-requisite-action-state";
import type { PaymentRequisiteActionState } from "@/modules/payments/ui/payment-requisite-action-state";
import { Button } from "@/shared/ui/button";
import { FormActions } from "@/shared/ui/page-layout";

type PaymentRequisiteFormProps = {
  action: (
    state: PaymentRequisiteActionState,
    formData: FormData,
  ) => Promise<PaymentRequisiteActionState>;
  defaultValues?: PaymentRequisiteRecord;
  mode: "create" | "edit";
};

const inputClassName =
  "min-h-11 w-full rounded-md border border-input bg-background px-3 py-2 text-base outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring sm:text-sm";

export function PaymentRequisiteForm({
  action,
  defaultValues,
  mode,
}: PaymentRequisiteFormProps) {
  const formRef = useRef<HTMLFormElement>(null);
  const [state, formAction, isPending] = useActionState(
    action,
    initialPaymentRequisiteActionState,
  );

  useEffect(() => {
    if (mode === "create" && state.ok) {
      formRef.current?.reset();
    }
  }, [mode, state.ok]);

  return (
    <form action={formAction} className="grid min-w-0 gap-4" ref={formRef}>
      {state.message ? (
        <p
          className={
            state.ok
              ? "rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-950"
              : "rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive"
          }
          role={state.ok ? "status" : "alert"}
        >
          {state.message}
        </p>
      ) : null}

      <div className="grid min-w-0 gap-4 md:grid-cols-2">
        <FormField
          error={state.fieldErrors?.label?.[0]}
          label="Назва"
          name="label"
          placeholder="Основна картка"
          required
          value={defaultValues?.label}
        />
        <FormField
          error={state.fieldErrors?.bankName?.[0]}
          label="Банк"
          maxLength={80}
          name="bankName"
          placeholder="Назва банку"
          value={defaultValues?.bankName}
        />
      </div>

      <div className="grid min-w-0 gap-4 md:grid-cols-2">
        <FormField
          error={state.fieldErrors?.recipientName?.[0]}
          label="Отримувач"
          maxLength={120}
          name="recipientName"
          placeholder="Ім’я отримувача"
          value={defaultValues?.recipientName}
        />
        <FormField
          error={state.fieldErrors?.sortOrder?.[0]}
          inputMode="numeric"
          label="Порядок"
          min={0}
          name="sortOrder"
          type="number"
          value={String(defaultValues?.sortOrder ?? 0)}
        />
      </div>

      <label className="grid min-w-0 gap-2 text-sm font-medium">
        Номер картки, IBAN або реквізити
        <textarea
          className="min-h-24 w-full resize-y rounded-md border border-input bg-background px-3 py-2 text-base outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring sm:text-sm"
          defaultValue={defaultValues?.displayValue}
          maxLength={120}
          name="displayValue"
          placeholder="4441 1111 2222 3333"
          required
        />
      </label>
      <FieldError message={state.fieldErrors?.displayValue?.[0]} />

      <label className="grid min-w-0 gap-2 text-sm font-medium">
        Примітка
        <textarea
          className="min-h-20 w-full resize-y rounded-md border border-input bg-background px-3 py-2 text-base outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring sm:text-sm"
          defaultValue={defaultValues?.note ?? ""}
          maxLength={240}
          name="note"
          placeholder="Наприклад, вкажіть призначення платежу"
        />
      </label>
      <FieldError message={state.fieldErrors?.note?.[0]} />

      <label className="flex min-w-0 items-start gap-3 rounded-md border border-border/80 bg-background p-3 text-sm">
        <input
          className="mt-1 size-4"
          defaultChecked={defaultValues?.isActive ?? true}
          name="isActive"
          type="checkbox"
        />
        <span className="grid min-w-0 gap-1">
          <span className="font-medium">Активні реквізити</span>
          <span className="text-muted-foreground">
            Активні реквізити показуються покупцям під час оплати.
          </span>
        </span>
      </label>

      <FormActions
        primaryAction={
          <Button disabled={isPending} type="submit">
            <Save aria-hidden="true" className="size-4" />
            {isPending
              ? "Збереження…"
              : mode === "create"
                ? "Додати реквізити"
                : "Зберегти зміни"}
          </Button>
        }
      />
    </form>
  );
}

function FormField({
  error,
  label,
  name,
  value,
  ...inputProps
}: {
  error?: string;
  label: string;
  name: string;
  value?: string | null;
} & Omit<
  InputHTMLAttributes<HTMLInputElement>,
  "defaultValue" | "name" | "value"
>) {
  return (
    <div className="grid min-w-0 gap-2">
      <label className="grid min-w-0 gap-2 text-sm font-medium">
        {label}
        <input
          className={inputClassName}
          defaultValue={value ?? ""}
          maxLength={80}
          name={name}
          {...inputProps}
        />
      </label>
      <FieldError message={error} />
    </div>
  );
}

function FieldError({ message }: { message?: string }) {
  if (!message) {
    return null;
  }

  return (
    <p className="text-sm text-destructive" role="alert">
      {message}
    </p>
  );
}
