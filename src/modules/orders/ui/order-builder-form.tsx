"use client";

import { Copy, ImageIcon, Link2, Send } from "lucide-react";
import type { FormEvent } from "react";
import { useMemo, useState, useTransition } from "react";
import type { OrderBuilderProduct } from "@/modules/orders/application/list-order-builder-products";
import type { OrderBuilderActionResult } from "@/modules/orders/ui/order-actions";
import { appendOrderBuilderItemToFormData } from "@/modules/orders/ui/order-builder-form-data";
import { Button } from "@/shared/ui/button";

type OrderBuilderFormProps = {
  action: (formData: FormData) => Promise<OrderBuilderActionResult>;
  products: OrderBuilderProduct[];
};

export function OrderBuilderForm({ action, products }: OrderBuilderFormProps) {
  const [selectedProductIds, setSelectedProductIds] = useState<Set<string>>(
    () => new Set(),
  );
  const [quantities, setQuantities] = useState<Record<string, string>>(() =>
    Object.fromEntries(products.map((product) => [product.id, "1"])),
  );
  const [message, setMessage] = useState<string | null>(null);
  const [messageKind, setMessageKind] = useState<"alert" | "status">("status");
  const [publicUrl, setPublicUrl] = useState<string | null>(null);
  const [copyMessage, setCopyMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const productById = useMemo(
    () => new Map(products.map((product) => [product.id, product])),
    [products],
  );
  const selectedItems = useMemo(
    () =>
      [...selectedProductIds].map((productId) => ({
        productId,
        quantity: Number(quantities[productId] ?? "1"),
      })),
    [quantities, selectedProductIds],
  );
  const totalMinor = useMemo(
    () =>
      selectedItems.reduce((total, item) => {
        const product = productById.get(item.productId);

        if (!product || !Number.isInteger(item.quantity) || item.quantity <= 0) {
          return total;
        }

        return total + product.priceMinor * item.quantity;
      }, 0),
    [productById, selectedItems],
  );

  function toggleProduct(productId: string, checked: boolean) {
    setPublicUrl(null);
    setCopyMessage(null);
    setSelectedProductIds((current) => {
      const next = new Set(current);

      if (checked) {
        next.add(productId);
      } else {
        next.delete(productId);
      }

      return next;
    });
  }

  function submitOrder(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(null);
    setPublicUrl(null);
    setCopyMessage(null);

    if (!selectedProductIds.size) {
      setMessageKind("alert");
      setMessage("Оберіть хоча б один товар");
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
        }
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
      <div className="rounded-md border border-dashed p-8 text-center">
        <h2 className="text-lg font-semibold">Немає активних товарів</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Увімкніть товари в каталозі, щоб створити посилання замовлення.
        </p>
      </div>
    );
  }

  return (
    <form className="grid gap-6" noValidate onSubmit={submitOrder}>
      {message ? (
        <p
          aria-live="polite"
          className={
            messageKind === "status"
              ? "rounded-md border border-border bg-muted px-3 py-2 text-sm"
              : "rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive"
          }
          role={messageKind}
        >
          {message}
        </p>
      ) : null}

      <div className="overflow-x-auto rounded-md border">
        <table className="w-full min-w-[820px] border-collapse text-left text-sm">
          <thead className="bg-muted text-muted-foreground">
            <tr>
              <th className="px-4 py-3 font-medium">Вибір</th>
              <th className="px-4 py-3 font-medium">Фото</th>
              <th className="px-4 py-3 font-medium">Товар</th>
              <th className="px-4 py-3 font-medium">Артикул</th>
              <th className="px-4 py-3 font-medium">Ціна</th>
              <th className="px-4 py-3 font-medium">Кількість</th>
              <th className="px-4 py-3 text-right font-medium">Сума</th>
            </tr>
          </thead>
          <tbody>
            {products.map((product) => {
              const selected = selectedProductIds.has(product.id);
              const quantity = quantities[product.id] ?? "1";
              const numericQuantity = Number(quantity);
              const lineTotal =
                selected &&
                Number.isInteger(numericQuantity) &&
                numericQuantity > 0
                  ? product.priceMinor * numericQuantity
                  : 0;

              return (
                <tr className="border-t" key={product.id}>
                  <td className="px-4 py-3">
                    <input
                      aria-label={`Додати ${product.name}`}
                      checked={selected}
                      className="size-4 rounded border-input"
                      onChange={(event) =>
                        toggleProduct(product.id, event.target.checked)
                      }
                      type="checkbox"
                    />
                  </td>
                  <td className="px-4 py-3">
                    <ProductPreview product={product} />
                  </td>
                  <td className="px-4 py-3 font-medium">{product.name}</td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {product.sku}
                  </td>
                  <td className="px-4 py-3">
                    {formatPrice(product.priceMinor, product.currency)}
                  </td>
                  <td className="px-4 py-3">
                    <label className="sr-only" htmlFor={`quantity-${product.id}`}>
                      Кількість для {product.name}
                    </label>
                    <input
                      className="h-10 w-24 rounded-md border border-input bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
                      disabled={!selected}
                      id={`quantity-${product.id}`}
                      inputMode="numeric"
                      min="1"
                      onChange={(event) =>
                        setQuantities((current) => ({
                          ...current,
                          [product.id]: event.target.value,
                        }))
                      }
                      step="1"
                      type="number"
                      value={quantity}
                    />
                  </td>
                  <td className="px-4 py-3 text-right font-medium">
                    {formatPrice(lineTotal, product.currency)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="flex flex-col gap-4 rounded-md border bg-card p-4 text-card-foreground sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm text-muted-foreground">Разом до сплати</p>
          <p className="text-2xl font-semibold tracking-normal">
            {formatPrice(totalMinor, products[0]?.currency ?? "UAH")}
          </p>
        </div>
        <Button disabled={isPending} type="submit">
          <Send aria-hidden="true" className="size-4" />
          {isPending ? "Створення…" : "Створити посилання"}
        </Button>
      </div>

      {publicUrl ? (
        <section className="grid gap-3 rounded-md border border-emerald-200 bg-emerald-50 p-4 text-emerald-950">
          <div className="flex items-center gap-2 font-medium">
            <Link2 aria-hidden="true" className="size-4" />
            Публічне посилання готове
          </div>
          <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
            <label className="grid gap-2 text-sm font-medium">
              Публічне посилання
              <input
                className="h-10 rounded-md border border-emerald-200 bg-white px-3 text-sm text-foreground"
                readOnly
                value={publicUrl}
              />
            </label>
            <Button onClick={copyPublicUrl} type="button" variant="outline">
              <Copy aria-hidden="true" className="size-4" />
              Копіювати
            </Button>
          </div>
          {copyMessage ? (
            <p aria-live="polite" className="text-sm" role="status">
              {copyMessage}
            </p>
          ) : null}
        </section>
      ) : null}
    </form>
  );
}

function ProductPreview({ product }: { product: OrderBuilderProduct }) {
  if (!product.imageUrl) {
    return (
      <div className="flex size-14 items-center justify-center rounded-md bg-muted">
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
      className="size-14 rounded-md object-cover"
      height="56"
      loading="lazy"
      src={product.imageUrl}
      width="56"
    />
  );
}

function formatPrice(priceMinor: number, currency: string): string {
  return new Intl.NumberFormat("uk-UA", {
    currency,
    style: "currency",
  }).format(priceMinor / 100);
}
