import { NextResponse } from "next/server";
import { searchCarrierWarehousesUseCase } from "@/modules/shipping/application/search-carrier-directory";
import type { ShipmentCarrier } from "@/modules/shipping/application/shipment-repository";
import { getCarrierDirectoryCacheRepository } from "@/modules/shipping/infrastructure/carrier-directory-cache-repository-factory";
import { getShippingCarrier } from "@/modules/shipping/infrastructure/shipping-carrier-factory";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const carrier = url.searchParams.get("carrier");
  const cityId = url.searchParams.get("cityId") ?? "";
  const query = url.searchParams.get("query") ?? "";

  if (!isShipmentCarrier(carrier)) {
    return NextResponse.json(
      { message: "Службу доставки не підтримано" },
      { status: 400 },
    );
  }

  const warehouses = await searchCarrierWarehousesUseCase(
    {
      carrier,
      cityId,
      query,
    },
    {
      cacheRepository: getCarrierDirectoryCacheRepository(),
      shippingCarrier: getShippingCarrier(carrier),
    },
  );

  return NextResponse.json(
    { warehouses },
    {
      headers: {
        "cache-control": "no-store",
      },
    },
  );
}

function isShipmentCarrier(value: string | null): value is ShipmentCarrier {
  return value === "NOVA_POSHTA" || value === "UKRPOSHTA";
}
