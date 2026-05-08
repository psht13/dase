import { createProductAction } from "@/modules/catalog/ui/product-actions";
import { ProductForm } from "@/modules/catalog/ui/product-form";
import { PageHeader } from "@/shared/ui/page-layout";

export default function NewProductPage() {
  return (
    <div className="mx-auto grid w-full max-w-5xl min-w-0 gap-6">
      <PageHeader
        description="Заповніть дані товару та додайте посилання на зображення."
        title="Новий товар"
        titleClassName="sm:text-3xl"
      />

      <ProductForm
        action={createProductAction}
        cancelHref="/dashboard/products"
        submitLabel="Створити товар"
      />
    </div>
  );
}
