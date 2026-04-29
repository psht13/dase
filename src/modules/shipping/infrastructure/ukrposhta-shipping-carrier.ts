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
import { ShippingCarrierApiError } from "@/modules/shipping/infrastructure/shipping-carrier-api-error";

type UkrposhtaClientOptions = {
  baseUrl?: string;
  bearerToken: string;
  counterpartyToken?: string;
  fetchImpl?: typeof fetch;
};

const defaultUkrposhtaApiUrl = "https://www.ukrposhta.ua/ecom/0.0.1";

export class UkrposhtaShippingCarrier implements ShippingCarrier {
  private readonly baseUrl: string;
  private readonly bearerToken: string;
  private readonly counterpartyToken: string | undefined;
  private readonly fetchImpl: typeof fetch;

  constructor(options: UkrposhtaClientOptions) {
    this.baseUrl = trimTrailingSlash(options.baseUrl ?? defaultUkrposhtaApiUrl);
    this.bearerToken = options.bearerToken;
    this.counterpartyToken = options.counterpartyToken;
    this.fetchImpl = options.fetchImpl ?? fetch;
  }

  async searchCities(input: SearchCitiesInput): Promise<ShippingCity[]> {
    const url = this.url("/cities", {
      limit: String(input.limit ?? 20),
      name: input.query,
    });
    const response = await this.request(url);
    const cities = arrayPayload(response);

    return cities.map(mapUkrposhtaCity).filter(isPresent);
  }

  async searchWarehouses(
    input: SearchWarehousesInput,
  ): Promise<ShippingWarehouse[]> {
    const url = this.url("/postoffices", {
      cityId: input.cityId,
      limit: String(input.limit ?? 20),
      query: input.query ?? "",
    });
    const response = await this.request(url);
    const warehouses = arrayPayload(response);

    return warehouses
      .filter(isAvailableUkrposhtaPostOffice)
      .map((warehouse) => mapUkrposhtaWarehouse(warehouse, input.cityId))
      .filter(isPresent);
  }

  async createShipment(input: CreateShipmentInput): Promise<CreatedShipment> {
    const response = await this.request(this.url("/shipments"), {
      body: JSON.stringify({
        declaredValue: Math.max(1, Math.ceil(input.declaredValueMinor / 100)),
        description: input.description,
        externalOrderId: input.orderId,
        recipient: input.recipient,
      }),
      method: "POST",
    });
    const shipment = recordPayload(response);
    const trackingNumber =
      stringValue(shipment.barcode) ?? stringValue(shipment.trackingNumber);
    const carrierShipmentId = stringValue(shipment.id) ?? trackingNumber;

    if (!trackingNumber || !carrierShipmentId) {
      throw new ShippingCarrierApiError("Ukrposhta shipment response is invalid");
    }

    return {
      carrierShipmentId,
      labelUrl: stringValue(shipment.labelUrl),
      trackingNumber,
    };
  }

  async getShipmentStatus(
    input: ShipmentStatusInput,
  ): Promise<CarrierShipmentStatus> {
    const documentNumber = input.trackingNumber ?? input.carrierShipmentId;

    if (!documentNumber) {
      throw new ShippingCarrierApiError("Ukrposhta tracking number is required");
    }

    const response = await this.request(
      this.url(`/shipments/${encodeURIComponent(documentNumber)}/status`),
    );
    const status = recordPayload(response);

    return {
      status: mapUkrposhtaStatus(stringValue(status.status)),
      statusText: stringValue(status.statusText) ?? stringValue(status.status),
      trackingNumber: stringValue(status.barcode) ?? documentNumber,
      updatedAt: parseOptionalDate(stringValue(status.updatedAt)),
    };
  }

  private url(pathname: string, params?: Record<string, string>): string {
    const url = new URL(`${this.baseUrl}${pathname}`);

    for (const [key, value] of Object.entries(params ?? {})) {
      if (value) {
        url.searchParams.set(key, value);
      }
    }

    return url.toString();
  }

  private async request(
    url: string,
    init: RequestInit = {},
  ): Promise<unknown> {
    const response = await this.fetchImpl(url, {
      ...init,
      headers: {
        authorization: `Bearer ${this.bearerToken}`,
        "content-type": "application/json",
        ...(this.counterpartyToken
          ? { "x-counterparty-token": this.counterpartyToken }
          : {}),
        ...init.headers,
      },
    });

    if (!response.ok) {
      throw new ShippingCarrierApiError(
        `Ukrposhta request failed with ${response.status}`,
      );
    }

    return response.json();
  }
}

function mapUkrposhtaCity(value: unknown): ShippingCity | null {
  const city = recordValue(value);
  const id = stringValue(city.id) ?? stringValue(city.CITY_ID);
  const name = stringValue(city.name) ?? stringValue(city.CITY_UA);

  if (!id || !name) {
    return null;
  }

  return {
    id,
    name,
    region: stringValue(city.region) ?? stringValue(city.REGION_UA),
  };
}

function mapUkrposhtaWarehouse(
  value: unknown,
  cityId: string,
): ShippingWarehouse | null {
  const warehouse = recordValue(value);
  const id = stringValue(warehouse.id) ?? stringValue(warehouse.POSTOFFICE_ID);
  const name =
    stringValue(warehouse.name) ??
    stringValue(warehouse.POSTOFFICE_UA) ??
    stringValue(warehouse.postOffice);

  if (!id || !name) {
    return null;
  }

  return {
    address: stringValue(warehouse.address) ?? stringValue(warehouse.ADDRESS),
    cityId,
    id,
    name,
    number: stringValue(warehouse.number) ?? stringValue(warehouse.POSTINDEX),
    type: stringValue(warehouse.type),
  };
}

function isAvailableUkrposhtaPostOffice(value: unknown): boolean {
  const office = recordValue(value);
  const status = stringValue(office.status)?.toUpperCase();

  if (office.active === false || office.isActive === false) {
    return false;
  }

  if (office.LOCKED === true || office.CLOSED === true) {
    return false;
  }

  return status !== "INACTIVE" && status !== "CLOSED";
}

function mapUkrposhtaStatus(status: string | null): ShipmentStatus {
  const normalizedStatus = status?.toUpperCase();

  if (!normalizedStatus) {
    return "PENDING";
  }

  if (["DELIVERED", "DELIVERY", "ВРУЧЕНО"].includes(normalizedStatus)) {
    return "DELIVERED";
  }

  if (["IN_TRANSIT", "TRANSIT", "ON_ROUTE"].includes(normalizedStatus)) {
    return "IN_TRANSIT";
  }

  if (["CREATED", "REGISTERED", "ACCEPTED"].includes(normalizedStatus)) {
    return "CREATED";
  }

  if (["RETURNED", "RETURN"].includes(normalizedStatus)) {
    return "RETURNED";
  }

  if (["FAILED", "CANCELLED", "CANCELED"].includes(normalizedStatus)) {
    return "FAILED";
  }

  return "PENDING";
}

function arrayPayload(value: unknown): unknown[] {
  if (Array.isArray(value)) {
    return value;
  }

  const record = recordValue(value);

  if (Array.isArray(record.data)) {
    return record.data;
  }

  if (Array.isArray(record.results)) {
    return record.results;
  }

  return [];
}

function recordPayload(value: unknown): Record<string, unknown> {
  const record = recordValue(value);

  if (record.data && !Array.isArray(record.data)) {
    return recordValue(record.data);
  }

  return record;
}

function recordValue(value: unknown): Record<string, unknown> {
  return typeof value === "object" && value !== null
    ? (value as Record<string, unknown>)
    : {};
}

function stringValue(value: unknown): string | null {
  if (typeof value === "number") {
    return String(value);
  }

  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function parseOptionalDate(value: string | null): Date | null {
  if (!value) {
    return null;
  }

  const parsed = new Date(value);

  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function trimTrailingSlash(value: string): string {
  return value.replace(/\/+$/, "");
}

function isPresent<T>(value: T | null): value is T {
  return value !== null;
}
