"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { CheckCircle2, Search } from "lucide-react";
import { useRouter } from "next/navigation";
import type { ReactNode } from "react";
import { useEffect, useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import {
  deliveryFormSchema,
  type DeliveryFormValues,
} from "@/modules/orders/application/delivery-form-validation";
import type { DeliveryActionResult } from "@/modules/orders/ui/delivery-actions";
import {
  deliveryFormValuesToFormData,
  emptyDeliveryFormValues,
} from "@/modules/orders/ui/delivery-form-data";
import type {
  ShippingCity,
  ShippingWarehouse,
} from "@/modules/shipping/application/shipping-carrier";
import { Button } from "@/shared/ui/button";

type DeliveryFormProps = {
  action: (formData: FormData) => Promise<DeliveryActionResult>;
};

type LookupStatus = "idle" | "loading" | "loaded" | "error";

export function DeliveryForm({ action }: DeliveryFormProps) {
  const router = useRouter();
  const [serverMessage, setServerMessage] = useState<string | null>(null);
  const [isConfirmed, setIsConfirmed] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [cityQuery, setCityQuery] = useState("");
  const [warehouseQuery, setWarehouseQuery] = useState("");
  const [cities, setCities] = useState<ShippingCity[]>([]);
  const [warehouses, setWarehouses] = useState<ShippingWarehouse[]>([]);
  const [cityStatus, setCityStatus] = useState<LookupStatus>("idle");
  const [warehouseStatus, setWarehouseStatus] = useState<LookupStatus>("idle");
  const form = useForm<DeliveryFormValues>({
    defaultValues: emptyDeliveryFormValues,
    resolver: zodResolver(deliveryFormSchema),
  });
  const carrier = form.watch("carrier");
  const selectedCityId = form.watch("cityId");
  const carrierField = form.register("carrier");

  useEffect(() => {
    const query = cityQuery.trim();

    if (query.length < 2) {
      setCities([]);
      setCityStatus("idle");
      return;
    }

    const controller = new AbortController();
    setCityStatus("loading");

    void fetch(
      `/api/carriers/cities?carrier=${encodeURIComponent(carrier)}&query=${encodeURIComponent(query)}`,
      { signal: controller.signal },
    )
      .then(async (response) => {
        if (!response.ok) {
          throw new Error("Failed to load cities");
        }

        return (await response.json()) as { cities: ShippingCity[] };
      })
      .then((data) => {
        setCities(data.cities);
        setCityStatus("loaded");
      })
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === "AbortError") {
          return;
        }

        setCities([]);
        setCityStatus("error");
      });

    return () => controller.abort();
  }, [carrier, cityQuery]);

  useEffect(() => {
    if (!selectedCityId) {
      setWarehouses([]);
      setWarehouseStatus("idle");
      return;
    }

    const controller = new AbortController();
    setWarehouseStatus("loading");

    void fetch(
      `/api/carriers/warehouses?carrier=${encodeURIComponent(carrier)}&cityId=${encodeURIComponent(selectedCityId)}&query=${encodeURIComponent(warehouseQuery.trim())}`,
      { signal: controller.signal },
    )
      .then(async (response) => {
        if (!response.ok) {
          throw new Error("Failed to load warehouses");
        }

        return (await response.json()) as { warehouses: ShippingWarehouse[] };
      })
      .then((data) => {
        setWarehouses(data.warehouses);
        setWarehouseStatus("loaded");
      })
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === "AbortError") {
          return;
        }

        setWarehouses([]);
        setWarehouseStatus("error");
      });

    return () => controller.abort();
  }, [carrier, selectedCityId, warehouseQuery]);

  function onSubmit(values: DeliveryFormValues) {
    setServerMessage(null);

    startTransition(() => {
      void action(deliveryFormValuesToFormData(values)).then((result) => {
        setServerMessage(result.message);

        if (result.ok) {
          setIsConfirmed(true);
          router.refresh();

          if (result.paymentRedirectUrl) {
            window.location.assign(result.paymentRedirectUrl);
          }

          return;
        }

        for (const [field, messages] of Object.entries(
          result.fieldErrors ?? {},
        )) {
          form.setError(field as keyof DeliveryFormValues, {
            message: messages[0],
            type: "server",
          });
        }
      });
    });
  }

  function selectCity(city: ShippingCity) {
    form.setValue("cityId", city.id, { shouldValidate: true });
    form.setValue("cityName", city.name, { shouldValidate: true });
    form.setValue("warehouseAddress", "");
    form.setValue("warehouseId", "", { shouldValidate: true });
    form.setValue("warehouseName", "");
    setCityQuery(city.name);
    setCities([]);
    setWarehouseQuery("");
    setWarehouses([]);
  }

  function selectWarehouse(warehouse: ShippingWarehouse) {
    form.setValue("warehouseAddress", warehouse.address ?? "");
    form.setValue("warehouseId", warehouse.id, { shouldValidate: true });
    form.setValue("warehouseName", warehouse.name, { shouldValidate: true });
    setWarehouseQuery(warehouse.name);
    setWarehouses([]);
  }

  function resetDeliverySelection() {
    form.setValue("cityId", "");
    form.setValue("cityName", "");
    form.setValue("warehouseAddress", "");
    form.setValue("warehouseId", "");
    form.setValue("warehouseName", "");
    setCityQuery("");
    setWarehouseQuery("");
    setCities([]);
    setWarehouses([]);
  }

  return (
    <form
      className="grid gap-6"
      noValidate
      onSubmit={form.handleSubmit(onSubmit)}
    >
      {serverMessage ? (
        <p
          className={
            isConfirmed
              ? "rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-950"
              : "rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive"
          }
          role={isConfirmed ? "status" : "alert"}
        >
          {serverMessage}
        </p>
      ) : null}

      <section className="grid gap-4 rounded-md border bg-card p-4 text-card-foreground">
        <div className="grid gap-2">
          <label className="text-sm font-medium" htmlFor="delivery-full-name">
            Повне ім’я
          </label>
          <input
            className="h-10 rounded-md border border-input bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
            id="delivery-full-name"
            placeholder="Ім’я та прізвище"
            {...form.register("fullName")}
          />
          <FieldError message={form.formState.errors.fullName?.message} />
        </div>

        <div className="grid gap-2">
          <label className="text-sm font-medium" htmlFor="delivery-phone">
            Телефон
          </label>
          <input
            className="h-10 rounded-md border border-input bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
            id="delivery-phone"
            inputMode="tel"
            placeholder="+380XXXXXXXXX"
            {...form.register("phone")}
          />
          <FieldError message={form.formState.errors.phone?.message} />
        </div>
      </section>

      <section className="grid gap-4 rounded-md border bg-card p-4 text-card-foreground">
        <div className="grid gap-2">
          <label className="text-sm font-medium" htmlFor="delivery-carrier">
            Служба доставки
          </label>
          <select
            className="h-10 rounded-md border border-input bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
            id="delivery-carrier"
            {...carrierField}
            onChange={(event) => {
              void carrierField.onChange(event);
              resetDeliverySelection();
            }}
          >
            <option value="NOVA_POSHTA">Нова Пошта</option>
            <option value="UKRPOSHTA">Укрпошта</option>
          </select>
          <FieldError message={form.formState.errors.carrier?.message} />
        </div>

        <input type="hidden" {...form.register("cityId")} />
        <input type="hidden" {...form.register("cityName")} />
        <input type="hidden" {...form.register("warehouseAddress")} />
        <input type="hidden" {...form.register("warehouseId")} />
        <input type="hidden" {...form.register("warehouseName")} />

        <div className="grid gap-2">
          <label className="text-sm font-medium" htmlFor="delivery-city">
            Місто або населений пункт
          </label>
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-3 size-4 text-muted-foreground" />
            <input
              className="h-10 w-full rounded-md border border-input bg-background px-9 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
              id="delivery-city"
              onChange={(event) => {
                form.setValue("cityId", "", { shouldValidate: true });
                form.setValue("cityName", "");
                setCityQuery(event.target.value);
              }}
              placeholder="Введіть назву міста"
              value={cityQuery}
            />
          </div>
          <FieldError message={form.formState.errors.cityId?.message} />
          <LookupResults
            emptyMessage="Місто не знайдено"
            errorMessage="Не вдалося завантажити міста"
            loadingMessage="Пошук міст..."
            onSelect={selectCity}
            renderItem={(city) => (
              <>
                <span>{city.name}</span>
                {city.region ? (
                  <span className="text-muted-foreground">{city.region}</span>
                ) : null}
              </>
            )}
            results={cities}
            status={cityStatus}
          />
        </div>

        <div className="grid gap-2">
          <label className="text-sm font-medium" htmlFor="delivery-warehouse">
            Відділення або поштове відділення
          </label>
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-3 size-4 text-muted-foreground" />
            <input
              className="h-10 w-full rounded-md border border-input bg-background px-9 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
              disabled={!selectedCityId}
              id="delivery-warehouse"
              onChange={(event) => {
                form.setValue("warehouseAddress", "");
                form.setValue("warehouseId", "", { shouldValidate: true });
                form.setValue("warehouseName", "");
                setWarehouseQuery(event.target.value);
              }}
              placeholder="Введіть номер або адресу"
              value={warehouseQuery}
            />
          </div>
          <FieldError message={form.formState.errors.warehouseId?.message} />
          <LookupResults
            emptyMessage="Відділення не знайдено"
            errorMessage="Не вдалося завантажити відділення"
            loadingMessage="Пошук відділень..."
            onSelect={selectWarehouse}
            renderItem={(warehouse) => (
              <>
                <span>{warehouse.name}</span>
                {warehouse.address ? (
                  <span className="text-muted-foreground">
                    {warehouse.address}
                  </span>
                ) : null}
              </>
            )}
            results={warehouses}
            status={warehouseStatus}
          />
        </div>
      </section>

      <section className="grid gap-4 rounded-md border bg-card p-4 text-card-foreground">
        <div className="grid gap-2">
          <label className="text-sm font-medium" htmlFor="delivery-payment">
            Спосіб оплати
          </label>
          <select
            className="h-10 rounded-md border border-input bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
            id="delivery-payment"
            {...form.register("paymentMethod")}
          >
            <option value="MONOBANK">MonoPay</option>
            <option value="CASH_ON_DELIVERY">Післяплата</option>
          </select>
          <FieldError message={form.formState.errors.paymentMethod?.message} />
        </div>
      </section>

      <Button disabled={isPending || isConfirmed} type="submit">
        <CheckCircle2 className="size-4" />
        {isPending ? "Підтвердження..." : "Підтвердити замовлення"}
      </Button>
    </form>
  );
}

function LookupResults<T>({
  emptyMessage,
  errorMessage,
  loadingMessage,
  onSelect,
  renderItem,
  results,
  status,
}: {
  emptyMessage: string;
  errorMessage: string;
  loadingMessage: string;
  onSelect: (result: T) => void;
  renderItem: (result: T) => ReactNode;
  results: T[];
  status: LookupStatus;
}) {
  if (status === "idle") {
    return null;
  }

  if (status === "loading") {
    return <p className="text-sm text-muted-foreground">{loadingMessage}</p>;
  }

  if (status === "error") {
    return <p className="text-sm text-destructive">{errorMessage}</p>;
  }

  if (!results.length) {
    return <p className="text-sm text-muted-foreground">{emptyMessage}</p>;
  }

  return (
    <div className="grid gap-2 rounded-md border bg-background p-2">
      {results.map((result, index) => (
        <button
          className="grid gap-1 rounded-md px-3 py-2 text-left text-sm hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          key={index}
          onClick={() => onSelect(result)}
          type="button"
        >
          {renderItem(result)}
        </button>
      ))}
    </div>
  );
}

function FieldError({ message }: { message?: string }) {
  if (!message) {
    return null;
  }

  return <p className="text-sm text-destructive">{message}</p>;
}
