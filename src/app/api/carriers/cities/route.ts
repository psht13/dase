import { NextResponse } from "next/server";
import { searchCarrierCitiesUseCase } from "@/modules/shipping/application/search-carrier-directory";
import {
  isKnownShippingCarrier,
  isShippingCarrierSearchEnabled,
} from "@/modules/shipping/application/shipping-carrier-registry";
import { getCarrierDirectoryCacheRepository } from "@/modules/shipping/infrastructure/carrier-directory-cache-repository-factory";
import { ShippingCarrierApiError } from "@/modules/shipping/infrastructure/shipping-carrier-api-error";
import { getShippingCarrier } from "@/modules/shipping/infrastructure/shipping-carrier-factory";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const carrier = url.searchParams.get("carrier");
  const query = url.searchParams.get("query") ?? "";

  if (!isKnownShippingCarrier(carrier)) {
    return NextResponse.json(
      { message: "Службу доставки не підтримано" },
      { status: 400 },
    );
  }

  if (!isShippingCarrierSearchEnabled(carrier)) {
    return NextResponse.json(
      { message: "Службу доставки тимчасово вимкнено" },
      { status: 400 },
    );
  }

  let cities;

  try {
    cities = await searchCarrierCitiesUseCase(
      {
        carrier,
        query,
      },
      {
        cacheRepository: getCarrierDirectoryCacheRepository(),
        shippingCarrier: getShippingCarrier(carrier),
      },
    );
  } catch (error) {
    if (error instanceof ShippingCarrierApiError) {
      return NextResponse.json(
        { message: "Не вдалося завантажити міста. Спробуйте ще раз." },
        { status: 502 },
      );
    }

    throw error;
  }

  return NextResponse.json(
    { cities },
    {
      headers: {
        "cache-control": "no-store",
      },
    },
  );
}
