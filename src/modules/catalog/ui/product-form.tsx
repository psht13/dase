"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { ImageIcon, Plus, Save, Trash2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { useFieldArray, useForm } from "react-hook-form";
import type { ProductActionResult } from "@/modules/catalog/ui/product-actions";
import {
  productFormSchema,
  type ProductFormValues,
} from "@/modules/catalog/application/product-validation";
import { productFormValuesToFormData } from "@/modules/catalog/ui/product-form-data";
import { Button } from "@/shared/ui/button";

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
          if (!messages[0]) {
            continue;
          }

          form.setError(field as keyof ProductFormValues, {
            message: messages[0],
            type: "server",
          });
        }
        setServerMessage(result.message);
      });
    });
  }

  return (
    <form
      className="grid gap-8"
      noValidate
      onSubmit={form.handleSubmit(onSubmit)}
    >
      {serverMessage ? (
        <p
          aria-live="polite"
          className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive"
          role="alert"
        >
          {serverMessage}
        </p>
      ) : null}

      <section className="grid gap-4">
        <div className="grid gap-2">
          <label className="text-sm font-medium" htmlFor="product-name">
            Назва товару
          </label>
          <input
            aria-describedby={
              form.formState.errors.name ? "product-name-error" : undefined
            }
            aria-invalid={Boolean(form.formState.errors.name)}
            autoComplete="off"
            className="h-10 rounded-md border border-input bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
            id="product-name"
            placeholder="Каблучка з перлами"
            {...form.register("name")}
          />
          <FieldError
            id="product-name-error"
            message={form.formState.errors.name?.message}
          />
        </div>

        <div className="grid gap-2">
          <label className="text-sm font-medium" htmlFor="product-sku">
            Артикул
          </label>
          <input
            aria-describedby={
              form.formState.errors.sku ? "product-sku-error" : undefined
            }
            aria-invalid={Boolean(form.formState.errors.sku)}
            autoComplete="off"
            className="h-10 rounded-md border border-input bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
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

        <div className="grid gap-2">
          <label className="text-sm font-medium" htmlFor="product-description">
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
            className="min-h-28 rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
            id="product-description"
            placeholder="Матеріал, розмір, особливості виробу"
            {...form.register("description")}
          />
          <FieldError
            id="product-description-error"
            message={form.formState.errors.description?.message}
          />
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2">
        <div className="grid gap-2">
          <label className="text-sm font-medium" htmlFor="product-price">
            Ціна, грн
          </label>
          <input
            aria-describedby={
              form.formState.errors.price ? "product-price-error" : undefined
            }
            aria-invalid={Boolean(form.formState.errors.price)}
            autoComplete="off"
            className="h-10 rounded-md border border-input bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
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

        <div className="grid gap-2">
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
            className="h-10 rounded-md border border-input bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
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

      <section className="grid gap-4">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-base font-semibold">Зображення товару</h2>
          <Button
            onClick={() => append({ url: "" })}
            type="button"
            variant="outline"
          >
            <Plus aria-hidden="true" className="size-4" />
            Додати зображення
          </Button>
        </div>

        <div className="grid gap-4">
          {fields.map((field, index) => {
            const url = imageValues[index]?.url ?? "";

            return (
              <div
                className="grid gap-3 rounded-md border border-border p-3 sm:grid-cols-[1fr_9rem_auto] sm:items-start"
                key={field.id}
              >
                <div className="grid gap-2">
                  <label
                    className="text-sm font-medium"
                    htmlFor={`product-image-${index}`}
                  >
                    URL зображення
                  </label>
                  <input
                    aria-describedby={
                      form.formState.errors.imageUrls?.[index]?.url
                        ? `product-image-${index}-error`
                        : undefined
                    }
                    aria-invalid={Boolean(
                      form.formState.errors.imageUrls?.[index]?.url,
                    )}
                    autoComplete="off"
                    className="h-10 rounded-md border border-input bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    id={`product-image-${index}`}
                    placeholder="https://example.com/image.jpg"
                    spellCheck={false}
                    type="url"
                    {...form.register(`imageUrls.${index}.url`)}
                  />
                  <FieldError
                    id={`product-image-${index}-error`}
                    message={
                      form.formState.errors.imageUrls?.[index]?.url?.message
                    }
                  />
                </div>

                <div className="flex aspect-square items-center justify-center overflow-hidden rounded-md border bg-muted">
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

                <Button
                  aria-label="Видалити зображення"
                  disabled={fields.length === 1}
                  onClick={() => remove(index)}
                  size="icon"
                  type="button"
                  variant="outline"
                >
                  <Trash2 aria-hidden="true" className="size-4" />
                </Button>
              </div>
            );
          })}
        </div>
      </section>

      <label className="flex items-center gap-3 text-sm font-medium">
        <input
          className="size-4 rounded border-input"
          type="checkbox"
          {...form.register("isActive")}
        />
        Активний товар
      </label>

      <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
        <Button asChild variant="outline">
          <Link href={cancelHref}>Скасувати</Link>
        </Button>
        <Button disabled={isPending} type="submit">
          <Save aria-hidden="true" className="size-4" />
          {isPending ? "Збереження…" : submitLabel}
        </Button>
      </div>
    </form>
  );
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

function isPreviewableUrl(value: string): boolean {
  try {
    const url = new URL(value);

    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}
