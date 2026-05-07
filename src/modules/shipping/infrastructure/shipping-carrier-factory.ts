import type {
  ShippingCarrier,
} from "@/modules/shipping/application/shipping-carrier";
import type { ShipmentCarrier } from "@/modules/shipping/application/shipment-repository";
import {
  isShipmentCreationEnabled,
  isShippingCarrierSearchEnabled,
} from "@/modules/shipping/application/shipping-carrier-registry";
import { FixtureShippingCarrier } from "@/modules/shipping/infrastructure/fixture-shipping-carrier";
import {
  NovaPostShippingCarrier,
  type NovaPostPayerType,
  type NovaPostSenderConfig,
  type NovaPostShipmentDefaults,
} from "@/modules/shipping/infrastructure/nova-post-shipping-carrier";
import { getServerEnv, type ServerEnv } from "@/shared/config/env";

export function getShippingCarrier(carrier: ShipmentCarrier): ShippingCarrier {
  if (
    !isShippingCarrierSearchEnabled(carrier) &&
    !isShipmentCreationEnabled(carrier)
  ) {
    throw new Error("Shipping carrier is disabled");
  }

  if (isMockCarrierEnabled()) {
    return new FixtureShippingCarrier(carrier);
  }

  const env = getServerEnv();

  if (carrier === "NOVA_POSHTA") {
    const apiKey = env.NOVA_POST_API_KEY ?? env.NOVA_POSHTA_API_KEY;

    if (!apiKey) {
      throw new Error("NOVA_POST_API_KEY is required for Nova Post");
    }

    return new NovaPostShippingCarrier({
      apiKey,
      authUrl: env.NOVA_POST_AUTH_URL,
      baseUrl: env.NOVA_POST_API_URL ?? env.NOVA_POSHTA_API_URL,
      sender: getNovaPostSenderConfig(env),
      shipmentDefaults: getNovaPostShipmentDefaults(env),
    });
  }

  throw new Error("Shipping carrier is not configured");
}

function isMockCarrierEnabled(): boolean {
  return (
    process.env.NODE_ENV !== "production" &&
    (process.env.PLAYWRIGHT_E2E === "1" ||
      process.env.USE_MOCK_SHIPPING_CARRIERS === "1")
  );
}

function getNovaPostSenderConfig(
  env: ServerEnv,
): NovaPostSenderConfig | undefined {
  if (
    !env.NOVA_POST_SENDER_COUNTRY_CODE &&
    !env.NOVA_POST_SENDER_DIVISION_ID &&
    !env.NOVA_POST_SENDER_NAME &&
    !env.NOVA_POST_SENDER_PHONE
  ) {
    return undefined;
  }

  return {
    companyName: env.NOVA_POST_SENDER_COMPANY_NAME,
    companyTin: env.NOVA_POST_SENDER_COMPANY_TIN,
    countryCode: env.NOVA_POST_SENDER_COUNTRY_CODE ?? "",
    divisionId: env.NOVA_POST_SENDER_DIVISION_ID ?? "",
    email: env.NOVA_POST_SENDER_EMAIL,
    name: env.NOVA_POST_SENDER_NAME ?? "",
    payerContractNumber: env.NOVA_POST_PAYER_CONTRACT_NUMBER,
    payerType: env.NOVA_POST_PAYER_TYPE as NovaPostPayerType | undefined,
    phone: env.NOVA_POST_SENDER_PHONE ?? "",
  };
}

function getNovaPostShipmentDefaults(
  env: ServerEnv,
): Partial<NovaPostShipmentDefaults> {
  return {
    actualWeightGrams: env.NOVA_POST_DEFAULT_ACTUAL_WEIGHT_GRAMS,
    heightMm: env.NOVA_POST_DEFAULT_HEIGHT_MM,
    lengthMm: env.NOVA_POST_DEFAULT_LENGTH_MM,
    volumetricWeightGrams: env.NOVA_POST_DEFAULT_VOLUMETRIC_WEIGHT_GRAMS,
    widthMm: env.NOVA_POST_DEFAULT_WIDTH_MM,
  };
}
