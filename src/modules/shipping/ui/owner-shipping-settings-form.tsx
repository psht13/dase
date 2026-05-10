"use client";

import {
  CheckCircle2,
  KeyRound,
  type LucideIcon,
  PackageCheck,
  Save,
  Send,
  TestTube2,
  Truck,
} from "lucide-react";
import type { InputHTMLAttributes, ReactNode } from "react";
import { useActionState, useState } from "react";
import type {
  NovaPostApiEnvironment,
  NovaPostPayerType,
} from "@/modules/shipping/domain/owner-shipping-settings";
import { novaPostApiBaseUrls } from "@/modules/shipping/domain/owner-shipping-settings";
import type {
  OwnerShippingConnectionTestActionState,
  OwnerShippingSettingsActionState,
} from "@/modules/shipping/ui/owner-shipping-settings-action-state";
import {
  initialOwnerShippingConnectionTestActionState,
  initialOwnerShippingSettingsActionState,
} from "@/modules/shipping/ui/owner-shipping-settings-action-state";
import type { OwnerShippingSettingsFormValues } from "@/modules/shipping/ui/owner-shipping-settings-form-data";
import { defaultOwnerShippingSettingsFormValues } from "@/modules/shipping/ui/owner-shipping-settings-form-data";
import { Button } from "@/shared/ui/button";
import { FormActions } from "@/shared/ui/page-layout";
import { cn } from "@/shared/utils/cn";

type OwnerShippingSettingsFormProps = {
  settings: OwnerShippingSettingsFormValues | null;
  testConnectionAction: (
    state: OwnerShippingConnectionTestActionState,
  ) => Promise<OwnerShippingConnectionTestActionState>;
  updateAction: (
    state: OwnerShippingSettingsActionState,
    formData: FormData,
  ) => Promise<OwnerShippingSettingsActionState>;
};

const endpointOptions: Array<{
  label: string;
  value: NovaPostApiEnvironment;
}> = [
  { label: "Тестове середовище", value: "stage" },
  { label: "Production global", value: "production_global" },
  { label: "Production Україна", value: "production_ukraine" },
  { label: "Власний URL", value: "custom" },
];

const payerOptions: Array<{
  label: string;
  value: NovaPostPayerType;
}> = [
  { label: "Отримувач", value: "Recipient" },
  { label: "Відправник", value: "Sender" },
  { label: "Третя особа", value: "ThirdPerson" },
];

const inputClassName =
  "min-h-11 w-full rounded-md border border-input bg-background px-3 py-2 text-base outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring sm:text-sm";
const readOnlyInputClassName =
  "min-h-11 w-full rounded-md border border-input bg-muted px-3 py-2 text-base text-muted-foreground outline-none sm:text-sm";

export function OwnerShippingSettingsForm({
  settings,
  testConnectionAction,
  updateAction,
}: OwnerShippingSettingsFormProps) {
  const [state, formAction, isPending] = useActionState(
    updateAction,
    initialOwnerShippingSettingsActionState,
  );
  const effectiveSettings =
    state.settings ?? settings ?? defaultOwnerShippingSettingsFormValues;

  return (
    <div className="grid min-w-0 gap-6">
      {state.message ? (
        <FormMessage message={state.message} ok={state.ok} />
      ) : null}
      <ShippingSettingsFields
        formAction={formAction}
        isPending={isPending}
        key={effectiveSettings.formVersion}
        settings={effectiveSettings}
        state={state}
      />
      <ConnectionTestPanel action={testConnectionAction} />
    </div>
  );
}

function ShippingSettingsFields({
  formAction,
  isPending,
  settings,
  state,
}: {
  formAction: (formData: FormData) => void;
  isPending: boolean;
  settings: OwnerShippingSettingsFormValues;
  state: OwnerShippingSettingsActionState;
}) {
  const [apiEnvironment, setApiEnvironment] =
    useState<NovaPostApiEnvironment>(settings.apiEnvironment);
  const [apiBaseUrl, setApiBaseUrl] = useState(settings.apiBaseUrl);
  const [replaceApiKey, setReplaceApiKey] = useState(
    !settings.apiKeyConfigured,
  );
  const [payerType, setPayerType] = useState<NovaPostPayerType>(
    settings.payerType,
  );
  const isCustomApiUrl = apiEnvironment === "custom";

  function handleApiEnvironmentChange(value: NovaPostApiEnvironment) {
    setApiEnvironment(value);
    const officialUrl = novaPostApiBaseUrls[value];

    if (officialUrl) {
      setApiBaseUrl(officialUrl);
    }
  }

  return (
    <form action={formAction} className="grid min-w-0 gap-5">
      <StepSection
        description="Виберіть середовище Nova Post і збережіть API ключ у зашифрованому вигляді."
        icon={KeyRound}
        number="1"
        title="API доступ"
      >
        <input
          name="apiKeyConfigured"
          type="hidden"
          value={settings.apiKeyConfigured ? "true" : "false"}
        />
        <div className="grid min-w-0 gap-4 md:grid-cols-2">
          <SelectField
            error={state.fieldErrors.apiEnvironment?.[0]}
            label="Середовище API"
            name="apiEnvironment"
            onChange={(value) =>
              handleApiEnvironmentChange(value as NovaPostApiEnvironment)
            }
            options={endpointOptions}
            value={apiEnvironment}
          />
          <div className="grid min-w-0 gap-2">
            <label className="grid min-w-0 gap-2 text-sm font-medium">
              Адреса API
              <input
                className={
                  isCustomApiUrl ? inputClassName : readOnlyInputClassName
                }
                name="apiBaseUrl"
                onChange={(event) => setApiBaseUrl(event.target.value)}
                pattern={isCustomApiUrl ? "https://.*" : undefined}
                readOnly={!isCustomApiUrl}
                required
                type={isCustomApiUrl ? "url" : "text"}
                value={apiBaseUrl}
              />
            </label>
            <p
              aria-live="polite"
              className="break-words text-sm text-muted-foreground"
            >
              Поточний URL: <span className="font-medium">{apiBaseUrl}</span>
            </p>
            <FieldError message={state.fieldErrors.apiBaseUrl?.[0]} />
          </div>
        </div>

        <details className="rounded-md border border-border/80 bg-background p-3">
          <summary className="cursor-pointer text-sm font-medium">
            Розширені налаштування авторизації
          </summary>
          <div className="mt-4">
            <FormField
              error={state.fieldErrors.authUrl?.[0]}
              label="Auth URL override"
              name="authUrl"
              placeholder="https://api-stage.novapost.pl/v.1.0/clients/authorization"
              type="url"
              value={settings.authUrl}
            />
          </div>
        </details>

        <div className="grid min-w-0 gap-3 rounded-md border border-border/80 bg-background p-3">
          {settings.apiKeyConfigured ? (
            <div className="grid min-w-0 gap-1 text-sm">
              <p className="font-medium text-emerald-800">
                API ключ збережено
              </p>
              <p className="break-words text-muted-foreground">
                Безпечний перегляд:{" "}
                <span className="font-medium">{settings.apiKeyPreview}</span>
              </p>
            </div>
          ) : null}

          {settings.apiKeyConfigured ? (
            <label className="flex min-w-0 items-start gap-3 text-sm">
              <input
                checked={replaceApiKey}
                className="mt-1 size-4"
                name="replaceApiKey"
                onChange={(event) => setReplaceApiKey(event.target.checked)}
                type="checkbox"
              />
              <span className="grid min-w-0 gap-1">
                <span className="font-medium">Замінити API ключ</span>
                <span className="text-muted-foreground">
                  Новий ключ буде зашифровано перед збереженням.
                </span>
              </span>
            </label>
          ) : null}

          {!settings.apiKeyConfigured || replaceApiKey ? (
            <FormField
              autoComplete="off"
              error={state.fieldErrors.apiKey?.[0]}
              label="API ключ Nova Post"
              name="apiKey"
              placeholder="Вставте API ключ"
              type="password"
            />
          ) : null}
        </div>
      </StepSection>

      <StepSection
        description="Ці дані потрапляють у налаштування відправника для майбутнього створення відправлень."
        icon={Send}
        number="2"
        title="Відправник"
      >
        <div className="grid min-w-0 gap-4 md:grid-cols-2">
          <FormField
            error={state.fieldErrors.senderName?.[0]}
            label="ПІБ відправника"
            name="senderName"
            required
            value={settings.senderName}
          />
          <FormField
            error={state.fieldErrors.senderPhone?.[0]}
            inputMode="tel"
            label="Телефон відправника"
            name="senderPhone"
            placeholder="+380671234567"
            required
            value={settings.senderPhone}
          />
        </div>
        <div className="grid min-w-0 gap-4 md:grid-cols-3">
          <FormField
            error={state.fieldErrors.senderEmail?.[0]}
            label="Email відправника"
            name="senderEmail"
            type="email"
            value={settings.senderEmail}
          />
          <FormField
            error={state.fieldErrors.senderCountryCode?.[0]}
            label="Код країни"
            maxLength={2}
            name="senderCountryCode"
            required
            value={settings.senderCountryCode}
          />
          <FormField
            error={state.fieldErrors.senderDivisionId?.[0]}
            label="ID відділення або філії"
            name="senderDivisionId"
            required
            value={settings.senderDivisionId}
          />
        </div>
        <div className="grid min-w-0 gap-4 md:grid-cols-2">
          <FormField
            error={state.fieldErrors.senderCompanyTin?.[0]}
            label="ІПН або ЄДРПОУ компанії"
            name="senderCompanyTin"
            value={settings.senderCompanyTin}
          />
          <FormField
            error={state.fieldErrors.senderCompanyName?.[0]}
            label="Назва компанії"
            name="senderCompanyName"
            value={settings.senderCompanyName}
          />
        </div>
      </StepSection>

      <StepSection
        description="Вкажіть платника доставки і типові розміри посилки для створення накладних."
        icon={PackageCheck}
        number="3"
        title="Параметри посилки"
      >
        <div className="grid min-w-0 gap-4 md:grid-cols-2">
          <SelectField
            error={state.fieldErrors.payerType?.[0]}
            label="Тип платника"
            name="payerType"
            onChange={(value) => setPayerType(value as NovaPostPayerType)}
            options={payerOptions}
            value={payerType}
          />
          <FormField
            error={state.fieldErrors.payerContractNumber?.[0]}
            label="Номер договору платника"
            name="payerContractNumber"
            required={payerType === "ThirdPerson"}
            value={settings.payerContractNumber}
          />
        </div>

        <div className="grid min-w-0 gap-4 sm:grid-cols-2 lg:grid-cols-5">
          <FormField
            error={state.fieldErrors.defaultWidthMm?.[0]}
            inputMode="numeric"
            label="Ширина, мм"
            min={1}
            name="defaultWidthMm"
            required
            type="number"
            value={String(settings.defaultWidthMm)}
          />
          <FormField
            error={state.fieldErrors.defaultLengthMm?.[0]}
            inputMode="numeric"
            label="Довжина, мм"
            min={1}
            name="defaultLengthMm"
            required
            type="number"
            value={String(settings.defaultLengthMm)}
          />
          <FormField
            error={state.fieldErrors.defaultHeightMm?.[0]}
            inputMode="numeric"
            label="Висота, мм"
            min={1}
            name="defaultHeightMm"
            required
            type="number"
            value={String(settings.defaultHeightMm)}
          />
          <FormField
            error={state.fieldErrors.defaultActualWeightGrams?.[0]}
            inputMode="numeric"
            label="Фактична вага, г"
            min={1}
            name="defaultActualWeightGrams"
            required
            type="number"
            value={String(settings.defaultActualWeightGrams)}
          />
          <FormField
            error={state.fieldErrors.defaultVolumetricWeightGrams?.[0]}
            inputMode="numeric"
            label="Об’ємна вага, г"
            min={1}
            name="defaultVolumetricWeightGrams"
            required
            type="number"
            value={String(settings.defaultVolumetricWeightGrams)}
          />
        </div>
      </StepSection>

      <StepSection
        description="Увімкніть створення відправлень тільки після перевірки API доступу і даних відправника."
        icon={Truck}
        number="4"
        title="Перевірка"
      >
        <label className="flex min-w-0 items-start gap-3 rounded-md border border-border/80 bg-background p-3 text-sm">
          <input
            className="mt-1 size-4"
            defaultChecked={settings.isEnabled}
            name="isEnabled"
            type="checkbox"
          />
          <span className="grid min-w-0 gap-1">
            <span className="font-medium">
              Створення відправлень увімкнено
            </span>
            <span className="text-muted-foreground">
              Якщо вимкнено, пошук міста й відділення може працювати за
              збереженим API доступом, але створення відправлень не запускається.
            </span>
          </span>
        </label>

        <FormActions
          primaryAction={
            <Button disabled={isPending} type="submit">
              <Save aria-hidden="true" className="size-4" />
              {isPending ? "Збереження…" : "Зберегти налаштування"}
            </Button>
          }
          sticky
        />
      </StepSection>
    </form>
  );
}

function ConnectionTestPanel({
  action,
}: {
  action: OwnerShippingSettingsFormProps["testConnectionAction"];
}) {
  const [state, formAction, isPending] = useActionState(
    action,
    initialOwnerShippingConnectionTestActionState,
  );

  return (
    <section className="grid min-w-0 gap-4 rounded-md border bg-card p-4 shadow-sm sm:p-5">
      <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h2 className="text-lg font-semibold">Тест підключення</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Перевірка використовує збережені налаштування, авторизацію JWT і
            невеликий пошук відділень без створення відправлення.
          </p>
        </div>
        <form action={formAction} className="min-w-0 sm:shrink-0">
          <Button disabled={isPending} type="submit" variant="outline">
            <TestTube2 aria-hidden="true" className="size-4" />
            {isPending ? "Перевірка…" : "Перевірити підключення"}
          </Button>
        </form>
      </div>
      {state.message ? (
        <FormMessage message={state.message} ok={state.ok === true} />
      ) : null}
    </section>
  );
}

function StepSection({
  children,
  description,
  icon: Icon,
  number,
  title,
}: {
  children: ReactNode;
  description: string;
  icon: LucideIcon;
  number: string;
  title: string;
}) {
  return (
    <section className="grid min-w-0 gap-4 rounded-md border bg-card p-4 shadow-sm sm:p-5">
      <div className="flex min-w-0 items-start gap-3">
        <div className="grid size-10 shrink-0 place-items-center rounded-md bg-primary text-sm font-semibold text-primary-foreground">
          {number}
        </div>
        <div className="min-w-0">
          <div className="flex min-w-0 flex-wrap items-center gap-2">
            <Icon aria-hidden="true" className="size-4 text-muted-foreground" />
            <h2 className="text-lg font-semibold">{title}</h2>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">{description}</p>
        </div>
      </div>
      <div className="grid min-w-0 gap-4">{children}</div>
    </section>
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
          maxLength={inputProps.maxLength ?? 160}
          name={name}
          {...inputProps}
        />
      </label>
      <FieldError message={error} />
    </div>
  );
}

function SelectField({
  error,
  label,
  name,
  onChange,
  options,
  value,
}: {
  error?: string;
  label: string;
  name: string;
  onChange: (value: string) => void;
  options: Array<{ label: string; value: string }>;
  value: string;
}) {
  return (
    <div className="grid min-w-0 gap-2">
      <label className="grid min-w-0 gap-2 text-sm font-medium">
        {label}
        <select
          className={inputClassName}
          name={name}
          onChange={(event) => onChange(event.target.value)}
          value={value}
        >
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
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

function FormMessage({ message, ok }: { message: string; ok: boolean }) {
  return (
    <p
      className={cn(
        "flex min-w-0 items-start gap-2 rounded-md border px-3 py-2 text-sm",
        ok
          ? "border-emerald-200 bg-emerald-50 text-emerald-950"
          : "border-destructive/30 bg-destructive/10 text-destructive",
      )}
      role={ok ? "status" : "alert"}
    >
      {ok ? <CheckCircle2 aria-hidden="true" className="mt-0.5 size-4" /> : null}
      <span className="min-w-0 break-words">{message}</span>
    </p>
  );
}
