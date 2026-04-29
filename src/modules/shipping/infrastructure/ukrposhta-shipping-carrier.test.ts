import { HttpResponse, http } from "msw";
import { setupServer } from "msw/node";
import { ShippingCarrierApiError } from "@/modules/shipping/infrastructure/shipping-carrier-api-error";
import { UkrposhtaShippingCarrier } from "@/modules/shipping/infrastructure/ukrposhta-shipping-carrier";

const server = setupServer(
  http.get("https://ukr.test/cities", ({ request }) => {
    const url = new URL(request.url);

    if (request.headers.get("authorization") !== "Bearer test-ukr-token") {
      return HttpResponse.json({ message: "bad token" }, { status: 401 });
    }

    expect(url.searchParams.get("name")).toBe("Київ");

    return HttpResponse.json({
      data: [
        {
          CITY_ID: "up-city-kyiv",
          CITY_UA: "Київ",
          REGION_UA: "Київська область",
        },
      ],
    });
  }),
  http.get("https://ukr.test/postoffices", ({ request }) => {
    const url = new URL(request.url);

    expect(url.searchParams.get("cityId")).toBe("up-city-kyiv");

    return HttpResponse.json({
      data: [
        {
          ADDRESS: "вул. Хрещатик, 22",
          POSTINDEX: "01001",
          POSTOFFICE_ID: "up-wh-01001",
          POSTOFFICE_UA: "Відділення 01001",
        },
        {
          ADDRESS: "зачинено",
          LOCKED: true,
          POSTOFFICE_ID: "up-wh-closed",
          POSTOFFICE_UA: "Закрите відділення",
        },
      ],
    });
  }),
  http.post("https://ukr.test/shipments", async ({ request }) => {
    const body = (await request.json()) as {
      externalOrderId?: string;
    };

    expect(body.externalOrderId).toBe("order-1");

    return HttpResponse.json({
      barcode: "0500000000000",
      id: "up-shipment-1",
      labelUrl: "https://ukr.test/label.pdf",
    });
  }),
  http.get("https://ukr.test/shipments/:trackingNumber/status", () =>
    HttpResponse.json({
      barcode: "0500000000000",
      status: "DELIVERED",
      statusText: "Вручено",
      updatedAt: "2026-04-30T12:00:00.000Z",
    }),
  ),
);

beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

describe("UkrposhtaShippingCarrier", () => {
  it("maps city search and filters unavailable post offices", async () => {
    const carrier = createCarrier();

    await expect(carrier.searchCities({ query: "Київ" })).resolves.toEqual([
      { id: "up-city-kyiv", name: "Київ", region: "Київська область" },
    ]);
    await expect(
      carrier.searchWarehouses({ cityId: "up-city-kyiv", query: "01001" }),
    ).resolves.toEqual([
      {
        address: "вул. Хрещатик, 22",
        cityId: "up-city-kyiv",
        id: "up-wh-01001",
        name: "Відділення 01001",
        number: "01001",
        type: null,
      },
    ]);
  });

  it("creates shipments and maps delivered status", async () => {
    const carrier = createCarrier();

    await expect(
      carrier.createShipment({
        carrier: "UKRPOSHTA",
        declaredValueMinor: 1_200_00,
        description: "Замовлення Dase",
        orderId: "order-1",
        recipient: {
          cityId: "up-city-kyiv",
          cityName: "Київ",
          fullName: "Олена Петренко",
          phone: "+380671234567",
          warehouseId: "up-wh-01001",
          warehouseName: "Відділення 01001",
        },
      }),
    ).resolves.toEqual({
      carrierShipmentId: "up-shipment-1",
      labelUrl: "https://ukr.test/label.pdf",
      trackingNumber: "0500000000000",
    });
    await expect(
      carrier.getShipmentStatus({ trackingNumber: "0500000000000" }),
    ).resolves.toMatchObject({
      status: "DELIVERED",
      statusText: "Вручено",
    });
  });

  it("throws a carrier error for unauthorized requests", async () => {
    const carrier = new UkrposhtaShippingCarrier({
      baseUrl: "https://ukr.test",
      bearerToken: "wrong-token",
    });

    await expect(carrier.searchCities({ query: "Київ" })).rejects.toBeInstanceOf(
      ShippingCarrierApiError,
    );
  });

  it("filters inactive post offices marked with different API fields", async () => {
    const carrier = createCarrier();
    server.use(
      http.get("https://ukr.test/postoffices", () =>
        HttpResponse.json({
          data: [
            {
              POSTOFFICE_ID: "active",
              POSTOFFICE_UA: "Відділення 02002",
            },
            {
              POSTOFFICE_ID: "inactive-status",
              POSTOFFICE_UA: "Неактивне",
              status: "INACTIVE",
            },
            {
              POSTOFFICE_ID: "inactive-active",
              POSTOFFICE_UA: "Неактивне",
              active: false,
            },
            {
              POSTOFFICE_ID: "inactive-is-active",
              POSTOFFICE_UA: "Неактивне",
              isActive: false,
            },
          ],
        }),
      ),
    );

    await expect(
      carrier.searchWarehouses({ cityId: "up-city-kyiv" }),
    ).resolves.toEqual([
      expect.objectContaining({
        id: "active",
        name: "Відділення 02002",
      }),
    ]);
  });

  it("maps additional Ukrposhta statuses and invalid tracking input", async () => {
    const carrier = createCarrier();

    await expect(carrier.getShipmentStatus({} as never)).rejects.toBeInstanceOf(
      ShippingCarrierApiError,
    );

    mockUkrposhtaStatus("ACCEPTED");
    await expect(
      carrier.getShipmentStatus({ trackingNumber: "0500000000000" }),
    ).resolves.toMatchObject({ status: "CREATED" });

    mockUkrposhtaStatus("TRANSIT");
    await expect(
      carrier.getShipmentStatus({ trackingNumber: "0500000000000" }),
    ).resolves.toMatchObject({ status: "IN_TRANSIT" });

    mockUkrposhtaStatus("RETURN");
    await expect(
      carrier.getShipmentStatus({ trackingNumber: "0500000000000" }),
    ).resolves.toMatchObject({ status: "RETURNED" });

    mockUkrposhtaStatus("CANCELLED");
    await expect(
      carrier.getShipmentStatus({ trackingNumber: "0500000000000" }),
    ).resolves.toMatchObject({ status: "FAILED" });

    mockUkrposhtaStatus("UNKNOWN");
    await expect(
      carrier.getShipmentStatus({ trackingNumber: "0500000000000" }),
    ).resolves.toMatchObject({ status: "PENDING" });
  });
});

function createCarrier() {
  return new UkrposhtaShippingCarrier({
    baseUrl: "https://ukr.test",
    bearerToken: "test-ukr-token",
  });
}

function mockUkrposhtaStatus(status: string) {
  server.use(
    http.get("https://ukr.test/shipments/:trackingNumber/status", () =>
      HttpResponse.json({
        barcode: "0500000000000",
        status,
      }),
    ),
  );
}
