import { Plus } from "lucide-react";
import Link from "next/link";
import { listOwnerOrderTagsUseCase, listOwnerOrdersUseCase } from "@/modules/orders/application/owner-order-read-model";
import type { OwnerOrderFilters } from "@/modules/orders/application/owner-order-read-model";
import { isOrderStatus } from "@/modules/orders/domain/status";
import { getCustomerRepository } from "@/modules/orders/infrastructure/customer-repository-factory";
import { getOrderRepository } from "@/modules/orders/infrastructure/order-repository-factory";
import { getOrderTagRepository } from "@/modules/orders/infrastructure/order-tag-repository-factory";
import { OwnerOrdersFilterForm } from "@/modules/orders/ui/owner-orders-filter-form";
import { OwnerOrdersTable } from "@/modules/orders/ui/owner-orders-table";
import type { PaymentProviderCode } from "@/modules/payments/application/payment-repository";
import { getPaymentRepository } from "@/modules/payments/infrastructure/payment-repository-factory";
import type { ShipmentCarrier } from "@/modules/shipping/application/shipment-repository";
import { getShipmentRepository } from "@/modules/shipping/infrastructure/shipment-repository-factory";
import { requireOwnerSession } from "@/modules/users/ui/require-owner-session";
import { Button } from "@/shared/ui/button";

type OrdersPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default async function OrdersPage({ searchParams }: OrdersPageProps) {
  const owner = await requireOwnerSession();
  const params = (await searchParams) ?? {};
  const filters = filtersFromSearchParams(params);
  const orderTagRepository = getOrderTagRepository();
  const [orders, tags] = await Promise.all([
    listOwnerOrdersUseCase(
      {
        filters,
        ownerId: owner.id,
      },
      {
        customerRepository: getCustomerRepository(),
        orderRepository: getOrderRepository(),
        orderTagRepository,
        paymentRepository: getPaymentRepository(),
        shipmentRepository: getShipmentRepository(),
      },
    ),
    listOwnerOrderTagsUseCase(
      { ownerId: owner.id },
      { orderTagRepository },
    ),
  ]);

  return (
    <div className="grid gap-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-3xl font-semibold">
            Замовлення
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Переглядайте замовлення, фільтруйте їх і керуйте виконанням.
          </p>
        </div>
        <Button asChild>
          <Link href="/dashboard/orders/new">
            <Plus aria-hidden="true" className="size-4" />
            Створити замовлення
          </Link>
        </Button>
      </div>

      <OwnerOrdersFilterForm filters={filters} tagOptions={tags} />
      <OwnerOrdersTable orders={orders} />
    </div>
  );
}

function filtersFromSearchParams(
  params: Record<string, string | string[] | undefined>,
): OwnerOrderFilters {
  const status = firstParam(params.status);
  const deliveryCarrier = firstParam(params.deliveryCarrier);
  const paymentMethod = firstParam(params.paymentMethod);

  return {
    dateFrom: startOfDay(firstParam(params.dateFrom)),
    dateTo: endOfDay(firstParam(params.dateTo)),
    deliveryCarrier: isShipmentCarrier(deliveryCarrier) ? deliveryCarrier : null,
    paymentMethod: isPaymentProvider(paymentMethod) ? paymentMethod : null,
    search: firstParam(params.search),
    status: status && isOrderStatus(status) ? status : null,
    tagId: firstParam(params.tagId),
  };
}

function firstParam(value: string | string[] | undefined): string | null {
  if (Array.isArray(value)) {
    return value[0] ?? null;
  }

  return value ?? null;
}

function startOfDay(value: string | null): Date | null {
  return value ? new Date(`${value}T00:00:00.000Z`) : null;
}

function endOfDay(value: string | null): Date | null {
  return value ? new Date(`${value}T23:59:59.999Z`) : null;
}

function isShipmentCarrier(value: string | null): value is ShipmentCarrier {
  return value === "NOVA_POSHTA" || value === "UKRPOSHTA";
}

function isPaymentProvider(value: string | null): value is PaymentProviderCode {
  return value === "MONOBANK" || value === "CASH_ON_DELIVERY";
}
