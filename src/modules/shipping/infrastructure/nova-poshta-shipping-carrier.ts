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

type NovaPoshtaClientOptions = {
  apiKey: string;
  baseUrl?: string;
  fetchImpl?: typeof fetch;
};

type NovaPoshtaResponse = {
  data?: unknown[];
  errors?: unknown[];
  info?: unknown;
  success?: boolean;
};

const defaultNovaPoshtaApiUrl = "https://api.novaposhta.ua/v2.0/json/";

export class NovaPoshtaShippingCarrier implements ShippingCarrier {
  private readonly apiKey: string;
  private readonly baseUrl: string;
  private readonly fetchImpl: typeof fetch;

  constructor(options: NovaPoshtaClientOptions) {
    this.apiKey = options.apiKey;
    this.baseUrl = options.baseUrl ?? defaultNovaPoshtaApiUrl;
    this.fetchImpl = options.fetchImpl ?? fetch;
  }

  async searchCities(input: SearchCitiesInput): Promise<ShippingCity[]> {
    const response = await this.request({
      calledMethod: "getCities",
      methodProperties: {
        FindByString: input.query,
        Limit: String(input.limit ?? 20),
      },
      modelName: "Address",
    });

    return (response.data ?? []).map(mapNovaPoshtaCity).filter(isPresent);
  }

  async searchWarehouses(
    input: SearchWarehousesInput,
  ): Promise<ShippingWarehouse[]> {
    const response = await this.request({
      calledMethod: "getWarehouses",
      methodProperties: {
        CityRef: input.cityId,
        FindByString: input.query ?? "",
        Limit: String(input.limit ?? 20),
      },
      modelName: "Address",
    });

    return (response.data ?? [])
      .map((warehouse) => mapNovaPoshtaWarehouse(warehouse, input.cityId))
      .filter(isPresent);
  }

  async createShipment(input: CreateShipmentInput): Promise<CreatedShipment> {
    const response = await this.request({
      calledMethod: "save",
      methodProperties: {
        CargoType: "Parcel",
        CityRecipient: input.recipient.cityId,
        Cost: String(Math.max(1, Math.ceil(input.declaredValueMinor / 100))),
        Description: input.description,
        NewAddress: "1",
        RecipientAddress: input.recipient.warehouseId,
        RecipientCityName: input.recipient.cityName,
        RecipientName: input.recipient.fullName,
        RecipientsPhone: input.recipient.phone,
        SeatsAmount: "1",
        ServiceType: "WarehouseWarehouse",
      },
      modelName: "InternetDocument",
    });
    const shipment = firstRecord(response.data);

    if (!shipment) {
      throw new ShippingCarrierApiError("Nova Poshta shipment was not created");
    }

    const trackingNumber = stringValue(shipment.IntDocNumber);
    const carrierShipmentId = stringValue(shipment.Ref) ?? trackingNumber;

    if (!trackingNumber || !carrierShipmentId) {
      throw new ShippingCarrierApiError("Nova Poshta shipment response is invalid");
    }

    return {
      carrierShipmentId,
      labelUrl: stringValue(shipment.PrintedFormUrl),
      trackingNumber,
    };
  }

  async getShipmentStatus(
    input: ShipmentStatusInput,
  ): Promise<CarrierShipmentStatus> {
    const documentNumber = input.trackingNumber ?? input.carrierShipmentId;

    if (!documentNumber) {
      throw new ShippingCarrierApiError("Nova Poshta tracking number is required");
    }

    const response = await this.request({
      calledMethod: "getStatusDocuments",
      methodProperties: {
        Documents: [{ DocumentNumber: documentNumber }],
      },
      modelName: "TrackingDocument",
    });
    const status = firstRecord(response.data);

    if (!status) {
      throw new ShippingCarrierApiError("Nova Poshta status response is empty");
    }

    return {
      status: mapNovaPoshtaStatus(stringValue(status.StatusCode)),
      statusText: stringValue(status.Status),
      trackingNumber: stringValue(status.Number) ?? documentNumber,
      updatedAt: parseOptionalDate(stringValue(status.DateScan)),
    };
  }

  private async request(payload: {
    calledMethod: string;
    methodProperties: Record<string, unknown>;
    modelName: string;
  }): Promise<NovaPoshtaResponse> {
    const response = await this.fetchImpl(this.baseUrl, {
      body: JSON.stringify({
        apiKey: this.apiKey,
        calledMethod: payload.calledMethod,
        methodProperties: payload.methodProperties,
        modelName: payload.modelName,
      }),
      headers: {
        "content-type": "application/json",
      },
      method: "POST",
    });

    if (!response.ok) {
      throw new ShippingCarrierApiError(
        `Nova Poshta request failed with ${response.status}`,
      );
    }

    const body = (await response.json()) as NovaPoshtaResponse;

    if (body.success === false) {
      throw new ShippingCarrierApiError("Nova Poshta API returned an error", {
        errors: body.errors,
        info: body.info,
      });
    }

    return body;
  }
}

function mapNovaPoshtaCity(value: unknown): ShippingCity | null {
  const city = recordValue(value);
  const id = stringValue(city.Ref);
  const name = stringValue(city.Description);

  if (!id || !name) {
    return null;
  }

  return {
    id,
    name,
    region: stringValue(city.AreaDescription),
  };
}

function mapNovaPoshtaWarehouse(
  value: unknown,
  cityId: string,
): ShippingWarehouse | null {
  const warehouse = recordValue(value);
  const id = stringValue(warehouse.Ref);
  const name = stringValue(warehouse.Description);

  if (!id || !name) {
    return null;
  }

  return {
    address: stringValue(warehouse.ShortAddress) ?? name,
    cityId,
    id,
    name,
    number: stringValue(warehouse.Number),
    type: stringValue(warehouse.CategoryOfWarehouse),
  };
}

function mapNovaPoshtaStatus(statusCode: string | null): ShipmentStatus {
  if (!statusCode) {
    return "PENDING";
  }

  if (statusCode === "9" || statusCode === "10" || statusCode === "11") {
    return "DELIVERED";
  }

  if (["4", "5", "6", "7", "8"].includes(statusCode)) {
    return "IN_TRANSIT";
  }

  if (["101", "102", "103", "104", "105", "106", "111"].includes(statusCode)) {
    return "RETURNED";
  }

  if (["1", "2", "3"].includes(statusCode)) {
    return "CREATED";
  }

  return "PENDING";
}

function firstRecord(values: unknown[] | undefined): Record<string, unknown> | null {
  if (!values?.length) {
    return null;
  }

  return recordValue(values[0]);
}

function recordValue(value: unknown): Record<string, unknown> {
  return typeof value === "object" && value !== null
    ? (value as Record<string, unknown>)
    : {};
}

function stringValue(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function parseOptionalDate(value: string | null): Date | null {
  if (!value) {
    return null;
  }

  const parsed = new Date(value);

  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function isPresent<T>(value: T | null): value is T {
  return value !== null;
}
