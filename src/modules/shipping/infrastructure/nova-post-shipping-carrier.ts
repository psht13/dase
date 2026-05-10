import type {
  CarrierShipmentStatus,
  CreatedShipment,
  CreateShipmentInput,
  SearchCitiesInput,
  SearchWarehousesInput,
  ShippingCarrier,
  ShippingCity,
  ShippingWarehouse,
  ShipmentStatusInput,
} from "@/modules/shipping/application/shipping-carrier";
import type { ShipmentStatus } from "@/modules/shipping/application/shipment-repository";
import {
  defaultNovaPostApiUrl,
  normalizeNovaPostBaseUrl,
  NovaPostJwtProvider,
} from "@/modules/shipping/infrastructure/nova-post-jwt-provider";
import { ShippingCarrierApiError } from "@/modules/shipping/infrastructure/shipping-carrier-api-error";

type NovaPostClientOptions = {
  apiKey: string;
  authUrl?: string;
  baseUrl?: string;
  cacheTtlMs?: number;
  fetchImpl?: typeof fetch;
  jwtProvider?: NovaPostJwtProvider;
  now?: () => Date;
  refreshSkewMs?: number;
  sender?: NovaPostSenderConfig;
  shipmentDefaults?: Partial<NovaPostShipmentDefaults>;
};

export type NovaPostPayerType = "Recipient" | "Sender" | "ThirdPerson";

export type NovaPostCounterpartyConfig = {
  companyName?: string;
  companyTin?: string;
  countryCode: string;
  divisionId: string;
  email?: string;
  name: string;
  phone: string;
};

export type NovaPostSenderConfig = NovaPostCounterpartyConfig & {
  payerContractNumber?: string;
  payerType?: NovaPostPayerType;
};

export type NovaPostShipmentDefaults = {
  actualWeightGrams: number;
  cargoCategory: "parcel" | "documents";
  currencyCode: string;
  heightMm: number;
  lengthMm: number;
  volumetricWeightGrams: number;
  widthMm: number;
};

type NovaPostPaginatedResponse<T> = {
  errors?: unknown;
  items?: T[];
  message?: unknown;
  violations?: unknown;
};

type NovaPostDivision = {
  address?: unknown;
  divisionCategory?: unknown;
  externalId?: unknown;
  id?: unknown;
  name?: unknown;
  number?: unknown;
  settlement?: {
    id?: unknown;
    name?: unknown;
    region?: {
      name?: unknown;
      parent?: {
        name?: unknown;
      } | null;
    } | null;
  } | null;
  shortName?: unknown;
  status?: unknown;
};

type NovaPostCreatedShipmentResponse = {
  id?: unknown;
  number?: unknown;
};

type NovaPostTrackingHistoryResponse = {
  items?: Array<{
    history_tracking?: Array<{
      code?: unknown;
      code_name?: unknown;
      date?: unknown;
    }>;
    number?: unknown;
  }>;
};

export class NovaPostShipmentConfigurationError extends ShippingCarrierApiError {
  constructor(missingFields: string[]) {
    super(
      `Налаштування відправника Нова пошта неповні: ${missingFields.join(", ")}`,
    );
    this.name = "NovaPostShipmentConfigurationError";
  }
}

export class NovaPostShippingCarrier implements ShippingCarrier {
  private readonly baseUrl: string;
  private readonly fetchImpl: typeof fetch;
  private readonly jwtProvider: NovaPostJwtProvider;
  private readonly sender: NovaPostSenderConfig | undefined;
  private readonly shipmentDefaults: NovaPostShipmentDefaults;

  constructor(options: NovaPostClientOptions) {
    this.baseUrl = normalizeNovaPostBaseUrl(options.baseUrl ?? defaultNovaPostApiUrl);
    this.fetchImpl = options.fetchImpl ?? fetch;
    this.jwtProvider =
      options.jwtProvider ??
      new NovaPostJwtProvider({
        apiKey: options.apiKey,
        authUrl: options.authUrl,
        baseUrl: this.baseUrl,
        cacheTtlMs: options.cacheTtlMs,
        fetchImpl: this.fetchImpl,
        now: options.now,
        refreshSkewMs: options.refreshSkewMs,
      });
    this.sender = options.sender;
    this.shipmentDefaults = {
      ...defaultShipmentDefaults,
      ...options.shipmentDefaults,
    };
  }

  async searchCities(input: SearchCitiesInput): Promise<ShippingCity[]> {
    const divisions = await this.findDivisions({
      limit: Math.min((input.limit ?? 20) * 3, 50),
      query: input.query,
    });
    const query = normalizeSearch(input.query);
    const cities = new Map<string, ShippingCity>();

    for (const division of divisions) {
      const settlement = division.settlement;
      const id = stringValue(settlement?.id);
      const name = stringValue(settlement?.name);

      if (!id || !name) {
        continue;
      }

      const haystack = `${name} ${stringValue(division.address) ?? ""}`;

      if (query && !normalizeSearch(haystack).includes(query)) {
        continue;
      }

      cities.set(id, {
        id,
        name,
        region:
          stringValue(settlement?.region?.parent?.name) ??
          stringValue(settlement?.region?.name),
      });
    }

    return [...cities.values()].slice(0, input.limit ?? 20);
  }

  async searchWarehouses(
    input: SearchWarehousesInput,
  ): Promise<ShippingWarehouse[]> {
    const divisions = await this.findDivisions({
      limit: input.limit ?? 20,
      query: input.query,
      settlementId: input.cityId,
    });

    return divisions
      .map((division) => mapNovaPostWarehouse(division, input.cityId))
      .filter(isPresent);
  }

  async createShipment(input: CreateShipmentInput): Promise<CreatedShipment> {
    const sender = this.requireSenderConfig();
    const declaredValue = Math.max(1, Math.ceil(input.declaredValueMinor / 100));
    const payload = {
      clientOrder: input.orderId.slice(0, 50),
      note: input.description.slice(0, 255),
      number: "",
      parcels: [
        {
          actualWeight: this.shipmentDefaults.actualWeightGrams,
          cargoCategory: this.shipmentDefaults.cargoCategory,
          height: this.shipmentDefaults.heightMm,
          insuranceCost: declaredValue,
          insuranceCurrencyCode: this.shipmentDefaults.currencyCode,
          length: this.shipmentDefaults.lengthMm,
          number: "",
          parcelDescription: input.description.slice(0, 255),
          rowNumber: 1,
          volumetricWeight: this.shipmentDefaults.volumetricWeightGrams,
          width: this.shipmentDefaults.widthMm,
        },
      ],
      payerContractNumber: sender.payerContractNumber ?? null,
      payerType: sender.payerType ?? "Recipient",
      recipient: {
        countryCode: "UA",
        divisionId: input.recipient.warehouseId,
        name: input.recipient.fullName,
        phone: normalizePhone(input.recipient.phone),
      },
      sender: {
        companyName: sender.companyName ?? "",
        companyTin: sender.companyTin ?? "",
        countryCode: sender.countryCode,
        divisionId: sender.divisionId,
        email: sender.email ?? "",
        name: sender.name,
        phone: normalizePhone(sender.phone),
      },
      services: [],
      status: "ReadyToShip",
    };

    const shipment = await this.requestJson<NovaPostCreatedShipmentResponse>(
      "shipments",
      {
        body: JSON.stringify(payload),
        headers: {
          "content-type": "application/json",
        },
        method: "POST",
      },
    );
    const carrierShipmentId = stringValue(shipment.id);
    const trackingNumber = stringValue(shipment.number);

    if (!carrierShipmentId || !trackingNumber) {
      throw new ShippingCarrierApiError("Nova Post shipment response is invalid");
    }

    return {
      carrierShipmentId,
      labelUrl: this.createPrintUrl(trackingNumber),
      trackingNumber,
    };
  }

  async getShipmentStatus(
    input: ShipmentStatusInput,
  ): Promise<CarrierShipmentStatus> {
    const documentNumber = input.trackingNumber ?? input.carrierShipmentId;

    if (!documentNumber) {
      throw new ShippingCarrierApiError("Nova Post tracking number is required");
    }

    const url = new URL("shipments/tracking/history", this.baseUrl);
    url.searchParams.append("numbers[]", documentNumber);
    const response = await this.requestJson<NovaPostTrackingHistoryResponse>(url);
    const item = response.items?.[0];
    const latestStatus = latestTrackingStatus(item?.history_tracking ?? []);

    if (!item || !latestStatus) {
      throw new ShippingCarrierApiError("Nova Post status response is empty");
    }

    return {
      status: mapNovaPostStatus(stringValue(latestStatus.code)),
      statusText: stringValue(latestStatus.code_name),
      trackingNumber: stringValue(item.number) ?? documentNumber,
      updatedAt: parseOptionalDate(stringValue(latestStatus.date)),
    };
  }

  private async findDivisions(input: {
    limit: number;
    query?: string;
    settlementId?: string;
  }): Promise<NovaPostDivision[]> {
    const url = new URL("divisions", this.baseUrl);

    url.searchParams.append("countryCodes[]", "UA");
    url.searchParams.set("limit", String(input.limit));
    url.searchParams.set("page", "1");
    url.searchParams.append("statuses[]", "Working");
    url.searchParams.set("prohibitedIssuance", "false");

    if (input.settlementId) {
      url.searchParams.append("settlementIds[]", input.settlementId);
      url.searchParams.append("divisionCategories[]", "PostBranch");
      url.searchParams.append("divisionCategories[]", "CargoBranch");
      url.searchParams.append("divisionCategories[]", "Postomat");
    }

    const query = normalizeSearch(input.query ?? "");

    if (query) {
      url.searchParams.set("textSearch", query);
    }

    const response = await this.requestJson<
      NovaPostPaginatedResponse<NovaPostDivision>
    >(url, {
      headers: {
        "accept-language": "uk",
      },
    });

    return response.items ?? [];
  }

  private async requestJson<T>(
    pathOrUrl: string | URL,
    init: RequestInit = {},
  ): Promise<T> {
    const token = await this.jwtProvider.getToken();
    const url =
      pathOrUrl instanceof URL ? pathOrUrl : new URL(pathOrUrl, this.baseUrl);
    const headers = new Headers(init.headers);

    headers.set("accept", headers.get("accept") ?? "application/json");
    headers.set("authorization", token);

    const response = await this.fetchImpl(url, {
      ...init,
      headers,
      method: init.method ?? "GET",
    });

    if (!response.ok) {
      throw new ShippingCarrierApiError(
        `Nova Post request failed with ${response.status}`,
      );
    }

    const body = (await response.json()) as T & {
      errors?: unknown;
      message?: unknown;
      violations?: unknown;
    };

    if (body.errors || body.violations) {
      throw new ShippingCarrierApiError("Nova Post API returned an error", {
        errors: body.errors,
        message: body.message,
        violations: body.violations,
      });
    }

    return body;
  }

  private requireSenderConfig(): NovaPostSenderConfig {
    const missingKeys = missingSenderKeys(this.sender);

    if (missingKeys.length > 0 || !this.sender) {
      throw new NovaPostShipmentConfigurationError(missingKeys);
    }

    return this.sender;
  }

  private createPrintUrl(trackingNumber: string): string {
    const url = new URL("shipments/print", this.baseUrl);

    url.searchParams.set("type", "marking");
    url.searchParams.append("numbers[]", trackingNumber);

    return url.toString();
  }
}

const defaultShipmentDefaults: NovaPostShipmentDefaults = {
  actualWeightGrams: 500,
  cargoCategory: "parcel",
  currencyCode: "UAH",
  heightMm: 100,
  lengthMm: 300,
  volumetricWeightGrams: 500,
  widthMm: 200,
};

function mapNovaPostWarehouse(
  division: NovaPostDivision,
  cityId: string,
): ShippingWarehouse | null {
  const id = stringValue(division.id);
  const name = stringValue(division.name) ?? stringValue(division.shortName);

  if (!id || !name) {
    return null;
  }

  return {
    address: stringValue(division.address),
    cityId,
    id,
    name,
    number: stringValue(division.number),
    type: stringValue(division.divisionCategory),
  };
}

function mapNovaPostStatus(statusCode: string | null): ShipmentStatus {
  if (!statusCode) {
    return "PENDING";
  }

  if (["9", "10", "11"].includes(statusCode)) {
    return "DELIVERED";
  }

  if (statusCode === "2") {
    return "CANCELLED";
  }

  if (
    [
      "102",
      "103",
      "104",
      "105",
      "106",
      "130",
      "131",
      "132",
      "141",
      "144",
      "149",
      "155",
    ].includes(statusCode)
  ) {
    return "RETURNED";
  }

  if (
    [
      "4",
      "5",
      "6",
      "7",
      "8",
      "13",
      "16",
      "30",
      "31",
      "99",
      "101",
      "110",
      "111",
      "112",
      "113",
      "114",
      "115",
      "116",
      "117",
      "118",
      "119",
      "120",
      "121",
      "122",
      "123",
      "125",
      "126",
      "127",
      "128",
      "197",
      "198",
      "199",
    ].includes(statusCode)
  ) {
    return "IN_TRANSIT";
  }

  if (statusCode === "1") {
    return "CREATED";
  }

  return "PENDING";
}

function latestTrackingStatus(
  statuses: NonNullable<
    NovaPostTrackingHistoryResponse["items"]
  >[number]["history_tracking"],
) {
  if (!statuses?.length) {
    return null;
  }

  return statuses
    .map((status, index) => ({
      index,
      status,
      time: parseOptionalDate(stringValue(status.date))?.getTime() ?? null,
    }))
    .sort((left, right) => {
      if (left.time !== null && right.time !== null) {
        return right.time - left.time;
      }

      return right.index - left.index;
    })[0].status;
}

function missingSenderKeys(
  sender: NovaPostSenderConfig | undefined,
): string[] {
  const missing: string[] = [];

  if (!sender?.countryCode) {
    missing.push("sender.countryCode");
  }

  if (!sender?.divisionId) {
    missing.push("sender.divisionId");
  }

  if (!sender?.name) {
    missing.push("sender.name");
  }

  if (!sender?.phone) {
    missing.push("sender.phone");
  }

  return missing;
}

function normalizePhone(value: string): string {
  return value.trim().replace(/\D/g, "");
}

function normalizeSearch(value: string): string {
  return value.trim().replace(/\s+/g, " ").toLocaleLowerCase("uk");
}

function isPresent<T>(value: T | null): value is T {
  return value !== null;
}

function stringValue(value: unknown): string | null {
  if (typeof value === "number" && Number.isFinite(value)) {
    return String(value);
  }

  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function parseOptionalDate(value: string | null): Date | null {
  if (!value) {
    return null;
  }

  const date = new Date(value);

  return Number.isNaN(date.getTime()) ? null : date;
}
