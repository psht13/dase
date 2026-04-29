import { Search } from "lucide-react";
import Link from "next/link";
import type { OrderTagRecord } from "@/modules/orders/application/order-tag-repository";
import {
  orderStatusLabels,
  paymentProviderLabels,
  shipmentCarrierLabels,
} from "@/modules/orders/application/order-labels";
import type { OwnerOrderFilters } from "@/modules/orders/application/owner-order-read-model";
import { orderStatuses } from "@/modules/orders/domain/status";
import { Button } from "@/shared/ui/button";

type OwnerOrdersFilterFormProps = {
  filters: OwnerOrderFilters;
  tagOptions: OrderTagRecord[];
};

export function OwnerOrdersFilterForm({
  filters,
  tagOptions,
}: OwnerOrdersFilterFormProps) {
  return (
    <form className="grid gap-4 rounded-md border p-4" method="get">
      <div className="grid gap-4 md:grid-cols-3">
        <label className="grid gap-2 text-sm font-medium">
          Статус
          <select
            className="h-10 rounded-md border border-input bg-background px-3 text-sm"
            defaultValue={filters.status ?? ""}
            name="status"
          >
            <option value="">Усі статуси</option>
            {orderStatuses.map((status) => (
              <option key={status} value={status}>
                {orderStatusLabels[status]}
              </option>
            ))}
          </select>
        </label>

        <label className="grid gap-2 text-sm font-medium">
          Служба доставки
          <select
            className="h-10 rounded-md border border-input bg-background px-3 text-sm"
            defaultValue={filters.deliveryCarrier ?? ""}
            name="deliveryCarrier"
          >
            <option value="">Усі служби доставки</option>
            <option value="NOVA_POSHTA">
              {shipmentCarrierLabels.NOVA_POSHTA}
            </option>
            <option value="UKRPOSHTA">{shipmentCarrierLabels.UKRPOSHTA}</option>
          </select>
        </label>

        <label className="grid gap-2 text-sm font-medium">
          Спосіб оплати
          <select
            className="h-10 rounded-md border border-input bg-background px-3 text-sm"
            defaultValue={filters.paymentMethod ?? ""}
            name="paymentMethod"
          >
            <option value="">Усі способи оплати</option>
            <option value="MONOBANK">{paymentProviderLabels.MONOBANK}</option>
            <option value="CASH_ON_DELIVERY">
              {paymentProviderLabels.CASH_ON_DELIVERY}
            </option>
          </select>
        </label>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <label className="grid gap-2 text-sm font-medium">
          Тег
          <select
            className="h-10 rounded-md border border-input bg-background px-3 text-sm"
            defaultValue={filters.tagId ?? ""}
            name="tagId"
          >
            <option value="">Усі теги</option>
            {tagOptions.map((tag) => (
              <option key={tag.id} value={tag.id}>
                {tag.name}
              </option>
            ))}
          </select>
        </label>

        <label className="grid gap-2 text-sm font-medium">
          Дата від
          <input
            className="h-10 rounded-md border border-input bg-background px-3 text-sm"
            defaultValue={dateInputValue(filters.dateFrom)}
            name="dateFrom"
            type="date"
          />
        </label>

        <label className="grid gap-2 text-sm font-medium">
          Дата до
          <input
            className="h-10 rounded-md border border-input bg-background px-3 text-sm"
            defaultValue={dateInputValue(filters.dateTo)}
            name="dateTo"
            type="date"
          />
        </label>

        <label className="grid gap-2 text-sm font-medium">
          Пошук
          <span className="relative">
            <Search className="pointer-events-none absolute left-3 top-3 size-4 text-muted-foreground" />
            <input
              className="h-10 w-full rounded-md border border-input bg-background px-9 text-sm"
              defaultValue={filters.search ?? ""}
              name="search"
              placeholder="Телефон або ТТН"
            />
          </span>
        </label>
      </div>

      <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
        <Button asChild variant="outline">
          <Link href="/dashboard/orders">Скинути</Link>
        </Button>
        <Button type="submit">Застосувати фільтри</Button>
      </div>
    </form>
  );
}

function dateInputValue(date: Date | null | undefined): string {
  if (!date) {
    return "";
  }

  return date.toISOString().slice(0, 10);
}
