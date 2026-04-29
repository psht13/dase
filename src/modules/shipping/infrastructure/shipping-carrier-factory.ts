import type {
  ShippingCarrier,
} from "@/modules/shipping/application/shipping-carrier";
import type { ShipmentCarrier } from "@/modules/shipping/application/shipment-repository";
import { FixtureShippingCarrier } from "@/modules/shipping/infrastructure/fixture-shipping-carrier";
import { NovaPoshtaShippingCarrier } from "@/modules/shipping/infrastructure/nova-poshta-shipping-carrier";
import { UkrposhtaShippingCarrier } from "@/modules/shipping/infrastructure/ukrposhta-shipping-carrier";
import { getServerEnv } from "@/shared/config/env";

export function getShippingCarrier(carrier: ShipmentCarrier): ShippingCarrier {
  if (isMockCarrierEnabled()) {
    return new FixtureShippingCarrier(carrier);
  }

  const env = getServerEnv();

  if (carrier === "NOVA_POSHTA") {
    if (!env.NOVA_POSHTA_API_KEY) {
      throw new Error("NOVA_POSHTA_API_KEY is required for Nova Poshta");
    }

    return new NovaPoshtaShippingCarrier({
      apiKey: env.NOVA_POSHTA_API_KEY,
      baseUrl: env.NOVA_POSHTA_API_URL,
    });
  }

  if (!env.UKRPOSHTA_BEARER_TOKEN) {
    throw new Error("UKRPOSHTA_BEARER_TOKEN is required for Ukrposhta");
  }

  return new UkrposhtaShippingCarrier({
    baseUrl: env.UKRPOSHTA_API_URL,
    bearerToken: env.UKRPOSHTA_BEARER_TOKEN,
    counterpartyToken: env.UKRPOSHTA_COUNTERPARTY_TOKEN,
  });
}

function isMockCarrierEnabled(): boolean {
  return (
    process.env.NODE_ENV !== "production" &&
    (process.env.PLAYWRIGHT_E2E === "1" ||
      process.env.USE_MOCK_SHIPPING_CARRIERS === "1")
  );
}
