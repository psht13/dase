import { createProductAction } from "@/modules/catalog/ui/product-actions";
import { ProductForm } from "@/modules/catalog/ui/product-form";

export default function NewProductPage() {
  return (
    <div className="mx-auto grid max-w-3xl gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-normal">
          Новий товар
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Заповніть дані товару та додайте посилання на зображення.
        </p>
      </div>

      <ProductForm
        action={createProductAction}
        cancelHref="/dashboard/products"
        submitLabel="Створити товар"
      />
    </div>
  );
}
