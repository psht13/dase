"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { ImageIcon, Plus, Save, Trash2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { useFieldArray, useForm, type FieldPath } from "react-hook-form";
import type { ProductActionResult } from "@/modules/catalog/ui/product-actions";
import {
  productFormSchema,
  type ProductFormValues,
} from "@/modules/catalog/application/product-validation";
import { productFormValuesToFormData } from "@/modules/catalog/ui/product-form-data";
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

const productFormSteps = [
  {
    description: "Назва, артикул, короткий опис і видимість товару.",
    fields: ["name", "sku", "description", "isActive"],
    id: "basic",
    title: "Основне",
  },
  {
    description: "Вкажіть ціну в гривнях і кількість доступних одиниць.",
    fields: ["price", "stockQuantity"],
    id: "pricing",
    title: "Ціна та залишок",
  },
  {
    description:
      "Додайте зовнішні URL зображень. Завантаження файлів не використовується.",
    fields: ["imageUrls"],
    id: "images",
    title: "Зображення",
  },
  {
    description: "Перевірте введені дані перед збереженням товару.",
    fields: [],
    id: "review",
    title: "Перевірка",
  },
] satisfies readonly MultiStepFormStep<ProductFormValues>[];

export const emptyProductFormValues: ProductFormValues = {
  description: "",
  imageUrls: [{ url: "" }],
  isActive: true,
  name: "",
  price: "",
  sku: "",
  stockQuantity: "0",
};

type ProductFormProps = {
  action: (formData: FormData) => Promise<ProductActionResult>;
  cancelHref: string;
  defaultValues?: ProductFormValues;
  submitLabel: string;
};

export function ProductForm({
  action,
  cancelHref,
  defaultValues = emptyProductFormValues,
  submitLabel,
}: ProductFormProps) {
  const router = useRouter();
  const [serverMessage, setServerMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const form = useForm<ProductFormValues>({
    defaultValues,
    resolver: zodResolver(productFormSchema),
  });
  const { append, fields, remove } = useFieldArray({
    control: form.control,
    name: "imageUrls",
  });
  const imageValues = form.watch("imageUrls");
  const formValues = form.watch();
  const stepper = useMultiStepForm({
    finalValidationMessage: "Перевірте дані товару перед збереженням",
    form,
    steps: productFormSteps,
    validationMessage: "Перевірте поля цього кроку",
  });

  function onSubmit(values: ProductFormValues) {
    setServerMessage(null);
    startTransition(() => {
      void action(productFormValuesToFormData(values)).then((result) => {
        if (result.ok) {
          router.push(result.redirectTo);
          router.refresh();
          return;
        }

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

        setServerMessage(result.message);
      });
    });
  }

  return (
    <form
      className="min-w-0"
      noValidate
      onSubmit={stepper.handleSubmit(onSubmit)}
    >
      <WizardPageLayout
        message={
          serverMessage ? (
            <p
              aria-live="polite"
              className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive"
              role="alert"
            >
              {serverMessage}
            </p>
          ) : null
        }
        stepper={
          <WizardStepper
            currentStepIndex={stepper.currentStepIndex}
            desktopLayout="rail"
            steps={productFormSteps}
          />
        }
      >
        <StepCard
          description={stepper.currentStep.description}
          errorMessage={stepper.stepErrorMessage}
          headingRef={stepper.headingRef}
          title={stepper.currentStep.title}
        >
          {stepper.currentStep.id === "basic" ? (
            <section className="grid min-w-0 gap-4 lg:grid-cols-2">
              <div className="grid min-w-0 gap-2">
                <label className="text-sm font-medium" htmlFor="product-name">
                  Назва товару
                </label>
                <input
                  aria-describedby={
                    form.formState.errors.name
                      ? "product-name-error"
                      : undefined
                  }
                  aria-invalid={Boolean(form.formState.errors.name)}
                  autoComplete="off"
                  className={inputClassName}
                  id="product-name"
                  placeholder="Каблучка з перлами"
                  {...form.register("name")}
                />
                <FieldError
                  id="product-name-error"
                  message={form.formState.errors.name?.message}
                />
              </div>

              <div className="grid min-w-0 gap-2">
                <label className="text-sm font-medium" htmlFor="product-sku">
                  Артикул
                </label>
                <input
                  aria-describedby={
                    form.formState.errors.sku ? "product-sku-error" : undefined
                  }
                  aria-invalid={Boolean(form.formState.errors.sku)}
                  autoComplete="off"
                  className={inputClassName}
                  id="product-sku"
                  placeholder="RING-001"
                  spellCheck={false}
                  {...form.register("sku")}
                />
                <FieldError
                  id="product-sku-error"
                  message={form.formState.errors.sku?.message}
                />
              </div>

              <div className="grid min-w-0 gap-2 lg:col-span-2">
                <label
                  className="text-sm font-medium"
                  htmlFor="product-description"
                >
                  Опис
                </label>
                <textarea
                  aria-describedby={
                    form.formState.errors.description
                      ? "product-description-error"
                      : undefined
                  }
                  aria-invalid={Boolean(form.formState.errors.description)}
                  autoComplete="off"
                  className="min-h-32 rounded-md border border-input bg-background px-3 py-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  id="product-description"
                  placeholder="Матеріал, розмір, особливості виробу"
                  {...form.register("description")}
                />
                <FieldError
                  id="product-description-error"
                  message={form.formState.errors.description?.message}
                />
              </div>

              <div className="flex min-w-0 items-start gap-3 rounded-md border border-border/80 bg-background px-3 py-3 text-sm lg:col-span-2">
                <input
                  aria-describedby="product-active-hint"
                  className="mt-0.5 size-5 shrink-0 rounded border-input"
                  id="product-active"
                  type="checkbox"
                  {...form.register("isActive")}
                />
                <span className="grid min-w-0 gap-1">
                  <label className="font-medium" htmlFor="product-active">
                    Активний товар
                  </label>
                  <span
                    className="text-muted-foreground"
                    id="product-active-hint"
                  >
                    Товар буде доступний для створення замовлень.
                  </span>
                </span>
              </div>
            </section>
          ) : null}

          {stepper.currentStep.id === "pricing" ? (
            <section className="grid min-w-0 gap-4 md:grid-cols-2">
              <div className="grid min-w-0 gap-2">
                <label className="text-sm font-medium" htmlFor="product-price">
                  Ціна, грн
                </label>
                <input
                  aria-describedby={
                    form.formState.errors.price
                      ? "product-price-error"
                      : undefined
                  }
                  aria-invalid={Boolean(form.formState.errors.price)}
                  autoComplete="off"
                  className={inputClassName}
                  id="product-price"
                  inputMode="decimal"
                  placeholder="1200,00"
                  {...form.register("price")}
                />
                <FieldError
                  id="product-price-error"
                  message={form.formState.errors.price?.message}
                />
              </div>

              <div className="grid min-w-0 gap-2">
                <label className="text-sm font-medium" htmlFor="product-stock">
                  Залишок
                </label>
                <input
                  aria-describedby={
                    form.formState.errors.stockQuantity
                      ? "product-stock-error"
                      : undefined
                  }
                  aria-invalid={Boolean(form.formState.errors.stockQuantity)}
                  autoComplete="off"
                  className={inputClassName}
                  id="product-stock"
                  inputMode="numeric"
                  placeholder="5"
                  {...form.register("stockQuantity")}
                />
                <FieldError
                  id="product-stock-error"
                  message={form.formState.errors.stockQuantity?.message}
                />
              </div>
            </section>
          ) : null}

          {stepper.currentStep.id === "images" ? (
            <section className="grid min-w-0 gap-4">
              <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-sm text-muted-foreground">
                  Використовуйте прямі посилання на зображення у форматі
                  https://...
                </p>
                <Button
                  className="w-full sm:w-auto"
                  onClick={() => append({ url: "" })}
                  type="button"
                  variant="outline"
                >
                  <Plus aria-hidden="true" className="size-4" />
                  Додати зображення
                </Button>
              </div>

              <div className="grid min-w-0 gap-4">
                {fields.map((field, index) => {
                  const url = imageValues[index]?.url ?? "";
                  const imageError =
                    form.formState.errors.imageUrls?.[index]?.url?.message;
                  const imageHintId = `product-image-${index}-hint`;
                  const imageErrorId = `product-image-${index}-error`;

                  return (
                    <div
                      className="grid min-w-0 gap-4 rounded-md border border-border/80 bg-background p-3 shadow-sm sm:p-4 md:grid-cols-[minmax(0,1fr)_9rem_3rem] md:items-start"
                      key={field.id}
                    >
                      <div className="grid min-w-0 gap-2">
                        <label
                          className="text-sm font-medium"
                          htmlFor={`product-image-${index}`}
                        >
                          URL зображення
                        </label>
                        <input
                          aria-describedby={describedBy(
                            imageHintId,
                            imageError ? imageErrorId : undefined,
                          )}
                          aria-invalid={Boolean(imageError)}
                          autoComplete="off"
                          className={inputClassName}
                          id={`product-image-${index}`}
                          placeholder="https://example.com/image.jpg"
                          spellCheck={false}
                          type="url"
                          {...form.register(`imageUrls.${index}.url`)}
                        />
                        <p
                          className="text-sm leading-5 text-muted-foreground"
                          id={imageHintId}
                        >
                          Лише зовнішній URL, без завантаження файлів.
                        </p>
                        <FieldError id={imageErrorId} message={imageError} />
                      </div>

                      <div className="grid min-w-0 gap-2">
                        <span className="text-sm font-medium">Прев’ю</span>
                        <div className="flex aspect-[4/3] w-full max-w-full items-center justify-center overflow-hidden rounded-md border border-input bg-muted md:aspect-square">
                          {isPreviewableUrl(url) ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              alt={`Зображення товару ${index + 1}`}
                              className="size-full object-cover"
                              height="144"
                              src={url}
                              width="144"
                            />
                          ) : (
                            <ImageIcon
                              aria-hidden="true"
                              className="size-8 text-muted-foreground"
                            />
                          )}
                        </div>
                      </div>

                      <Button
                        aria-label="Видалити зображення"
                        className="justify-self-start text-muted-foreground hover:text-destructive md:justify-self-end"
                        disabled={fields.length === 1}
                        onClick={() => remove(index)}
                        size="iconLg"
                        type="button"
                        variant="outline"
                      >
                        <Trash2 aria-hidden="true" className="size-5" />
                      </Button>
                    </div>
                  );
                })}
              </div>
            </section>
          ) : null}

          {stepper.currentStep.id === "review" ? (
            <FormSummaryCard
              items={[
                {
                  id: "name",
                  label: "Назва",
                  value: summaryText(formValues.name),
                },
                {
                  id: "sku",
                  label: "Артикул",
                  value: summaryText(formValues.sku),
                },
                {
                  id: "description",
                  label: "Опис",
                  value: summaryText(formValues.description),
                },
                {
                  id: "status",
                  label: "Статус",
                  value: formValues.isActive
                    ? "Активний товар"
                    : "Неактивний товар",
                },
                {
                  id: "price",
                  label: "Ціна",
                  value: formValues.price.trim()
                    ? `${formValues.price.trim()} грн`
                    : "Не вказано",
                },
                {
                  id: "stock",
                  label: "Залишок",
                  value: summaryText(formValues.stockQuantity),
                },
                {
                  id: "images",
                  label: "Зображення",
                  value: <ImageSummary imageUrls={imageValues} />,
                },
              ]}
              title="Підсумок товару"
            />
          ) : null}
        </StepCard>

        <StepActions
          isFirstStep={stepper.isFirstStep}
          isLastStep={stepper.isLastStep}
          isPending={isPending}
          onBack={stepper.goBack}
          onNext={stepper.goNext}
          secondaryAction={
            <Button asChild className="w-full sm:w-auto" variant="outline">
              <Link href={cancelHref}>Скасувати</Link>
            </Button>
          }
          submitLabel={
            <>
              <Save aria-hidden="true" className="size-4" />
              {isPending ? "Збереження…" : submitLabel}
            </>
          }
        />
      </WizardPageLayout>
    </form>
  );
}

const inputClassName =
  "h-11 w-full rounded-md border border-input bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring";

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

function ImageSummary({
  imageUrls,
}: {
  imageUrls: ProductFormValues["imageUrls"];
}) {
  const filledImageUrls = imageUrls
    .map((image) => image.url.trim())
    .filter(Boolean);

  if (!filledImageUrls.length) {
    return "Не вказано";
  }

  return (
    <ul className="grid min-w-0 gap-2">
      {filledImageUrls.map((url, index) => (
        <li className="min-w-0 break-all" key={`${url}-${index}`}>
          {url}
        </li>
      ))}
    </ul>
  );
}

function summaryText(value: string) {
  return value.trim() || "Не вказано";
}

function describedBy(...ids: Array<string | undefined>) {
  const value = ids.filter(Boolean).join(" ");

  return value || undefined;
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
): FieldPath<ProductFormValues> | null {
  if (field === "imageUrls") {
    return "imageUrls.0.url";
  }

  if (
    field === "description" ||
    field === "isActive" ||
    field === "name" ||
    field === "price" ||
    field === "sku" ||
    field === "stockQuantity"
  ) {
    return field;
  }

  return null;
}

function stepIndexForField(field: string) {
  const normalizedField = field === "imageUrls" ? "imageUrls" : field;
  const stepIndex = productFormSteps.findIndex((step) =>
    step.fields.some((stepField) => stepField === normalizedField),
  );

  return stepIndex >= 0 ? stepIndex : productFormSteps.length - 1;
}

function isPreviewableUrl(value: string): boolean {
  try {
    const url = new URL(value);

    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}
