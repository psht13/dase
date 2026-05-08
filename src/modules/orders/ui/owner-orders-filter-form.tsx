"use client";

import { ChevronDown, Search, SlidersHorizontal, XCircle } from "lucide-react";
import Link from "next/link";
import { useId, useState } from "react";
import type { OrderTagRecord } from "@/modules/orders/application/order-tag-repository";
import {
  orderStatusLabels,
  paymentProviderLabels,
  shipmentCarrierLabels,
} from "@/modules/orders/application/order-labels";
import type { OwnerOrderFilters } from "@/modules/orders/application/owner-order-read-model";
import { orderStatuses } from "@/modules/orders/domain/status";
import type { ShippingCarrierRegistryEntry } from "@/modules/shipping/application/shipping-carrier-registry";
import { Button } from "@/shared/ui/button";
import { cn } from "@/shared/utils/cn";

type OwnerOrdersFilterFormProps = {
  deliveryCarrierOptions: ShippingCarrierRegistryEntry[];
  filters: OwnerOrderFilters;
  tagOptions: OrderTagRecord[];
};

export function OwnerOrdersFilterForm({
  deliveryCarrierOptions,
  filters,
  tagOptions,
}: OwnerOrdersFilterFormProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const panelId = useId();
  const activeFilters = buildActiveFilterSummary({
    deliveryCarrierOptions,
    filters,
    tagOptions,
  });
  const hasActiveFilters = activeFilters.length > 0;

  return (
    <section
      aria-labelledby={`${panelId}-heading`}
      className="min-w-0 rounded-md border bg-card"
    >
      <div className="grid min-w-0 gap-4 p-4">
        <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <h2
              className="text-base font-semibold"
              id={`${panelId}-heading`}
            >
              Фільтри замовлень
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Звузьте список за статусом, оплатою, доставкою, тегом або пошуком.
            </p>
          </div>
          <Button
            aria-controls={`${panelId}-content`}
            aria-expanded={isExpanded}
            className="w-full sm:w-auto lg:hidden"
            onClick={() => setIsExpanded((current) => !current)}
            type="button"
            variant="outline"
          >
            <SlidersHorizontal aria-hidden="true" className="size-4" />
            {isExpanded ? "Сховати фільтри" : "Показати фільтри"}
            <ChevronDown
              aria-hidden="true"
              className={cn(
                "size-4 transition-transform",
                isExpanded ? "rotate-180" : null,
              )}
            />
          </Button>
        </div>

        <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div
            aria-label="Активні фільтри"
            className="flex min-w-0 flex-wrap gap-2"
          >
            {hasActiveFilters ? (
              activeFilters.map((filter) => (
                <span
                  className="max-w-full break-words rounded-md border bg-background px-2 py-1 text-xs font-medium text-foreground"
                  key={filter.id}
                >
                  {filter.label}
                </span>
              ))
            ) : (
              <span className="rounded-md border border-dashed px-2 py-1 text-xs font-medium text-muted-foreground">
                Фільтри не застосовано
              </span>
            )}
          </div>
          {hasActiveFilters ? (
            <Button asChild size="sm" variant="outline">
              <Link href="/dashboard/orders">
                <XCircle aria-hidden="true" className="size-4" />
                Скинути фільтри
              </Link>
            </Button>
          ) : null}
        </div>
      </div>

      <form
        className={cn(
          "min-w-0 gap-4 border-t p-4",
          isExpanded ? "grid" : "hidden lg:grid",
        )}
        id={`${panelId}-content`}
        method="get"
      >
      <div className="grid min-w-0 gap-4 md:grid-cols-3">
        <label className="grid gap-2 text-sm font-medium">
          Статус
          <select
            autoComplete="off"
            className="h-11 rounded-md border border-input bg-background px-3 text-sm"
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
            autoComplete="off"
            className="h-11 rounded-md border border-input bg-background px-3 text-sm"
            defaultValue={filters.deliveryCarrier ?? ""}
            name="deliveryCarrier"
          >
            <option value="">Усі служби доставки</option>
            {deliveryCarrierOptions.map((carrier) => (
              <option key={carrier.code} value={carrier.code}>
                {shipmentCarrierLabels[carrier.code]}
              </option>
            ))}
          </select>
        </label>

        <label className="grid gap-2 text-sm font-medium">
          Спосіб оплати
          <select
            autoComplete="off"
            className="h-11 rounded-md border border-input bg-background px-3 text-sm"
            defaultValue={filters.paymentMethod ?? ""}
            name="paymentMethod"
          >
            <option value="">Усі способи оплати</option>
            <option value="MANUAL_CARD_TRANSFER">
              {paymentProviderLabels.MANUAL_CARD_TRANSFER}
            </option>
            <option value="MONOBANK">{paymentProviderLabels.MONOBANK}</option>
            <option value="CASH_ON_DELIVERY">
              {paymentProviderLabels.CASH_ON_DELIVERY}
            </option>
          </select>
        </label>
      </div>

      <div className="grid min-w-0 gap-4 md:grid-cols-4">
        <label className="grid gap-2 text-sm font-medium">
          Тег
          <select
            autoComplete="off"
            className="h-11 rounded-md border border-input bg-background px-3 text-sm"
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
            autoComplete="off"
            className="h-11 rounded-md border border-input bg-background px-3 text-sm"
            defaultValue={dateInputValue(filters.dateFrom)}
            name="dateFrom"
            type="date"
          />
        </label>

        <label className="grid gap-2 text-sm font-medium">
          Дата до
          <input
            autoComplete="off"
            className="h-11 rounded-md border border-input bg-background px-3 text-sm"
            defaultValue={dateInputValue(filters.dateTo)}
            name="dateTo"
            type="date"
          />
        </label>

        <label className="grid gap-2 text-sm font-medium">
          Пошук
          <span className="relative">
            <Search
              aria-hidden="true"
              className="pointer-events-none absolute left-3 top-3 size-4 text-muted-foreground"
            />
            <input
              autoComplete="off"
              className="h-11 w-full rounded-md border border-input bg-background px-9 text-sm"
              defaultValue={filters.search ?? ""}
              name="search"
              placeholder="Телефон, Instagram або ТТН"
            />
          </span>
        </label>
      </div>

      <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
        <Button asChild variant="outline">
          <Link href="/dashboard/orders">Очистити</Link>
        </Button>
        <Button type="submit">Застосувати фільтри</Button>
      </div>
      </form>
    </section>
  );
}

type ActiveFilterSummaryInput = {
  deliveryCarrierOptions: ShippingCarrierRegistryEntry[];
  filters: OwnerOrderFilters;
  tagOptions: OrderTagRecord[];
};

function buildActiveFilterSummary({
  deliveryCarrierOptions,
  filters,
  tagOptions,
}: ActiveFilterSummaryInput): Array<{ id: string; label: string }> {
  const summary: Array<{ id: string; label: string }> = [];

  if (filters.status) {
    summary.push({
      id: "status",
      label: `Статус: ${orderStatusLabels[filters.status]}`,
    });
  }

  if (filters.deliveryCarrier) {
    summary.push({
      id: "deliveryCarrier",
      label: `Доставка: ${shipmentCarrierLabels[filters.deliveryCarrier]}`,
    });
  }

  if (filters.paymentMethod) {
    summary.push({
      id: "paymentMethod",
      label: `Оплата: ${paymentProviderLabels[filters.paymentMethod]}`,
    });
  }

  if (filters.tagId) {
    const tagName =
      tagOptions.find((tag) => tag.id === filters.tagId)?.name ??
      "вибраний тег";

    summary.push({
      id: "tagId",
      label: `Тег: ${tagName}`,
    });
  }

  if (filters.dateFrom) {
    summary.push({
      id: "dateFrom",
      label: `Від: ${dateInputValue(filters.dateFrom)}`,
    });
  }

  if (filters.dateTo) {
    summary.push({
      id: "dateTo",
      label: `До: ${dateInputValue(filters.dateTo)}`,
    });
  }

  if (filters.search?.trim()) {
    summary.push({
      id: "search",
      label: `Пошук: ${filters.search.trim()}`,
    });
  }

  return summary.filter((filter) =>
    filter.id === "deliveryCarrier"
      ? deliveryCarrierOptions.some(
          (carrier) => carrier.code === filters.deliveryCarrier,
        )
      : true,
  );
}

function dateInputValue(date: Date | null | undefined): string {
  if (!date) {
    return "";
  }

  return date.toISOString().slice(0, 10);
}
