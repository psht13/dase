import { Edit3, Power, PowerOff } from "lucide-react";
import Link from "next/link";
import type { ProductRecord } from "@/modules/catalog/application/product-repository";
import { Button } from "@/shared/ui/button";

type ProductTableProps = {
  products: ProductRecord[];
  toggleAction: (productId: string, isActive: boolean) => Promise<void>;
};

export function ProductTable({ products, toggleAction }: ProductTableProps) {
  if (!products.length) {
    return (
      <div className="rounded-md border border-dashed p-8 text-center">
        <h2 className="text-lg font-semibold">Каталог порожній</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Створіть перший товар, щоб додавати його до замовлень.
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-md border">
      <table className="w-full min-w-[760px] border-collapse text-left text-sm">
        <thead className="bg-muted text-muted-foreground">
          <tr>
            <th className="px-4 py-3 font-medium">Фото</th>
            <th className="px-4 py-3 font-medium">Назва</th>
            <th className="px-4 py-3 font-medium">Артикул</th>
            <th className="px-4 py-3 font-medium">Ціна</th>
            <th className="px-4 py-3 font-medium">Залишок</th>
            <th className="px-4 py-3 font-medium">Стан</th>
            <th className="px-4 py-3 text-right font-medium">Дії</th>
          </tr>
        </thead>
        <tbody>
          {products.map((product) => (
            <tr className="border-t" key={product.id}>
              <td className="px-4 py-3">
                <ProductImage product={product} />
              </td>
              <td className="px-4 py-3 font-medium">{product.name}</td>
              <td className="px-4 py-3 text-muted-foreground">
                {product.sku}
              </td>
              <td className="px-4 py-3">
                {formatPrice(product.priceMinor, product.currency)}
              </td>
              <td className="px-4 py-3">{product.stockQuantity}</td>
              <td className="px-4 py-3">
                <span className="rounded-md bg-secondary px-2 py-1 text-xs font-medium">
                  {product.isActive ? "Активний" : "Неактивний"}
                </span>
              </td>
              <td className="px-4 py-3">
                <div className="flex justify-end gap-2">
                  <Button asChild size="sm" variant="outline">
                    <Link href={`/dashboard/products/${product.id}/edit`}>
                      <Edit3 aria-hidden="true" className="size-4" />
                      Редагувати
                    </Link>
                  </Button>
                  <form
                    action={toggleAction.bind(
                      null,
                      product.id,
                      !product.isActive,
                    )}
                  >
                    <Button size="sm" type="submit" variant="outline">
                      {product.isActive ? (
                        <PowerOff aria-hidden="true" className="size-4" />
                      ) : (
                        <Power aria-hidden="true" className="size-4" />
                      )}
                      {product.isActive ? "Вимкнути" : "Увімкнути"}
                    </Button>
                  </form>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
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

function formatPrice(priceMinor: number, currency: string): string {
  return new Intl.NumberFormat("uk-UA", {
    currency,
    style: "currency",
  }).format(priceMinor / 100);
}
