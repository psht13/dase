import type { ApplicationEncryptionService } from "@/modules/shipping/application/application-encryption-service";
import type { OwnerShippingSettingsRecord } from "@/modules/shipping/application/owner-shipping-settings-repository";
import type {
  ShippingCarrier,
  ShippingCarrierResolutionContext,
} from "@/modules/shipping/application/shipping-carrier";
import { ShippingCarrierSettingsUnavailableError } from "@/modules/shipping/application/shipping-carrier";
import type { ShipmentCarrier } from "@/modules/shipping/application/shipment-repository";
import type { ShippingLabelCreationMode } from "@/modules/shipping/application/shipping-label-creation-mode";
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
import { getLazyApplicationEncryptionService } from "@/modules/shipping/infrastructure/application-encryption-service-factory";
import {
  getOwnerShippingSettingsRepository,
} from "@/modules/shipping/infrastructure/owner-shipping-settings-repository-factory";
import { getServerEnv, type ServerEnv } from "@/shared/config/env";

export type NovaPostRuntimeConfig = {
  apiKey: string;
  authUrl?: string;
  baseUrl: string;
  sender: NovaPostSenderConfig;
  shipmentDefaults: NovaPostShipmentDefaults;
};

export type ResolvedShippingCarrier = {
  cacheScopeKey: string;
  shippingCarrier: ShippingCarrier;
};

export async function getShippingCarrier(
  carrier: ShipmentCarrier,
  context: ShippingCarrierResolutionContext,
): Promise<ShippingCarrier> {
  return (await resolveShippingCarrierForOwner(carrier, context))
    .shippingCarrier;
}

export async function resolveShippingCarrierForOwner(
  carrier: ShipmentCarrier,
  context: ShippingCarrierResolutionContext,
): Promise<ResolvedShippingCarrier> {
  if (
    !isShippingCarrierSearchEnabled(carrier) &&
    !isShipmentCreationEnabled(carrier)
  ) {
    throw new Error("Shipping carrier is disabled");
  }

  if (carrier !== "NOVA_POSHTA") {
    throw new Error("Shipping carrier is not configured");
  }

  const settings =
    await getOwnerShippingSettingsRepository().findByOwnerId(context.ownerId);
  const runtimeConfig = await createNovaPostRuntimeConfigFromOwnerSettings(
    settings,
    getLazyApplicationEncryptionService(),
  );

  if (isFixtureCarrierEnabled(getServerEnv())) {
    return {
      cacheScopeKey: createNovaPostCacheScopeKey(settings),
      shippingCarrier: new FixtureShippingCarrier(carrier),
    };
  }

  return {
    cacheScopeKey: createNovaPostCacheScopeKey(settings),
    shippingCarrier: createNovaPostShippingCarrier(runtimeConfig),
  };
}

export async function createNovaPostRuntimeConfigFromOwnerSettings(
  settings: OwnerShippingSettingsRecord | null,
  encryptionService: ApplicationEncryptionService,
): Promise<NovaPostRuntimeConfig> {
  if (!settings || !settings.isEnabled || !settings.apiKeyEncrypted) {
    throw new ShippingCarrierSettingsUnavailableError();
  }

  let apiKey: string;

  try {
    apiKey = await encryptionService.decrypt(settings.apiKeyEncrypted);
  } catch {
    throw new ShippingCarrierSettingsUnavailableError();
  }

  return {
    apiKey,
    authUrl: settings.authUrl ?? undefined,
    baseUrl: settings.apiBaseUrl,
    sender: {
      companyName: settings.senderCompanyName ?? undefined,
      companyTin: settings.senderCompanyTin ?? undefined,
      countryCode: settings.senderCountryCode,
      divisionId: settings.senderDivisionId,
      email: settings.senderEmail ?? undefined,
      name: settings.senderName,
      payerContractNumber: settings.payerContractNumber ?? undefined,
      payerType: settings.payerType as NovaPostPayerType,
      phone: settings.senderPhone,
    },
    shipmentDefaults: {
      actualWeightGrams: settings.defaultActualWeightGrams,
      cargoCategory: "parcel",
      currencyCode: "UAH",
      heightMm: settings.defaultHeightMm,
      lengthMm: settings.defaultLengthMm,
      volumetricWeightGrams: settings.defaultVolumetricWeightGrams,
      widthMm: settings.defaultWidthMm,
    },
  };
}

export function createNovaPostShippingCarrier(
  config: NovaPostRuntimeConfig,
): NovaPostShippingCarrier {
  return new NovaPostShippingCarrier({
    apiKey: config.apiKey,
    authUrl: config.authUrl,
    baseUrl: config.baseUrl,
    sender: config.sender,
    shipmentDefaults: config.shipmentDefaults,
  });
}

export function getShippingLabelCreationMode(): ShippingLabelCreationMode {
  return getServerEnv().SHIPPING_LABEL_CREATION_MODE;
}

function isFixtureCarrierEnabled(env: ServerEnv): boolean {
  if (env.SHIPPING_LABEL_CREATION_MODE === "live") {
    return false;
  }

  return (
    env.SHIPPING_LABEL_CREATION_MODE === "mock" ||
    (env.NODE_ENV !== "production" &&
      (process.env.PLAYWRIGHT_E2E === "1" ||
        process.env.USE_MOCK_SHIPPING_CARRIERS === "1"))
  );
}

function createNovaPostCacheScopeKey(
  settings: OwnerShippingSettingsRecord | null,
): string {
  if (!settings) {
    throw new ShippingCarrierSettingsUnavailableError();
  }

  return [
    "owner-shipping-settings",
    settings.ownerId,
    settings.id,
    settings.updatedAt.toISOString(),
  ].join(":");
}
