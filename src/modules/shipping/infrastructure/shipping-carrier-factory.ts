import type {
  ShippingCarrier,
} from "@/modules/shipping/application/shipping-carrier";
import type { ShipmentCarrier } from "@/modules/shipping/application/shipment-repository";
import {
  createMissingShipmentConfigMessage,
  type ShipmentCreationConfigValidation,
  type ShippingLabelCreationMode,
} from "@/modules/shipping/application/shipping-label-creation-mode";
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

  const env = getServerEnv();

  if (isFixtureCarrierEnabled(env)) {
    return new FixtureShippingCarrier(carrier);
  }

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

export function getShippingLabelCreationMode(): ShippingLabelCreationMode {
  return getServerEnv().SHIPPING_LABEL_CREATION_MODE;
}

export function validateLiveShipmentCreationConfig(
  carrier: ShipmentCarrier,
): ShipmentCreationConfigValidation {
  if (carrier !== "NOVA_POSHTA") {
    return {
      missingKeys: [],
      ok: false,
      reason:
        "Створення відправлення для обраної служби доставки зараз недоступне.",
    };
  }

  const missingKeys = getMissingNovaPostLiveShipmentConfigKeys(getServerEnv());

  if (missingKeys.length > 0) {
    return {
      missingKeys,
      ok: false,
      reason: createMissingShipmentConfigMessage(carrier, missingKeys),
    };
  }

  return { ok: true };
}

export function getMissingNovaPostLiveShipmentConfigKeys(
  env: ServerEnv,
): string[] {
  const missingKeys: string[] = [];

  if (!env.NOVA_POST_API_KEY && !env.NOVA_POSHTA_API_KEY) {
    missingKeys.push("NOVA_POST_API_KEY");
  }

  const requiredKeys = [
    "NOVA_POST_SENDER_COUNTRY_CODE",
    "NOVA_POST_SENDER_DIVISION_ID",
    "NOVA_POST_SENDER_NAME",
    "NOVA_POST_SENDER_PHONE",
    "NOVA_POST_PAYER_TYPE",
    "NOVA_POST_DEFAULT_WIDTH_MM",
    "NOVA_POST_DEFAULT_LENGTH_MM",
    "NOVA_POST_DEFAULT_HEIGHT_MM",
    "NOVA_POST_DEFAULT_ACTUAL_WEIGHT_GRAMS",
    "NOVA_POST_DEFAULT_VOLUMETRIC_WEIGHT_GRAMS",
  ] as const;

  for (const key of requiredKeys) {
    if (!env[key]) {
      missingKeys.push(key);
    }
  }

  if (
    env.NOVA_POST_PAYER_TYPE === "ThirdPerson" &&
    !env.NOVA_POST_PAYER_CONTRACT_NUMBER
  ) {
    missingKeys.push("NOVA_POST_PAYER_CONTRACT_NUMBER");
  }

  return missingKeys;
}

function isFixtureCarrierEnabled(env: ServerEnv): boolean {
  return (
    env.SHIPPING_LABEL_CREATION_MODE === "mock" ||
    (env.NODE_ENV !== "production" &&
      (process.env.PLAYWRIGHT_E2E === "1" ||
        process.env.USE_MOCK_SHIPPING_CARRIERS === "1"))
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
