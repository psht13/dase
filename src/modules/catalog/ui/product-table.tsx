import { Edit3, Power, PowerOff } from "lucide-react";
import Link from "next/link";
import type { ProductRecord } from "@/modules/catalog/application/product-repository";
import { Button } from "@/shared/ui/button";
import { ActionBar } from "@/shared/ui/page-layout";
import { cn } from "@/shared/utils/cn";
import { formatMoneyMinor } from "@/shared/utils/format-money";

type ProductTableProps = {
  products: ProductRecord[];
  toggleAction: (productId: string, isActive: boolean) => Promise<void>;
};

export function ProductTable({ products, toggleAction }: ProductTableProps) {
  if (!products.length) {
    return (
      <div className="grid min-w-0 gap-3 rounded-md border border-dashed p-6 text-center sm:p-8">
        <h2 className="text-lg font-semibold">Каталог порожній</h2>
        <p className="mx-auto max-w-xl text-sm text-muted-foreground">
          Додайте товар із ціною, залишком і зовнішнім URL зображення, щоб
          використовувати його в нових замовленнях.
        </p>
        <ActionBar align="center">
          <Button asChild>
            <Link href="/dashboard/products/new">Створити товар</Link>
          </Button>
        </ActionBar>
      </div>
    );
  }

  return (
    <>
      <div
        className="grid min-w-0 gap-3 lg:hidden"
        data-testid="product-mobile-list"
      >
        {products.map((product) => (
          <ProductCard
            key={product.id}
            product={product}
            toggleAction={toggleAction}
          />
        ))}
      </div>

      <div
        className="hidden w-full max-w-full overflow-hidden rounded-md border lg:block"
        data-testid="product-desktop-table"
      >
        <table className="w-full table-fixed border-collapse text-left text-sm">
          <thead className="bg-muted text-muted-foreground">
            <tr>
              <th className="w-[44%] px-4 py-3 font-medium">Товар</th>
              <th className="w-[22%] px-4 py-3 font-medium">
                Ціна і залишок
              </th>
              <th className="w-[14%] px-4 py-3 font-medium">Стан</th>
              <th className="w-[20%] px-4 py-3 text-right font-medium">Дії</th>
            </tr>
          </thead>
          <tbody>
            {products.map((product) => (
              <tr className="border-t align-middle" key={product.id}>
                <td className="min-w-0 px-4 py-3">
                  <div className="flex min-w-0 items-center gap-3">
                    <ProductImage product={product} />
                    <div className="min-w-0">
                      <p className="truncate font-medium">{product.name}</p>
                      <p className="mt-1 truncate text-xs text-muted-foreground">
                        Артикул: {product.sku}
                      </p>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3">
                  <p className="font-medium tabular-nums">
                    {formatMoneyMinor(product.priceMinor, product.currency)}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Залишок: {product.stockQuantity}
                  </p>
                </td>
                <td className="px-4 py-3">
                  <ProductStatusBadge isActive={product.isActive} />
                </td>
                <td className="px-4 py-3">
                  <ProductActions
                    isCompact
                    product={product}
                    toggleAction={toggleAction}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

function ProductCard({
  product,
  toggleAction,
}: {
  product: ProductRecord;
  toggleAction: ProductTableProps["toggleAction"];
}) {
  return (
    <article
      aria-label={`Товар ${product.name}`}
      className="grid min-w-0 gap-4 rounded-md border bg-card p-4"
      data-testid="product-mobile-card"
    >
      <div className="flex min-w-0 items-start gap-3">
        <ProductImage product={product} />
        <div className="min-w-0 flex-1">
          <div className="flex min-w-0 flex-wrap items-start gap-2">
            <h2 className="min-w-0 flex-1 break-words text-base font-semibold">
              {product.name}
            </h2>
            <ProductStatusBadge isActive={product.isActive} />
          </div>
          <p className="mt-1 break-words text-sm text-muted-foreground">
            Артикул: {product.sku}
          </p>
        </div>
      </div>

      <dl className="grid grid-cols-2 gap-3 text-sm">
        <div>
          <dt className="text-xs font-medium uppercase text-muted-foreground">
            Ціна
          </dt>
          <dd className="mt-1 font-medium tabular-nums">
            {formatMoneyMinor(product.priceMinor, product.currency)}
          </dd>
        </div>
        <div>
          <dt className="text-xs font-medium uppercase text-muted-foreground">
            Залишок
          </dt>
          <dd className="mt-1 font-medium tabular-nums">
            {product.stockQuantity}
          </dd>
        </div>
      </dl>

      <ProductActions product={product} toggleAction={toggleAction} />
    </article>
  );
}

function ProductActions({
  isCompact = false,
  product,
  toggleAction,
}: {
  isCompact?: boolean;
  product: ProductRecord;
  toggleAction: ProductTableProps["toggleAction"];
}) {
  return (
    <div
      className={cn(
        "flex min-w-0 gap-2",
        isCompact ? "justify-end" : "grid grid-cols-2",
      )}
    >
      <Button
        asChild
        className={cn(!isCompact && "w-full")}
        size={isCompact ? "sm" : "default"}
        variant="outline"
      >
        <Link href={`/dashboard/products/${product.id}/edit`}>
          <Edit3 aria-hidden="true" className="size-4" />
          Редагувати
        </Link>
      </Button>
      <form
        action={toggleAction.bind(null, product.id, !product.isActive)}
        className={cn(!isCompact && "min-w-0")}
      >
        <Button
          className={cn(!isCompact && "w-full")}
          size={isCompact ? "sm" : "default"}
          type="submit"
          variant="outline"
        >
          {product.isActive ? (
            <PowerOff aria-hidden="true" className="size-4" />
          ) : (
            <Power aria-hidden="true" className="size-4" />
          )}
          {product.isActive ? "Вимкнути" : "Увімкнути"}
        </Button>
      </form>
    </div>
  );
}

function ProductStatusBadge({ isActive }: { isActive: boolean }) {
  return (
    <span
      className={cn(
        "inline-flex shrink-0 rounded-md px-2 py-1 text-xs font-medium",
        isActive
          ? "bg-emerald-100 text-emerald-800"
          : "bg-muted text-muted-foreground",
      )}
    >
      {isActive ? "Активний" : "Неактивний"}
    </span>
  );
}

function ProductImage({ product }: { product: ProductRecord }) {
  const image = product.images[0];

  if (!image) {
    return (
      <div className="flex size-14 items-center justify-center rounded-md bg-muted text-xs text-muted-foreground">
        Немає
      </div>
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      alt={image.altText ?? product.name}
      className="size-14 rounded-md object-cover"
      height="56"
      loading="lazy"
      src={image.url}
      width="56"
    />
  );
}
