import { HttpResponse, http } from "msw";
import { setupServer } from "msw/node";
import { NovaPoshtaShippingCarrier } from "@/modules/shipping/infrastructure/nova-poshta-shipping-carrier";
import { ShippingCarrierApiError } from "@/modules/shipping/infrastructure/shipping-carrier-api-error";

const server = setupServer(
  http.post("https://nova.test/json", async ({ request }) => {
    const body = (await request.json()) as {
      apiKey?: string;
      calledMethod?: string;
      methodProperties?: Record<string, unknown>;
      modelName?: string;
    };

    if (body.apiKey !== "test-nova-key") {
      return HttpResponse.json(
        { errors: ["bad key"], success: false },
        { status: 200 },
      );
    }

    if (
      body.modelName === "Address" &&
      body.calledMethod === "getCities" &&
      body.methodProperties?.FindByString === "Київ"
    ) {
      return HttpResponse.json({
        data: [
          {
            AreaDescription: "Київська область",
            Description: "Київ",
            Ref: "np-city-kyiv",
          },
        ],
        success: true,
      });
    }

    if (
      body.modelName === "Address" &&
      body.calledMethod === "getWarehouses" &&
      body.methodProperties?.CityRef === "np-city-kyiv"
    ) {
      return HttpResponse.json({
        data: [
          {
            CategoryOfWarehouse: "warehouse",
            Description: "Відділення №1",
            Number: "1",
            Ref: "np-wh-1",
            ShortAddress: "вул. Хрещатик, 1",
          },
        ],
        success: true,
      });
    }

    if (
      body.modelName === "InternetDocument" &&
      body.calledMethod === "save"
    ) {
      return HttpResponse.json({
        data: [
          {
            IntDocNumber: "20450000000000",
            PrintedFormUrl: "https://nova.test/label.pdf",
            Ref: "np-shipment-1",
          },
        ],
        success: true,
      });
    }

    if (
      body.modelName === "TrackingDocument" &&
      body.calledMethod === "getStatusDocuments"
    ) {
      return HttpResponse.json({
        data: [
          {
            DateScan: "2026-04-30T12:00:00.000Z",
            Number: "20450000000000",
            Status: "В дорозі",
            StatusCode: "5",
          },
        ],
        success: true,
      });
    }

    return HttpResponse.json({ data: [], success: true });
  }),
);

beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

describe("NovaPoshtaShippingCarrier", () => {
  it("maps city and warehouse search responses to internal DTOs", async () => {
    const carrier = createCarrier();

    await expect(carrier.searchCities({ query: "Київ" })).resolves.toEqual([
      { id: "np-city-kyiv", name: "Київ", region: "Київська область" },
    ]);
    await expect(
      carrier.searchWarehouses({ cityId: "np-city-kyiv", query: "1" }),
    ).resolves.toEqual([
      {
        address: "вул. Хрещатик, 1",
        cityId: "np-city-kyiv",
        id: "np-wh-1",
        name: "Відділення №1",
        number: "1",
        type: "warehouse",
      },
    ]);
  });

  it("creates shipments and maps tracking status", async () => {
    const carrier = createCarrier();

    await expect(
      carrier.createShipment({
        carrier: "NOVA_POSHTA",
        declaredValueMinor: 1_200_00,
        description: "Замовлення Dase",
        orderId: "order-1",
        recipient: {
          cityId: "np-city-kyiv",
          cityName: "Київ",
          fullName: "Олена Петренко",
          phone: "+380671234567",
          warehouseId: "np-wh-1",
          warehouseName: "Відділення №1",
        },
      }),
    ).resolves.toEqual({
      carrierShipmentId: "np-shipment-1",
      labelUrl: "https://nova.test/label.pdf",
      trackingNumber: "20450000000000",
    });
    await expect(
      carrier.getShipmentStatus({ trackingNumber: "20450000000000" }),
    ).resolves.toMatchObject({
      status: "IN_TRANSIT",
      statusText: "В дорозі",
      trackingNumber: "20450000000000",
    });
  });

  it("throws a carrier error when Nova Poshta rejects a request", async () => {
    const carrier = new NovaPoshtaShippingCarrier({
      apiKey: "wrong-key",
      baseUrl: "https://nova.test/json",
    });

    await expect(carrier.searchCities({ query: "Київ" })).rejects.toBeInstanceOf(
      ShippingCarrierApiError,
    );
  });

  it("maps additional Nova Poshta status codes", async () => {
    const carrier = createCarrier();

    mockNovaStatus("9", "Отримано");
    await expect(
      carrier.getShipmentStatus({ trackingNumber: "20450000000000" }),
    ).resolves.toMatchObject({ status: "DELIVERED" });

    mockNovaStatus("102", "Повернення");
    await expect(
      carrier.getShipmentStatus({ trackingNumber: "20450000000000" }),
    ).resolves.toMatchObject({ status: "RETURNED" });

    mockNovaStatus("2", "Створено");
    await expect(
      carrier.getShipmentStatus({ trackingNumber: "20450000000000" }),
    ).resolves.toMatchObject({ status: "CREATED" });

    mockNovaStatus("777", "Невідомо");
    await expect(
      carrier.getShipmentStatus({ trackingNumber: "20450000000000" }),
    ).resolves.toMatchObject({ status: "PENDING" });
  });

  it("throws for failed HTTP responses and missing status input", async () => {
    const carrier = createCarrier();

    await expect(carrier.getShipmentStatus({} as never)).rejects.toBeInstanceOf(
      ShippingCarrierApiError,
    );

    server.use(
      http.post("https://nova.test/json", () =>
        HttpResponse.json({ message: "unavailable" }, { status: 503 }),
      ),
    );
    await expect(carrier.searchCities({ query: "Київ" })).rejects.toBeInstanceOf(
      ShippingCarrierApiError,
    );
  });
});

function createCarrier() {
  return new NovaPoshtaShippingCarrier({
    apiKey: "test-nova-key",
    baseUrl: "https://nova.test/json",
  });
}

function mockNovaStatus(statusCode: string, status: string) {
  server.use(
    http.post("https://nova.test/json", () =>
      HttpResponse.json({
        data: [
          {
            Number: "20450000000000",
            Status: status,
            StatusCode: statusCode,
          },
        ],
        success: true,
      }),
    ),
  );
}
