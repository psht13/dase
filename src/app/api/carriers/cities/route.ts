import { NextResponse } from "next/server";
import { isValidPublicOrderToken } from "@/modules/orders/application/public-order-token";
import { getOrderRepository } from "@/modules/orders/infrastructure/order-repository-factory";
import {
  publicDeliveryUnavailableMessage,
  ShippingCarrierSettingsUnavailableError,
} from "@/modules/shipping/application/shipping-carrier";
import { searchCarrierCitiesUseCase } from "@/modules/shipping/application/search-carrier-directory";
import {
  isKnownShippingCarrier,
  isShippingCarrierSearchEnabled,
} from "@/modules/shipping/application/shipping-carrier-registry";
import { getCarrierDirectoryCacheRepository } from "@/modules/shipping/infrastructure/carrier-directory-cache-repository-factory";
import { ShippingCarrierApiError } from "@/modules/shipping/infrastructure/shipping-carrier-api-error";
import { resolveShippingCarrierForOwner } from "@/modules/shipping/infrastructure/shipping-carrier-factory";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const carrier = url.searchParams.get("carrier");
  const query = url.searchParams.get("query") ?? "";
  const publicToken = url.searchParams.get("token") ?? "";

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

  const ownerId = await resolveOwnerIdFromPublicToken(publicToken);

  if (!ownerId) {
    return unavailableResponse();
  }

  let cities;

  try {
    const resolvedCarrier = await resolveShippingCarrierForOwner(carrier, {
      ownerId,
    });

    cities = await searchCarrierCitiesUseCase(
      {
        carrier,
        query,
      },
      {
        cacheScopeKey: resolvedCarrier.cacheScopeKey,
        cacheRepository: getCarrierDirectoryCacheRepository(),
        shippingCarrier: resolvedCarrier.shippingCarrier,
      },
    );
  } catch (error) {
    if (error instanceof ShippingCarrierSettingsUnavailableError) {
      return unavailableResponse();
    }

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

async function resolveOwnerIdFromPublicToken(
  publicToken: string,
): Promise<string | null> {
  if (!isValidPublicOrderToken(publicToken)) {
    return null;
  }

  const order = await getOrderRepository().findByPublicToken(publicToken);

  if (
    !order ||
    order.status !== "SENT_TO_CUSTOMER" ||
    order.publicTokenExpiresAt.getTime() <= Date.now()
  ) {
    return null;
  }

  return order.ownerId;
}

function unavailableResponse() {
  return NextResponse.json(
    { message: publicDeliveryUnavailableMessage },
    { status: 503 },
  );
}
