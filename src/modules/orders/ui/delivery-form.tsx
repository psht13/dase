"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import {
  Banknote,
  Check,
  CheckCircle2,
  CreditCard,
  RotateCcw,
  Search,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { ReactNode } from "react";
import { useEffect, useRef, useState, useTransition } from "react";
import { useForm, type FieldPath } from "react-hook-form";
import {
  deliveryFormSchema,
  type DeliveryFormValues,
} from "@/modules/orders/application/delivery-form-validation";
import { formatInstagramUsername } from "@/modules/orders/application/customer-instagram";
import type { PublicPaymentRequisite } from "@/modules/payments/application/payment-requisite-repository";
import type { DeliveryActionResult } from "@/modules/orders/ui/delivery-actions";
import {
  deliveryFormValuesToFormData,
  emptyDeliveryFormValues,
} from "@/modules/orders/ui/delivery-form-data";
import type {
  ShippingCity,
  ShippingWarehouse,
} from "@/modules/shipping/application/shipping-carrier";
import { activeShippingCarriers } from "@/modules/shipping/application/shipping-carrier-registry";
import { Button } from "@/shared/ui/button";
import {
  FormSummaryCard,
  StepActions,
  StepCard,
  type MultiStepFormStep,
  WizardPageLayout,
  WizardStepper,
  useMultiStepForm,
} from "@/shared/ui/multi-step-form";
import { cn } from "@/shared/utils/cn";

type DeliveryFormProps = {
  action: (formData: FormData) => Promise<DeliveryActionResult>;
  cancelHref?: string;
  navigateToPayment?: (url: string) => void;
  paymentRequisites: PublicPaymentRequisite[];
};

type LookupStatus = "idle" | "loading" | "loaded" | "error";

const deliveryFormSteps = [
  {
    description: "Вкажіть ім’я та телефон отримувача.",
    fields: ["fullName", "phone", "instagramUsername"],
    id: "contacts",
    title: "Контакти",
  },
  {
    description: "Оберіть службу доставки, місто та відділення.",
    fields: [
      "carrier",
      "cityId",
      "cityName",
      "warehouseAddress",
      "warehouseId",
      "warehouseName",
    ],
    id: "delivery",
    title: "Доставка",
  },
  {
    description: "Виберіть зручний спосіб оплати.",
    fields: ["paymentMethod"],
    id: "payment",
    title: "Оплата",
  },
  {
    description: "Перевірте дані перед підтвердженням.",
    fields: [],
    id: "review",
    title: "Перевірка",
  },
] satisfies readonly MultiStepFormStep<DeliveryFormValues>[];

type PaymentMethodOption = {
  description: string;
  label: string;
  value: DeliveryFormValues["paymentMethod"];
};

const inputClassName =
  "min-h-11 w-full rounded-md border border-input bg-background px-3 py-2 text-base outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50 sm:text-sm";

export function DeliveryForm({
  action,
  cancelHref,
  navigateToPayment,
  paymentRequisites,
}: DeliveryFormProps) {
  const router = useRouter();
  const submitLockRef = useRef(false);
  const [serverMessage, setServerMessage] = useState<string | null>(null);
  const [isConfirmed, setIsConfirmed] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [cityQuery, setCityQuery] = useState("");
  const [warehouseQuery, setWarehouseQuery] = useState("");
  const [cities, setCities] = useState<ShippingCity[]>([]);
  const [warehouses, setWarehouses] = useState<ShippingWarehouse[]>([]);
  const [cityStatus, setCityStatus] = useState<LookupStatus>("idle");
  const [warehouseStatus, setWarehouseStatus] = useState<LookupStatus>("idle");
  const paymentMethodOptions = buildPaymentMethodOptions(paymentRequisites);
  const form = useForm<DeliveryFormValues>({
    defaultValues: {
      ...emptyDeliveryFormValues,
      paymentMethod: paymentRequisites.length
        ? "MANUAL_CARD_TRANSFER"
        : "CASH_ON_DELIVERY",
    },
    resolver: zodResolver(deliveryFormSchema),
  });
  const formValues = form.watch();
  const carrier = formValues.carrier;
  const selectedCityId = formValues.cityId;
  const selectedWarehouseId = formValues.warehouseId;
  const selectedPaymentOption =
    paymentMethodOptions.find(
      (option) => option.value === formValues.paymentMethod,
    ) ?? paymentMethodOptions[0];
  const carrierField = form.register("carrier");
  const stepper = useMultiStepForm({
    finalValidationMessage: "Перевірте дані доставки перед підтвердженням",
    form,
    steps: deliveryFormSteps,
    validationMessage: "Перевірте поля цього кроку",
  });
  const isBusy = isPending || isSubmitting;

  useEffect(() => {
    const query = cityQuery.trim();

    if (query.length < 2) {
      setCities([]);
      setCityStatus("idle");
      return;
    }

    const controller = new AbortController();
    setCityStatus("loading");

    void fetch(
      `/api/carriers/cities?carrier=${encodeURIComponent(carrier)}&query=${encodeURIComponent(query)}`,
      { signal: controller.signal },
    )
      .then(async (response) => {
        if (!response.ok) {
          throw new Error("Failed to load cities");
        }

        return (await response.json()) as { cities: ShippingCity[] };
      })
      .then((data) => {
        setCities(data.cities);
        setCityStatus("loaded");
      })
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === "AbortError") {
          return;
        }

        setCities([]);
        setCityStatus("error");
      });

    return () => controller.abort();
  }, [carrier, cityQuery]);

  useEffect(() => {
    if (!selectedCityId) {
      setWarehouses([]);
      setWarehouseStatus("idle");
      return;
    }

    const controller = new AbortController();
    setWarehouseStatus("loading");

    void fetch(
      `/api/carriers/warehouses?carrier=${encodeURIComponent(carrier)}&cityId=${encodeURIComponent(selectedCityId)}&query=${encodeURIComponent(warehouseQuery.trim())}`,
      { signal: controller.signal },
    )
      .then(async (response) => {
        if (!response.ok) {
          throw new Error("Failed to load warehouses");
        }

        return (await response.json()) as { warehouses: ShippingWarehouse[] };
      })
      .then((data) => {
        setWarehouses(data.warehouses);
        setWarehouseStatus("loaded");
      })
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === "AbortError") {
          return;
        }

        setWarehouses([]);
        setWarehouseStatus("error");
      });

    return () => controller.abort();
  }, [carrier, selectedCityId, warehouseQuery]);

  function onSubmit(values: DeliveryFormValues) {
    if (submitLockRef.current || isConfirmed) {
      return;
    }

    submitLockRef.current = true;
    setIsSubmitting(true);
    setServerMessage(null);

    startTransition(() => {
      void action(deliveryFormValuesToFormData(values)).then((result) => {
        setServerMessage(result.message);

        if (result.ok) {
          setIsConfirmed(true);

          if (result.paymentRedirectUrl) {
            if (navigateToPayment) {
              navigateToPayment(result.paymentRedirectUrl);
            } else {
              window.location.assign(result.paymentRedirectUrl);
            }

            return;
          }

          router.push(result.statusPageUrl);
          return;
        }

        submitLockRef.current = false;
        setIsSubmitting(false);

        for (const [field, messages] of Object.entries(
          result.fieldErrors ?? {},
        )) {
          const message = messages[0];
          const fieldPath = fieldPathFromServerField(field);

          if (!message || !fieldPath) {
            continue;
          }

          form.setError(fieldPath, {
            message,
            type: "server",
          });
        }

        const firstServerField = firstServerErrorField(result.fieldErrors);

        if (firstServerField) {
          const fieldPath = fieldPathFromServerField(firstServerField);

          stepper.setCurrentStepIndex(stepIndexForField(firstServerField));

          if (fieldPath) {
            window.setTimeout(() => {
              form.setFocus(fieldPath);
            }, 0);
          }
        }
      });
    });
  }

  function selectCity(city: ShippingCity) {
    form.setValue("cityId", city.id, { shouldValidate: true });
    form.setValue("cityName", city.name, { shouldValidate: true });
    form.setValue("warehouseAddress", "");
    form.setValue("warehouseId", "", { shouldValidate: true });
    form.setValue("warehouseName", "");
    setCityQuery(city.name);
    setCities([]);
    setWarehouseQuery("");
    setWarehouses([]);
  }

  function selectWarehouse(warehouse: ShippingWarehouse) {
    form.setValue("warehouseAddress", warehouse.address ?? "");
    form.setValue("warehouseId", warehouse.id, { shouldValidate: true });
    form.setValue("warehouseName", warehouse.name, { shouldValidate: true });
    setWarehouseQuery(warehouse.name);
    setWarehouses([]);
  }

  function updateCityQuery(value: string) {
    form.setValue("cityId", "", { shouldValidate: true });
    form.setValue("cityName", "");
    form.setValue("warehouseAddress", "");
    form.setValue("warehouseId", "");
    form.setValue("warehouseName", "");
    setCityQuery(value);
    setWarehouseQuery("");
    setWarehouses([]);
  }

  function updateWarehouseQuery(value: string) {
    form.setValue("warehouseAddress", "");
    form.setValue("warehouseId", "", { shouldValidate: true });
    form.setValue("warehouseName", "");
    setWarehouseQuery(value);
  }

  function resetDeliverySelection() {
    form.setValue("cityId", "");
    form.setValue("cityName", "");
    form.setValue("warehouseAddress", "");
    form.setValue("warehouseId", "");
    form.setValue("warehouseName", "");
    setCityQuery("");
    setWarehouseQuery("");
    setCities([]);
    setWarehouses([]);
    setCityStatus("idle");
    setWarehouseStatus("idle");
  }

  function resetWarehouseSelection() {
    form.setValue("warehouseAddress", "");
    form.setValue("warehouseId", "");
    form.setValue("warehouseName", "");
    setWarehouseQuery("");
    setWarehouses([]);
    setWarehouseStatus("idle");
    focusElement("delivery-warehouse");
  }

  function resetCitySelection() {
    resetDeliverySelection();
    focusElement("delivery-city");
  }

  return (
    <form
      className="min-w-0"
      noValidate
      onSubmit={stepper.handleSubmit(onSubmit)}
    >
      <input type="hidden" {...form.register("cityId")} />
      <input type="hidden" {...form.register("cityName")} />
      <input type="hidden" {...form.register("warehouseAddress")} />
      <input type="hidden" {...form.register("warehouseId")} />
      <input type="hidden" {...form.register("warehouseName")} />

      <WizardPageLayout
        message={
          serverMessage ? (
            <p
              className={cn(
                "rounded-md border px-3 py-2 text-sm",
                isConfirmed
                  ? "border-emerald-200 bg-emerald-50 text-emerald-950"
                  : "border-destructive/30 bg-destructive/10 text-destructive",
              )}
              aria-live="polite"
              role={isConfirmed ? "status" : "alert"}
            >
              {serverMessage}
            </p>
          ) : null
        }
        stepper={
          <WizardStepper
            currentStepIndex={stepper.currentStepIndex}
            steps={deliveryFormSteps}
          />
        }
        variant="stacked"
      >
        <StepCard
          description={stepper.currentStep.description}
          errorMessage={stepper.stepErrorMessage}
          headingRef={stepper.headingRef}
          title={stepper.currentStep.title}
        >
          {stepper.currentStep.id === "contacts" ? (
            <section className="grid min-w-0 gap-4">
              <div className="grid min-w-0 gap-2">
                <label
                  className="text-sm font-medium"
                  htmlFor="delivery-full-name"
                >
                  Повне ім’я
                </label>
                <input
                  aria-describedby={
                    form.formState.errors.fullName
                      ? "delivery-full-name-error"
                      : undefined
                  }
                  aria-invalid={Boolean(form.formState.errors.fullName)}
                  autoComplete="name"
                  className={inputClassName}
                  id="delivery-full-name"
                  placeholder="Ім’я та прізвище"
                  {...form.register("fullName")}
                />
                <FieldError
                  id="delivery-full-name-error"
                  message={form.formState.errors.fullName?.message}
                />
              </div>

              <div className="grid min-w-0 gap-2">
                <label className="text-sm font-medium" htmlFor="delivery-phone">
                  Телефон
                </label>
                <input
                  aria-describedby={
                    form.formState.errors.phone
                      ? "delivery-phone-error"
                      : undefined
                  }
                  aria-invalid={Boolean(form.formState.errors.phone)}
                  autoComplete="tel"
                  className={inputClassName}
                  id="delivery-phone"
                  inputMode="tel"
                  placeholder="+380XXXXXXXXX"
                  type="tel"
                  {...form.register("phone")}
                />
                <FieldError
                  id="delivery-phone-error"
                  message={form.formState.errors.phone?.message}
                />
              </div>

              <div className="grid min-w-0 gap-2">
                <label
                  className="text-sm font-medium"
                  htmlFor="delivery-instagram"
                >
                  Instagram нікнейм
                </label>
                <input
                  aria-describedby={
                    form.formState.errors.instagramUsername
                      ? "delivery-instagram-helper delivery-instagram-error"
                      : "delivery-instagram-helper"
                  }
                  aria-invalid={Boolean(
                    form.formState.errors.instagramUsername,
                  )}
                  autoComplete="off"
                  className={inputClassName}
                  id="delivery-instagram"
                  placeholder="@username або username"
                  {...form.register("instagramUsername")}
                />
                <p
                  className="text-sm text-muted-foreground"
                  id="delivery-instagram-helper"
                >
                  Допоможе продавцю швидше знайти вашу переписку.
                </p>
                <FieldError
                  id="delivery-instagram-error"
                  message={form.formState.errors.instagramUsername?.message}
                />
              </div>
            </section>
          ) : null}

          {stepper.currentStep.id === "delivery" ? (
            <section className="grid min-w-0 gap-5">
              <div className="grid min-w-0 gap-2">
                <label
                  className="text-sm font-medium"
                  htmlFor="delivery-carrier"
                >
                  Служба доставки
                </label>
                <select
                  aria-describedby={
                    form.formState.errors.carrier
                      ? "delivery-carrier-error"
                      : undefined
                  }
                  aria-invalid={Boolean(form.formState.errors.carrier)}
                  autoComplete="off"
                  className={inputClassName}
                  id="delivery-carrier"
                  {...carrierField}
                  onChange={(event) => {
                    void carrierField.onChange(event);
                    resetDeliverySelection();
                  }}
                >
                  {activeShippingCarriers.map((deliveryCarrier) => (
                    <option
                      key={deliveryCarrier.code}
                      value={deliveryCarrier.code}
                    >
                      {deliveryCarrier.label}
                    </option>
                  ))}
                </select>
                <FieldError
                  id="delivery-carrier-error"
                  message={form.formState.errors.carrier?.message}
                />
              </div>

              <div className="grid min-w-0 gap-2">
                <label className="text-sm font-medium" htmlFor="delivery-city">
                  Місто або населений пункт
                </label>
                <div className="relative min-w-0">
                  <Search
                    aria-hidden="true"
                    className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
                  />
                  <input
                    aria-describedby={
                      form.formState.errors.cityId
                        ? "delivery-city-error"
                        : undefined
                    }
                    aria-invalid={Boolean(form.formState.errors.cityId)}
                    autoComplete="address-level2"
                    className={cn(inputClassName, "pl-10")}
                    id="delivery-city"
                    onChange={(event) => updateCityQuery(event.target.value)}
                    placeholder="Введіть назву міста"
                    value={cityQuery}
                  />
                </div>
                <FieldError
                  id="delivery-city-error"
                  message={form.formState.errors.cityId?.message}
                />
                {selectedCityId ? (
                  <SelectedLookupSummary
                    actionLabel="Змінити місто"
                    meta={carrierLabelForValue(carrier)}
                    onReset={resetCitySelection}
                    title="Обране місто"
                    value={formValues.cityName}
                  />
                ) : cityQuery.trim().length < 2 ? (
                  <LookupIdleMessage message="Введіть щонайменше 2 символи, щоб знайти місто." />
                ) : (
                  <LookupResults
                    emptyMessage="Місто не знайдено"
                    errorMessage="Не вдалося завантажити міста"
                    loadingMessage="Пошук міст…"
                    onSelect={selectCity}
                    renderItem={(city) => (
                      <>
                        <span className="break-words font-medium">
                          {city.name}
                        </span>
                        {city.region ? (
                          <span className="break-words text-muted-foreground">
                            {city.region}
                          </span>
                        ) : null}
                      </>
                    )}
                    results={cities}
                    status={cityStatus}
                  />
                )}
              </div>

              <div className="grid min-w-0 gap-2">
                <label
                  className="text-sm font-medium"
                  htmlFor="delivery-warehouse"
                >
                  Відділення або поштове відділення
                </label>
                <div className="relative min-w-0">
                  <Search
                    aria-hidden="true"
                    className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
                  />
                  <input
                    aria-describedby={
                      form.formState.errors.warehouseId
                        ? "delivery-warehouse-error"
                        : undefined
                    }
                    aria-invalid={Boolean(form.formState.errors.warehouseId)}
                    autoComplete="off"
                    className={cn(inputClassName, "pl-10")}
                    disabled={!selectedCityId}
                    id="delivery-warehouse"
                    onChange={(event) =>
                      updateWarehouseQuery(event.target.value)
                    }
                    placeholder="Введіть номер або адресу"
                    value={warehouseQuery}
                  />
                </div>
                <FieldError
                  id="delivery-warehouse-error"
                  message={form.formState.errors.warehouseId?.message}
                />
                {selectedWarehouseId ? (
                  <SelectedLookupSummary
                    actionLabel="Змінити відділення"
                    meta={formValues.warehouseAddress}
                    onReset={resetWarehouseSelection}
                    title="Обране відділення"
                    value={formValues.warehouseName}
                  />
                ) : !selectedCityId ? (
                  <LookupIdleMessage message="Спочатку оберіть місто." />
                ) : (
                  <LookupResults
                    emptyMessage="Відділення не знайдено"
                    errorMessage="Не вдалося завантажити відділення"
                    loadingMessage="Пошук відділень…"
                    onSelect={selectWarehouse}
                    renderItem={(warehouse) => (
                      <>
                        <span className="break-words font-medium">
                          {warehouse.name}
                        </span>
                        {warehouse.address ? (
                          <span className="break-words text-muted-foreground">
                            {warehouse.address}
                          </span>
                        ) : null}
                      </>
                    )}
                    results={warehouses}
                    status={warehouseStatus}
                  />
                )}
              </div>

              <DeliverySummary values={formValues} />
            </section>
          ) : null}

          {stepper.currentStep.id === "payment" ? (
            <fieldset className="grid min-w-0 gap-3">
              <legend className="sr-only">Спосіб оплати</legend>
              {paymentMethodOptions.map((option) => {
                const checked = formValues.paymentMethod === option.value;
                const descriptionId = `delivery-payment-${option.value}-description`;

                return (
                  <label
                    className={cn(
                      "grid min-w-0 cursor-pointer grid-cols-[auto_minmax(0,1fr)] gap-3 rounded-md border border-border/80 bg-background p-4 transition-colors",
                      checked
                        ? "border-primary bg-primary/10"
                        : "hover:border-accent hover:bg-accent/20",
                    )}
                    htmlFor={`delivery-payment-${option.value}`}
                    key={option.value}
                  >
                    <input
                      aria-describedby={descriptionId}
                      className="mt-1 size-5 shrink-0 rounded-full border-input"
                      id={`delivery-payment-${option.value}`}
                      type="radio"
                      value={option.value}
                      {...form.register("paymentMethod")}
                    />
                    <span className="grid min-w-0 gap-1">
                      <span className="flex min-w-0 items-center gap-2">
                        <PaymentIcon value={option.value} />
                        <span className="break-words text-sm font-semibold">
                          {option.label}
                        </span>
                        {checked ? (
                          <span className="ml-auto inline-flex shrink-0 items-center gap-1 rounded-md bg-primary px-2 py-1 text-xs font-medium text-primary-foreground">
                            <Check aria-hidden="true" className="size-3.5" />
                            Обрано
                          </span>
                        ) : null}
                      </span>
                      <span
                        className="text-sm leading-6 text-muted-foreground"
                        id={descriptionId}
                      >
                        {option.description}
                      </span>
                      {checked && option.value === "MANUAL_CARD_TRANSFER" ? (
                        <PaymentRequisitesPreview
                          requisites={paymentRequisites}
                        />
                      ) : null}
                    </span>
                  </label>
                );
              })}
              <FieldError
                id="delivery-payment-error"
                message={form.formState.errors.paymentMethod?.message}
              />
            </fieldset>
          ) : null}

          {stepper.currentStep.id === "review" ? (
            <section className="grid min-w-0 gap-4">
              <FormSummaryCard
                items={[
                  {
                    id: "full-name",
                    label: "Отримувач",
                    value: summaryText(formValues.fullName),
                  },
                  {
                    id: "phone",
                    label: "Телефон",
                    value: summaryText(formValues.phone),
                  },
                  {
                    id: "instagram",
                    label: "Instagram",
                    value: summaryInstagramText(formValues.instagramUsername),
                  },
                ]}
                title="Контакти"
              />
              <FormSummaryCard
                items={[
                  {
                    id: "carrier",
                    label: "Служба доставки",
                    value: carrierLabelForValue(formValues.carrier),
                  },
                  {
                    id: "city",
                    label: "Місто",
                    value: summaryText(formValues.cityName),
                  },
                  {
                    id: "warehouse",
                    label: "Відділення",
                    value: (
                      <span className="grid min-w-0 gap-1">
                        <span>{summaryText(formValues.warehouseName)}</span>
                        {formValues.warehouseAddress ? (
                          <span className="text-muted-foreground">
                            {formValues.warehouseAddress}
                          </span>
                        ) : null}
                      </span>
                    ),
                  },
                ]}
                title="Доставка"
              />
              <FormSummaryCard
                items={[
                  {
                    id: "payment",
                    label: "Спосіб оплати",
                    value: selectedPaymentOption.label,
                  },
                  {
                    id: "payment-note",
                    label: "Умови",
                    value: selectedPaymentOption.description,
                  },
                ]}
                title="Оплата"
              />
            </section>
          ) : null}
        </StepCard>

        <StepActions
          isFirstStep={stepper.isFirstStep}
          isLastStep={stepper.isLastStep}
          isPending={isBusy || isConfirmed}
          onBack={stepper.goBack}
          onNext={stepper.goNext}
          secondaryAction={
            cancelHref ? (
              <Button asChild className="w-full sm:w-auto" variant="outline">
                <Link href={cancelHref}>Назад до замовлення</Link>
              </Button>
            ) : null
          }
          submitLabel={
            <>
              <CheckCircle2 aria-hidden="true" className="size-4" />
              {isBusy ? "Підтвердження…" : "Підтвердити замовлення"}
            </>
          }
        />
      </WizardPageLayout>
    </form>
  );
}

function LookupResults<T>({
  emptyMessage,
  errorMessage,
  loadingMessage,
  onSelect,
  renderItem,
  results,
  status,
}: {
  emptyMessage: string;
  errorMessage: string;
  loadingMessage: string;
  onSelect: (result: T) => void;
  renderItem: (result: T) => ReactNode;
  results: T[];
  status: LookupStatus;
}) {
  if (status === "idle") {
    return null;
  }

  if (status === "loading") {
    return (
      <p
        aria-live="polite"
        className="rounded-md border border-dashed p-3 text-sm text-muted-foreground"
      >
        {loadingMessage}
      </p>
    );
  }

  if (status === "error") {
    return (
      <p
        aria-live="polite"
        className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive"
        role="alert"
      >
        {errorMessage}
      </p>
    );
  }

  if (!results.length) {
    return (
      <p
        aria-live="polite"
        className="rounded-md border border-dashed p-3 text-sm text-muted-foreground"
      >
        {emptyMessage}
      </p>
    );
  }

  return (
    <div className="grid min-w-0 gap-2 rounded-md border border-border/80 bg-background p-2 shadow-sm">
      {results.map((result, index) => (
        <button
          className="grid min-h-14 min-w-0 gap-1 rounded-md px-3 py-3 text-left text-sm hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          key={index}
          onClick={() => onSelect(result)}
          type="button"
        >
          {renderItem(result)}
        </button>
      ))}
    </div>
  );
}

function LookupIdleMessage({ message }: { message: string }) {
  return (
    <p className="rounded-md border border-dashed p-3 text-sm text-muted-foreground">
      {message}
    </p>
  );
}

function SelectedLookupSummary({
  actionLabel,
  meta,
  onReset,
  title,
  value,
}: {
  actionLabel: string;
  meta?: string | null;
  onReset: () => void;
  title: string;
  value: string;
}) {
  return (
    <div className="grid min-w-0 gap-3 rounded-md border border-primary/30 bg-primary/10 p-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
      <div className="grid min-w-0 gap-1">
        <p className="text-xs font-medium uppercase text-muted-foreground">
          {title}
        </p>
        <p className="break-words text-sm font-semibold">{value}</p>
        {meta ? (
          <p className="break-words text-sm text-muted-foreground">{meta}</p>
        ) : null}
      </div>
      <Button
        className="w-full sm:w-auto"
        onClick={onReset}
        type="button"
        variant="outline"
      >
        <RotateCcw aria-hidden="true" className="size-4" />
        {actionLabel}
      </Button>
    </div>
  );
}

function DeliverySummary({ values }: { values: DeliveryFormValues }) {
  const hasDelivery = values.cityName && values.warehouseName;

  return (
    <FormSummaryCard
      items={
        hasDelivery
          ? [
              {
                id: "carrier",
                label: "Служба доставки",
                value: carrierLabelForValue(values.carrier),
              },
              {
                id: "city",
                label: "Місто",
                value: values.cityName,
              },
              {
                id: "warehouse",
                label: "Відділення",
                value: (
                  <span className="grid min-w-0 gap-1">
                    <span>{values.warehouseName}</span>
                    {values.warehouseAddress ? (
                      <span className="text-muted-foreground">
                        {values.warehouseAddress}
                      </span>
                    ) : null}
                  </span>
                ),
              },
            ]
          : []
      }
      title="Підсумок доставки"
    >
      {!hasDelivery ? (
        <p className="text-sm text-muted-foreground">
          Оберіть місто та відділення, щоб побачити підсумок доставки.
        </p>
      ) : null}
    </FormSummaryCard>
  );
}

function PaymentIcon({
  value,
}: {
  value: PaymentMethodOption["value"];
}) {
  if (value === "MANUAL_CARD_TRANSFER") {
    return (
      <CreditCard aria-hidden="true" className="size-4 text-muted-foreground" />
    );
  }

  return <Banknote aria-hidden="true" className="size-4 text-muted-foreground" />;
}

function PaymentRequisitesPreview({
  requisites,
}: {
  requisites: PublicPaymentRequisite[];
}) {
  return (
    <span className="mt-3 grid min-w-0 gap-3 rounded-md border border-border/80 bg-card p-3">
      <span className="text-sm font-medium">
        Переказ можна зробити на одну з карток нижче. Після оплати надішліть
        квитанцію продавцю в Instagram чат.
      </span>
      {requisites.map((requisite) => (
        <span
          className="grid min-w-0 gap-2 rounded-md border border-border/70 bg-background p-3"
          key={requisite.id}
        >
          <span className="break-words text-sm font-semibold">
            {requisite.label}
          </span>
          {requisite.bankName ? (
            <span className="break-words text-sm text-muted-foreground">
              Банк: {requisite.bankName}
            </span>
          ) : null}
          {requisite.recipientName ? (
            <span className="break-words text-sm text-muted-foreground">
              Отримувач: {requisite.recipientName}
            </span>
          ) : null}
          <span className="break-all rounded-md bg-muted px-3 py-2 text-sm font-semibold">
            {requisite.displayValue}
          </span>
          {requisite.note ? (
            <span className="break-words text-sm text-muted-foreground">
              {requisite.note}
            </span>
          ) : null}
        </span>
      ))}
    </span>
  );
}

function buildPaymentMethodOptions(
  paymentRequisites: PublicPaymentRequisite[],
): PaymentMethodOption[] {
  const options: PaymentMethodOption[] = [];

  if (paymentRequisites.length) {
    options.push({
      description:
        "Переказ на картку або реквізити продавця після підтвердження.",
      label: "Оплата картою онлайн",
      value: "MANUAL_CARD_TRANSFER",
    });
  }

  options.push({
    description: "Оплата готівкою або карткою при отриманні у відділенні.",
    label: "Післяплата",
    value: "CASH_ON_DELIVERY",
  });

  return options;
}

function FieldError({ id, message }: { id: string; message?: string }) {
  if (!message) {
    return null;
  }

  return (
    <p aria-live="polite" className="text-sm text-destructive" id={id}>
      {message}
    </p>
  );
}

function summaryText(value: string) {
  return value.trim() || "Не вказано";
}

function carrierLabelForValue(value: string) {
  return (
    activeShippingCarriers.find((carrier) => carrier.code === value)?.label ??
    "Не вибрано"
  );
}

function firstServerErrorField(fieldErrors?: Record<string, string[]>) {
  if (!fieldErrors) {
    return null;
  }

  return (
    Object.entries(fieldErrors).find(([, messages]) =>
      messages.some(Boolean),
    )?.[0] ?? null
  );
}

function fieldPathFromServerField(
  field: string,
): FieldPath<DeliveryFormValues> | null {
  if (
    field === "carrier" ||
    field === "cityId" ||
    field === "cityName" ||
    field === "fullName" ||
    field === "instagramUsername" ||
    field === "paymentMethod" ||
    field === "phone" ||
    field === "warehouseAddress" ||
    field === "warehouseId" ||
    field === "warehouseName"
  ) {
    return field;
  }

  return null;
}

function summaryInstagramText(value: string) {
  const formatted = formatInstagramUsername(value);

  return formatted ?? "Не вказано";
}

function stepIndexForField(field: string) {
  const stepIndex = deliveryFormSteps.findIndex((step) =>
    step.fields.some((stepField) => stepField === field),
  );

  return stepIndex >= 0 ? stepIndex : deliveryFormSteps.length - 1;
}

function focusElement(id: string) {
  window.setTimeout(() => {
    document.getElementById(id)?.focus();
  }, 0);
}
