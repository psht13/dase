"use client";

import {
  Check,
  Copy,
  ExternalLink,
  ImageIcon,
  Link2,
  Minus,
  Plus,
  Search,
  Send,
} from "lucide-react";
import Link from "next/link";
import type { FormEvent } from "react";
import { useMemo, useRef, useState, useTransition } from "react";
import type { OrderBuilderProduct } from "@/modules/orders/application/list-order-builder-products";
import type { OrderBuilderActionResult } from "@/modules/orders/ui/order-actions";
import { appendOrderBuilderItemToFormData } from "@/modules/orders/ui/order-builder-form-data";
import { Button } from "@/shared/ui/button";
import {
  FormSummaryCard,
  StepCard,
  Stepper,
} from "@/shared/ui/multi-step-form";
import { cn } from "@/shared/utils/cn";
import { formatMoneyMinor } from "@/shared/utils/format-money";

type OrderBuilderFormProps = {
  action: (formData: FormData) => Promise<OrderBuilderActionResult>;
  products: OrderBuilderProduct[];
};

const productSelectionStepIndex = 0;
const quantityStepIndex = 1;
const reviewStepIndex = 2;
const linkStepIndex = 3;

const orderBuilderSteps = [
  {
    description: "Знайдіть активні товари й додайте їх до замовлення.",
    id: "products",
    title: "Вибір товарів",
  },
  {
    description: "Вкажіть кількість для кожного обраного товару.",
    id: "quantities",
    title: "Кількість",
  },
  {
    description: "Перевірте склад замовлення і загальну суму.",
    id: "review",
    title: "Перевірка",
  },
  {
    description: "Скопіюйте або відкрийте створене публічне посилання.",
    id: "link",
    title: "Посилання",
  },
] as const;

const textInputClassName =
  "h-11 w-full rounded-md border border-input bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50";

export function OrderBuilderForm({ action, products }: OrderBuilderFormProps) {
  const headingRef = useRef<HTMLHeadingElement>(null);
  const [currentStepIndex, setCurrentStepIndex] = useState(
    productSelectionStepIndex,
  );
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedProductIds, setSelectedProductIds] = useState<Set<string>>(
    () => new Set(),
  );
  const [quantities, setQuantities] = useState<Record<string, string>>(() =>
    Object.fromEntries(products.map((product) => [product.id, "1"])),
  );
  const [stepErrorMessage, setStepErrorMessage] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [messageKind, setMessageKind] = useState<"alert" | "status">("status");
  const [publicUrl, setPublicUrl] = useState<string | null>(null);
  const [copyMessage, setCopyMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const currentStep =
    orderBuilderSteps[currentStepIndex] ??
    orderBuilderSteps[productSelectionStepIndex];
  const selectedProducts = useMemo(
    () => products.filter((product) => selectedProductIds.has(product.id)),
    [products, selectedProductIds],
  );
  const filteredProducts = useMemo(() => {
    const normalizedQuery = normalizeSearch(searchQuery);

    if (!normalizedQuery) {
      return products;
    }

    return products.filter((product) =>
      normalizeSearch(`${product.name} ${product.sku}`).includes(
        normalizedQuery,
      ),
    );
  }, [products, searchQuery]);
  const quantityErrors = useMemo(() => {
    const errors: Record<string, string> = {};

    selectedProducts.forEach((product) => {
      const error = quantityErrorForValue(quantities[product.id] ?? "");

      if (error) {
        errors[product.id] = error;
      }
    });

    return errors;
  }, [quantities, selectedProducts]);
  const selectedItems = useMemo(
    () =>
      selectedProducts.map((product) => ({
        productId: product.id,
        quantity: parsePositiveInteger(quantities[product.id] ?? "1") ?? 0,
      })),
    [quantities, selectedProducts],
  );
  const totalMinor = useMemo(
    () =>
      selectedProducts.reduce((total, product) => {
        const quantity = parsePositiveInteger(quantities[product.id] ?? "1");

        if (!quantity) {
          return total;
        }

        return total + product.priceMinor * quantity;
      }, 0),
    [quantities, selectedProducts],
  );
  const currency = products[0]?.currency ?? "UAH";

  function focusStepHeading() {
    window.setTimeout(() => {
      headingRef.current?.focus();
    }, 0);
  }

  function moveToStep(stepIndex: number) {
    setStepErrorMessage(null);
    setCurrentStepIndex(clampStepIndex(stepIndex));
    focusStepHeading();
  }

  function resetGeneratedLink() {
    setPublicUrl(null);
    setCopyMessage(null);
    setMessage(null);
  }

  function toggleProduct(productId: string, checked: boolean) {
    resetGeneratedLink();
    setStepErrorMessage(null);
    setSelectedProductIds((current) => {
      const next = new Set(current);

      if (checked) {
        next.add(productId);
      } else {
        next.delete(productId);
      }

      return next;
    });
    setQuantities((current) => ({
      ...current,
      [productId]: current[productId] ?? "1",
    }));
  }

  function updateQuantity(productId: string, value: string) {
    resetGeneratedLink();
    setStepErrorMessage(null);
    setQuantities((current) => ({
      ...current,
      [productId]: value,
    }));
  }

  function adjustQuantity(productId: string, delta: number) {
    resetGeneratedLink();
    setStepErrorMessage(null);
    setQuantities((current) => {
      const currentQuantity = parsePositiveInteger(current[productId] ?? "1");
      const nextQuantity = Math.max(1, (currentQuantity ?? 0) + delta);

      return {
        ...current,
        [productId]: String(nextQuantity),
      };
    });
  }

  function validateProductSelection() {
    if (!selectedProductIds.size) {
      setStepErrorMessage("Оберіть хоча б один товар");
      focusStepHeading();
      return false;
    }

    setStepErrorMessage(null);
    return true;
  }

  function validateQuantities() {
    if (!selectedProductIds.size) {
      setCurrentStepIndex(productSelectionStepIndex);
      setStepErrorMessage("Оберіть хоча б один товар");
      focusStepHeading();
      return false;
    }

    const firstInvalidProduct = selectedProducts.find(
      (product) => quantityErrors[product.id],
    );

    if (firstInvalidProduct) {
      setStepErrorMessage("Виправте кількість обраних товарів");
      window.setTimeout(() => {
        document.getElementById(`quantity-${firstInvalidProduct.id}`)?.focus();
      }, 0);
      return false;
    }

    setStepErrorMessage(null);
    return true;
  }

  function goNext() {
    if (currentStep.id === "products" && !validateProductSelection()) {
      return;
    }

    if (currentStep.id === "quantities" && !validateQuantities()) {
      return;
    }

    moveToStep(currentStepIndex + 1);
  }

  function submitOrder(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(null);
    setCopyMessage(null);

    if (!validateProductSelection()) {
      setCurrentStepIndex(productSelectionStepIndex);
      return;
    }

    if (!validateQuantities()) {
      setCurrentStepIndex(quantityStepIndex);
      return;
    }

    const formData = new FormData();
    selectedItems.forEach((item) => {
      appendOrderBuilderItemToFormData(formData, item);
    });

    startTransition(() => {
      void action(formData).then((result) => {
        setMessageKind(result.ok ? "status" : "alert");
        setMessage(result.message);

        if (result.ok) {
          setPublicUrl(result.publicUrl);
          moveToStep(linkStepIndex);
          return;
        }

        if (result.message.includes("Кількість")) {
          moveToStep(quantityStepIndex);
          return;
        }

        moveToStep(productSelectionStepIndex);
      });
    });
  }

  async function copyPublicUrl() {
    if (!publicUrl) {
      return;
    }

    try {
      await navigator.clipboard.writeText(publicUrl);
      setCopyMessage("Скопійовано");
    } catch {
      setCopyMessage("Скопіюйте посилання вручну");
    }
  }

  if (!products.length) {
    return (
      <div className="grid min-w-0 gap-3 rounded-md border border-dashed p-6 text-center sm:p-8">
        <h2 className="text-lg font-semibold">Немає активних товарів</h2>
        <p className="mx-auto max-w-xl text-sm text-muted-foreground">
          Створіть або увімкніть товар у каталозі. Після цього він зʼявиться на
          першому кроці створення замовлення.
        </p>
        <div>
          <Button asChild>
            <Link href="/dashboard/products/new">Створити товар</Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <form
      className="grid min-w-0 gap-5 lg:grid-cols-[15rem_minmax(0,1fr)] lg:items-start lg:gap-6"
      noValidate
      onSubmit={submitOrder}
    >
      {message ? (
        <p
          aria-live="polite"
          className={cn(
            "rounded-md border px-3 py-2 text-sm lg:col-span-2",
            messageKind === "status"
              ? "border-border bg-muted"
              : "border-destructive/30 bg-destructive/10 text-destructive",
          )}
          role={messageKind}
        >
          {message}
        </p>
      ) : null}

      <Stepper
        className="lg:sticky lg:top-24"
        currentStepIndex={currentStepIndex}
        steps={orderBuilderSteps}
      />

      <div className="grid min-w-0 gap-4">
        <StepCard
          description={currentStep.description}
          errorMessage={stepErrorMessage}
          headingRef={headingRef}
          title={currentStep.title}
        >
          {currentStep.id === "products" ? (
            <div className="grid min-w-0 gap-4">
              <div className="grid min-w-0 gap-2">
                <label
                  className="text-sm font-medium"
                  htmlFor="order-builder-search"
                >
                  Пошук товарів
                </label>
                <div className="relative min-w-0">
                  <Search
                    aria-hidden="true"
                    className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
                  />
                  <input
                    autoComplete="off"
                    className={cn(textInputClassName, "pl-10")}
                    id="order-builder-search"
                    onChange={(event) => setSearchQuery(event.target.value)}
                    placeholder="Назва або артикул"
                    type="search"
                    value={searchQuery}
                  />
                </div>
              </div>

              <div className="flex min-w-0 flex-col gap-1 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
                <p>Активні товари: {products.length}</p>
                <p>Обрано товарів: {selectedProductIds.size}</p>
              </div>

              {filteredProducts.length ? (
                <ul className="grid min-w-0 gap-3 xl:grid-cols-2">
                  {filteredProducts.map((product) => {
                    const selected = selectedProductIds.has(product.id);

                    return (
                      <li className="min-w-0" key={product.id}>
                        <label
                          className={cn(
                            "grid min-w-0 cursor-pointer gap-3 rounded-md border border-border/80 bg-background p-3 transition-colors sm:grid-cols-[auto_minmax(0,1fr)_auto] sm:items-center",
                            selected
                              ? "border-primary bg-primary/10"
                              : "hover:border-accent hover:bg-accent/20",
                          )}
                        >
                          <input
                            aria-label={`Додати ${product.name}`}
                            checked={selected}
                            className="mt-1 size-5 shrink-0 rounded border-input sm:mt-0"
                            onChange={(event) =>
                              toggleProduct(product.id, event.target.checked)
                            }
                            type="checkbox"
                          />
                          <span className="grid min-w-0 grid-cols-[3.5rem_minmax(0,1fr)] gap-3">
                            <ProductPreview product={product} />
                            <span className="grid min-w-0 gap-1">
                              <span className="break-words text-sm font-semibold text-foreground">
                                {product.name}
                              </span>
                              <span className="break-words text-xs text-muted-foreground">
                                Артикул: {product.sku}
                              </span>
                              <span className="text-sm font-medium">
                                {formatMoneyMinor(
                                  product.priceMinor,
                                  product.currency,
                                )}
                              </span>
                            </span>
                          </span>
                          <span className="flex min-w-0 flex-wrap items-center gap-2 text-sm sm:justify-end">
                            <span className="rounded-md bg-muted px-2 py-1 text-muted-foreground">
                              Залишок: {product.stockQuantity}
                            </span>
                            {selected ? (
                              <span className="inline-flex items-center gap-1 rounded-md bg-primary px-2 py-1 text-primary-foreground">
                                <Check aria-hidden="true" className="size-4" />
                                Обрано
                              </span>
                            ) : null}
                          </span>
                        </label>
                      </li>
                    );
                  })}
                </ul>
              ) : (
                <p
                  className="rounded-md border border-dashed p-4 text-sm text-muted-foreground"
                  role="status"
                >
                  За цим пошуком активних товарів не знайдено. Перевірте назву
                  або артикул чи увімкніть потрібний товар у каталозі.
                </p>
              )}
            </div>
          ) : null}

          {currentStep.id === "quantities" ? (
            <div className="grid min-w-0 gap-3">
              {selectedProducts.length ? (
                <ul className="grid min-w-0 gap-3">
                  {selectedProducts.map((product) => {
                    const quantity = quantities[product.id] ?? "1";
                    const quantityError = quantityErrors[product.id];
                    const parsedQuantity = parsePositiveInteger(quantity);
                    const lineTotal = parsedQuantity
                      ? product.priceMinor * parsedQuantity
                      : 0;

                    return (
                      <li
                        className="grid min-w-0 gap-3 rounded-md border border-border/80 bg-background p-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-start"
                        key={product.id}
                      >
                        <div className="grid min-w-0 grid-cols-[3.5rem_minmax(0,1fr)] gap-3">
                          <ProductPreview product={product} />
                          <div className="grid min-w-0 gap-1">
                            <p className="break-words text-sm font-semibold">
                              {product.name}
                            </p>
                            <p className="break-words text-xs text-muted-foreground">
                              Артикул: {product.sku}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              Ціна:{" "}
                              {formatMoneyMinor(
                                product.priceMinor,
                                product.currency,
                              )}
                            </p>
                          </div>
                        </div>

                        <div className="grid min-w-0 gap-2 sm:min-w-72">
                          <div className="flex min-w-0 items-center gap-2">
                            <Button
                              aria-label={`Зменшити кількість для ${product.name}`}
                              onClick={() => adjustQuantity(product.id, -1)}
                              size="icon"
                              type="button"
                              variant="outline"
                            >
                              <Minus aria-hidden="true" className="size-4" />
                            </Button>
                            <label
                              className="sr-only"
                              htmlFor={`quantity-${product.id}`}
                            >
                              Кількість для {product.name}
                            </label>
                            <input
                              aria-describedby={
                                quantityError
                                  ? `quantity-${product.id}-error`
                                  : undefined
                              }
                              aria-invalid={Boolean(quantityError)}
                              className={cn(
                                textInputClassName,
                                "min-w-0 text-center tabular-nums",
                                quantityError
                                  ? "border-destructive focus-visible:ring-destructive"
                                  : null,
                              )}
                              id={`quantity-${product.id}`}
                              inputMode="numeric"
                              min="1"
                              onChange={(event) =>
                                updateQuantity(product.id, event.target.value)
                              }
                              step="1"
                              type="number"
                              value={quantity}
                            />
                            <Button
                              aria-label={`Збільшити кількість для ${product.name}`}
                              onClick={() => adjustQuantity(product.id, 1)}
                              size="icon"
                              type="button"
                              variant="outline"
                            >
                              <Plus aria-hidden="true" className="size-4" />
                            </Button>
                          </div>
                          <FieldError
                            id={`quantity-${product.id}-error`}
                            message={quantityError}
                          />
                          <p className="text-right text-sm font-medium">
                            Сума:{" "}
                            {formatMoneyMinor(lineTotal, product.currency)}
                          </p>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              ) : (
                <p
                  className="rounded-md border border-dashed p-4 text-sm text-muted-foreground"
                  role="status"
                >
                  У замовленні ще немає товарів. Поверніться до першого кроку й
                  оберіть хоча б один товар.
                </p>
              )}
            </div>
          ) : null}

          {currentStep.id === "review" ? (
            <div className="grid min-w-0 gap-4">
              <FormSummaryCard
                items={[
                  {
                    id: "items",
                    label: "Обрано товарів",
                    value: selectedProducts.length,
                  },
                  {
                    id: "total",
                    label: "Разом до сплати",
                    value: (
                      <span className="font-semibold">
                        {formatMoneyMinor(totalMinor, currency)}
                      </span>
                    ),
                  },
                ]}
                title="Підсумок замовлення"
              >
                <ul className="grid min-w-0 gap-3">
                  {selectedProducts.map((product) => {
                    const quantity =
                      parsePositiveInteger(quantities[product.id] ?? "1") ?? 0;
                    const lineTotal = product.priceMinor * quantity;

                    return (
                      <li
                        className="grid min-w-0 gap-2 rounded-md border border-border/80 bg-muted/30 p-3 text-sm sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center"
                        key={product.id}
                      >
                        <div className="min-w-0">
                          <p className="break-words font-medium">
                            {product.name}
                          </p>
                          <p className="break-words text-muted-foreground">
                            Артикул: {product.sku}
                          </p>
                        </div>
                        <div className="grid min-w-0 gap-1 text-left sm:text-right">
                          <p>Кількість: {quantity}</p>
                          <p className="font-semibold">
                            {formatMoneyMinor(lineTotal, product.currency)}
                          </p>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </FormSummaryCard>
            </div>
          ) : null}

          {currentStep.id === "link" ? (
            <div className="grid min-w-0 gap-4">
              {publicUrl ? (
                <FormSummaryCard title="Публічне посилання готове">
                  <div className="flex min-w-0 items-center gap-2 text-sm font-medium text-emerald-900">
                    <Link2 aria-hidden="true" className="size-4" />
                    Посилання замовлення створено
                  </div>
                  <div className="grid min-w-0 gap-3 lg:grid-cols-[minmax(0,1fr)_auto_auto] lg:items-end">
                    <label className="grid min-w-0 gap-2 text-sm font-medium">
                      Публічне посилання
                      <input
                        className={cn(
                          textInputClassName,
                          "min-w-0 border-emerald-200 bg-white text-foreground",
                        )}
                        readOnly
                        value={publicUrl}
                      />
                    </label>
                    <Button
                      onClick={copyPublicUrl}
                      type="button"
                      variant="outline"
                    >
                      <Copy aria-hidden="true" className="size-4" />
                      Копіювати
                    </Button>
                    <Button asChild variant="outline">
                      <a
                        href={publicUrl}
                        rel="noreferrer"
                        target="_blank"
                      >
                        <ExternalLink aria-hidden="true" className="size-4" />
                        Відкрити
                      </a>
                    </Button>
                  </div>
                  {copyMessage ? (
                    <p aria-live="polite" className="text-sm" role="status">
                      {copyMessage}
                    </p>
                  ) : null}
                </FormSummaryCard>
              ) : (
                <p
                  className="rounded-md border border-dashed p-4 text-sm text-muted-foreground"
                  role="status"
                >
                  Посилання ще не створено. Перевірте склад замовлення й
                  натисніть «Створити посилання».
                </p>
              )}
            </div>
          ) : null}
        </StepCard>

        {currentStep.id === "products" || currentStep.id === "quantities" ? (
          <div className="flex min-w-0 flex-col-reverse gap-3 sm:flex-row sm:justify-between">
            <Button
              disabled={currentStepIndex === productSelectionStepIndex}
              onClick={() => moveToStep(currentStepIndex - 1)}
              type="button"
              variant="outline"
            >
              Назад
            </Button>
            <Button disabled={isPending} onClick={goNext} type="button">
              Далі
            </Button>
          </div>
        ) : null}

        {currentStep.id === "review" ? (
          <div className="flex min-w-0 flex-col-reverse gap-3 sm:flex-row sm:justify-between">
            <Button
              disabled={isPending}
              onClick={() => moveToStep(quantityStepIndex)}
              type="button"
              variant="outline"
            >
              Назад
            </Button>
            <Button disabled={isPending} type="submit">
              <Send aria-hidden="true" className="size-4" />
              {isPending ? "Створення…" : "Створити посилання"}
            </Button>
          </div>
        ) : null}

        {currentStep.id === "link" ? (
          <div className="flex min-w-0 flex-col-reverse gap-3 sm:flex-row sm:justify-between">
            <Button
              disabled={isPending}
              onClick={() => moveToStep(reviewStepIndex)}
              type="button"
              variant="outline"
            >
              Повернутися до перевірки
            </Button>
          </div>
        ) : null}
      </div>
    </form>
  );
}

function FieldError({
  id,
  message,
}: {
  id: string;
  message?: string;
}) {
  if (!message) {
    return null;
  }

  return (
    <p className="text-sm text-destructive" id={id}>
      {message}
    </p>
  );
}

function ProductPreview({ product }: { product: OrderBuilderProduct }) {
  if (!product.imageUrl) {
    return (
      <div className="flex size-14 shrink-0 items-center justify-center rounded-md bg-muted">
        <ImageIcon
          aria-hidden="true"
          className="size-6 text-muted-foreground"
        />
      </div>
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      alt={product.name}
      className="size-14 shrink-0 rounded-md object-cover"
      height="56"
      loading="lazy"
      src={product.imageUrl}
      width="56"
    />
  );
}

function normalizeSearch(value: string) {
  return value.trim().toLocaleLowerCase("uk-UA");
}

function parsePositiveInteger(value: string) {
  const quantity = Number(value);

  if (!Number.isInteger(quantity) || quantity <= 0) {
    return null;
  }

  return quantity;
}

function quantityErrorForValue(value: string) {
  if (!value.trim()) {
    return "Вкажіть кількість";
  }

  if (!parsePositiveInteger(value)) {
    return "Кількість має бути цілим числом більше нуля";
  }

  return null;
}

function clampStepIndex(stepIndex: number) {
  return Math.min(Math.max(stepIndex, productSelectionStepIndex), linkStepIndex);
}
