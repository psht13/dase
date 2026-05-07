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
import type { ShipmentCarrier } from "@/modules/shipping/application/shipment-repository";

const fixtureCities: Partial<Record<ShipmentCarrier, ShippingCity[]>> = {
  NOVA_POSHTA: [
    { id: "np-city-kyiv", name: "Київ", region: "Київська область" },
    { id: "np-city-lviv", name: "Львів", region: "Львівська область" },
  ],
};

const fixtureWarehouses: Partial<Record<ShipmentCarrier, ShippingWarehouse[]>> = {
  NOVA_POSHTA: [
    {
      address: "вул. Хрещатик, 1",
      cityId: "np-city-kyiv",
      id: "np-wh-1",
      name: "Відділення №1",
      number: "1",
      type: "warehouse",
    },
    {
      address: "вул. Богдана Хмельницького, 12",
      cityId: "np-city-kyiv",
      id: "np-wh-2",
      name: "Поштомат №2",
      number: "2",
      type: "postomat",
    },
  ],
};

export class FixtureShippingCarrier implements ShippingCarrier {
  constructor(private readonly carrier: ShipmentCarrier) {}

  async searchCities(input: SearchCitiesInput): Promise<ShippingCity[]> {
    const query = input.query.toLocaleLowerCase("uk");

    return (fixtureCities[this.carrier] ?? [])
      .filter((city) => city.name.toLocaleLowerCase("uk").includes(query))
      .slice(0, input.limit ?? 20);
  }

  async searchWarehouses(
    input: SearchWarehousesInput,
  ): Promise<ShippingWarehouse[]> {
    const query = (input.query ?? "").toLocaleLowerCase("uk");

    return (fixtureWarehouses[this.carrier] ?? [])
      .filter((warehouse) => warehouse.cityId === input.cityId)
      .filter((warehouse) =>
        query
          ? `${warehouse.name} ${warehouse.address ?? ""}`
              .toLocaleLowerCase("uk")
              .includes(query)
          : true,
      )
      .slice(0, input.limit ?? 20);
  }

  async createShipment(input: CreateShipmentInput): Promise<CreatedShipment> {
    if (this.carrier !== "NOVA_POSHTA") {
      throw new Error("Fixture shipping carrier is disabled");
    }

    return {
      carrierShipmentId: `${this.carrier}-${input.orderId}`,
      labelUrl: null,
      trackingNumber: "20450000000000",
    };
  }

  async getShipmentStatus(
    input: ShipmentStatusInput,
  ): Promise<CarrierShipmentStatus> {
    return {
      status: "CREATED",
      statusText: "Створено",
      trackingNumber: input.trackingNumber ?? input.carrierShipmentId ?? null,
      updatedAt: null,
    };
  }
}
