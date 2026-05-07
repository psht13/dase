import { HttpResponse, http } from "msw";
import { setupServer } from "msw/node";
import {
  NovaPostShipmentConfigurationError,
  NovaPostShippingCarrier,
} from "@/modules/shipping/infrastructure/nova-post-shipping-carrier";

const novaPostBaseUrl = "https://nova.test/v.1.0/";
const now = new Date("2026-05-07T10:00:00.000Z");

let authRequestCount = 0;
let authApiKeys: string[] = [];
let authHeaders: string[] = [];
let currentJwt = createJwt("jwt-a", Math.floor((now.getTime() + 60_000) / 1_000));
let shipmentRequests: unknown[] = [];
let trackingCode = "5";
let trackingText = "У дорозі";

const server = setupServer(
  http.get(`${novaPostBaseUrl}clients/authorization`, ({ request }) => {
    authRequestCount += 1;
    authApiKeys.push(new URL(request.url).searchParams.get("apiKey") ?? "");

    return HttpResponse.json({ jwt: currentJwt });
  }),
  http.get(`${novaPostBaseUrl}divisions`, ({ request }) => {
    authHeaders.push(request.headers.get("authorization") ?? "");
    const url = new URL(request.url);
    const settlementId = url.searchParams.get("settlementIds[]");

    if (url.searchParams.get("textSearch") === "provider-error") {
      return HttpResponse.json(
        { errors: ["raw provider error"], message: "provider failed" },
        { status: 422 },
      );
    }

    if (settlementId) {
      return HttpResponse.json({
        current_page: 1,
        items: [
          {
            address: "01001, Україна, Київ, вул. Хрещатик, 1",
            divisionCategory: "PostBranch",
            id: 12011,
            name: "Відділення №1",
            number: "1",
            settlement: {
              id: Number(settlementId),
              name: "Київ",
              region: { name: "Київ", parent: { name: "Київська область" } },
            },
            shortName: "Відділення №1",
            status: "Working",
          },
        ],
        last_page: 1,
        per_page: 20,
        total: 1,
      });
    }

    return HttpResponse.json({
      current_page: 1,
      items: [
        {
          address: "Україна, Київ, вул. Хрещатик, 1",
          divisionCategory: "PostBranch",
          id: 12011,
          name: "Відділення №1",
          settlement: {
            id: 118064,
            name: "Київ",
            region: { name: "Київ", parent: { name: "Київська область" } },
          },
          status: "Working",
        },
        {
          address: "Україна, Київ, вул. Богдана Хмельницького, 12",
          divisionCategory: "Postomat",
          id: 12012,
          name: "Поштомат №2",
          settlement: {
            id: 118064,
            name: "Київ",
            region: { name: "Київ", parent: { name: "Київська область" } },
          },
          status: "Working",
        },
      ],
      last_page: 1,
      per_page: 20,
      total: 2,
    });
  }),
  http.post(`${novaPostBaseUrl}shipments`, async ({ request }) => {
    authHeaders.push(request.headers.get("authorization") ?? "");
    shipmentRequests.push(await request.json());

    return HttpResponse.json(
      {
        id: "56abe014-451c-11f0-a1d5-48df37b921da",
        number: "51187918711526",
        status: "ReadyToShip",
      },
      { status: 201 },
    );
  }),
  http.get(`${novaPostBaseUrl}shipments/tracking/history`, ({ request }) => {
    authHeaders.push(request.headers.get("authorization") ?? "");

    return HttpResponse.json({
      items: [
        {
          history_tracking: [
            {
              code: "1",
              code_name: "Створено",
              date: "2026-05-07T09:00:00.000Z",
            },
            {
              code: trackingCode,
              code_name: trackingText,
              date: "2026-05-07T10:00:00.000Z",
            },
          ],
          id: "56abe014-451c-11f0-a1d5-48df37b921da",
          number: "51187918711526",
        },
      ],
    });
  }),
);

beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
afterEach(() => {
  authRequestCount = 0;
  authApiKeys = [];
  authHeaders = [];
  currentJwt = createJwt("jwt-a", Math.floor((now.getTime() + 60_000) / 1_000));
  shipmentRequests = [];
  trackingCode = "5";
  trackingText = "У дорозі";
  server.resetHandlers();
});
afterAll(() => server.close());

describe("NovaPostShippingCarrier", () => {
  it("generates a JWT from the API key and caches it for directory requests", async () => {
    const carrier = createCarrier();

    await expect(carrier.searchCities({ query: "Київ" })).resolves.toEqual([
      { id: "118064", name: "Київ", region: "Київська область" },
    ]);
    await expect(
      carrier.searchWarehouses({ cityId: "118064", query: "1" }),
    ).resolves.toEqual([
      {
        address: "01001, Україна, Київ, вул. Хрещатик, 1",
        cityId: "118064",
        id: "12011",
        name: "Відділення №1",
        number: "1",
        type: "PostBranch",
      },
    ]);

    expect(authRequestCount).toBe(1);
    expect(authApiKeys).toEqual(["test-nova-key"]);
    expect(authHeaders).toEqual([`Bearer ${currentJwt}`, `Bearer ${currentJwt}`]);
  });

  it("refreshes the JWT after the cached token expires", async () => {
    let currentTime = now;
    const carrier = createCarrier({
      cacheTtlMs: 1_000,
      now: () => currentTime,
      refreshSkewMs: 0,
    });

    await carrier.searchCities({ query: "Київ" });
    currentJwt = createJwt(
      "jwt-b",
      Math.floor((now.getTime() + 120_000) / 1_000),
    );
    currentTime = new Date(now.getTime() + 1_500);
    await carrier.searchWarehouses({ cityId: "118064" });

    expect(authRequestCount).toBe(2);
    expect(authHeaders).toEqual([
      expect.stringContaining("jwt-a"),
      expect.stringContaining("jwt-b"),
    ]);
  });

  it("creates a shipment and maps document id, tracking number, and label reference", async () => {
    const carrier = createCarrier();

    await expect(
      carrier.createShipment({
        carrier: "NOVA_POSHTA",
        declaredValueMinor: 1_200_00,
        description: "Замовлення Dase",
        orderId: "order-1",
        recipient: {
          cityId: "118064",
          cityName: "Київ",
          fullName: "Олена Петренко",
          phone: "+380671234567",
          warehouseId: "12011",
          warehouseName: "Відділення №1",
        },
      }),
    ).resolves.toEqual({
      carrierShipmentId: "56abe014-451c-11f0-a1d5-48df37b921da",
      labelUrl:
        "https://nova.test/v.1.0/shipments/print?type=marking&numbers%5B%5D=51187918711526",
      trackingNumber: "51187918711526",
    });
    expect(shipmentRequests[0]).toMatchObject({
      payerType: "Recipient",
      recipient: {
        countryCode: "UA",
        divisionId: "12011",
        name: "Олена Петренко",
        phone: "380671234567",
      },
      sender: {
        countryCode: "UA",
        divisionId: "11759",
        name: "Тестова Тетяна",
        phone: "380007654321",
      },
      status: "ReadyToShip",
    });
  });

  it("maps tracking statuses to internal shipment statuses", async () => {
    const carrier = createCarrier();

    trackingCode = "9";
    trackingText = "Отримано";
    await expect(
      carrier.getShipmentStatus({ trackingNumber: "51187918711526" }),
    ).resolves.toMatchObject({ status: "DELIVERED", statusText: "Отримано" });

    trackingCode = "103";
    trackingText = "Відмова";
    await expect(
      carrier.getShipmentStatus({ trackingNumber: "51187918711526" }),
    ).resolves.toMatchObject({ status: "RETURNED" });

    trackingCode = "2";
    trackingText = "Видалено";
    await expect(
      carrier.getShipmentStatus({ trackingNumber: "51187918711526" }),
    ).resolves.toMatchObject({ status: "CANCELLED" });

    trackingCode = "777";
    trackingText = "Невідомо";
    await expect(
      carrier.getShipmentStatus({ trackingNumber: "51187918711526" }),
    ).resolves.toMatchObject({ status: "PENDING" });
  });

  it("maps provider errors to safe carrier errors", async () => {
    const carrier = createCarrier();

    await expect(
      carrier.searchCities({ query: "provider-error" }),
    ).rejects.toMatchObject({
      message: "Nova Post request failed with 422",
      name: "ShippingCarrierApiError",
    });
  });

  it("does not log API keys or JWT tokens on failures", async () => {
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => undefined);
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const carrier = createCarrier({ apiKey: "secret-api-key" });

    server.use(
      http.get(`${novaPostBaseUrl}clients/authorization`, () =>
        HttpResponse.json({ error: "bad key" }, { status: 401 }),
      ),
    );

    await expect(carrier.searchCities({ query: "Київ" })).rejects.toThrow(
      "Nova Post authorization failed with 401",
    );
    expect(logSpy).not.toHaveBeenCalled();
    expect(warnSpy).not.toHaveBeenCalled();
    expect(errorSpy).not.toHaveBeenCalled();
  });

  it("blocks shipment creation before live calls when sender config is missing", async () => {
    const fetchImpl = vi.fn<typeof fetch>();
    const carrier = new NovaPostShippingCarrier({
      apiKey: "test-nova-key",
      baseUrl: novaPostBaseUrl,
      fetchImpl,
    });

    await expect(
      carrier.createShipment({
        carrier: "NOVA_POSHTA",
        declaredValueMinor: 1_200_00,
        description: "Замовлення Dase",
        orderId: "order-1",
        recipient: {
          cityId: "118064",
          cityName: "Київ",
          fullName: "Олена Петренко",
          phone: "+380671234567",
          warehouseId: "12011",
          warehouseName: "Відділення №1",
        },
      }),
    ).rejects.toBeInstanceOf(NovaPostShipmentConfigurationError);
    expect(fetchImpl).not.toHaveBeenCalled();
  });
});

function createCarrier(
  input: {
    apiKey?: string;
    cacheTtlMs?: number;
    now?: () => Date;
    refreshSkewMs?: number;
  } = {},
) {
  return new NovaPostShippingCarrier({
    apiKey: input.apiKey ?? "test-nova-key",
    baseUrl: novaPostBaseUrl,
    cacheTtlMs: input.cacheTtlMs,
    now: input.now,
    refreshSkewMs: input.refreshSkewMs,
    sender: {
      countryCode: "UA",
      divisionId: "11759",
      name: "Тестова Тетяна",
      phone: "380007654321",
    },
    shipmentDefaults: {
      actualWeightGrams: 2_000,
      heightMm: 100,
      lengthMm: 300,
      volumetricWeightGrams: 1_500,
      widthMm: 200,
    },
  });
}

function createJwt(id: string, exp: number): string {
  return [
    encodeBase64Url({ alg: "HS256", typ: "JWT" }),
    encodeBase64Url({ exp, jti: id }),
    id,
  ].join(".");
}

function encodeBase64Url(value: Record<string, unknown>): string {
  return Buffer.from(JSON.stringify(value))
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}
