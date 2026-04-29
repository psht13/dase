import { GET } from "@/app/api/carriers/warehouses/route";
import { getCarrierDirectoryCacheRepository } from "@/modules/shipping/infrastructure/carrier-directory-cache-repository-factory";
import { getShippingCarrier } from "@/modules/shipping/infrastructure/shipping-carrier-factory";

vi.mock(
  "@/modules/shipping/infrastructure/carrier-directory-cache-repository-factory",
  () => ({
    getCarrierDirectoryCacheRepository: vi.fn(),
  }),
);

vi.mock("@/modules/shipping/infrastructure/shipping-carrier-factory", () => ({
  getShippingCarrier: vi.fn(),
}));

describe("GET /api/carriers/warehouses", () => {
  beforeEach(() => {
    vi.mocked(getCarrierDirectoryCacheRepository).mockReturnValue({
      findFresh: vi.fn(async () => null),
      upsert: vi.fn(async (entry) => ({
        ...entry,
        createdAt: new Date("2026-04-30T10:00:00.000Z"),
        id: "cache-1",
        updatedAt: new Date("2026-04-30T10:00:00.000Z"),
      })),
    } as never);
    vi.mocked(getShippingCarrier).mockReturnValue({
      createShipment: vi.fn(),
      getShipmentStatus: vi.fn(),
      searchCities: vi.fn(),
      searchWarehouses: vi.fn(async () => [
        {
          address: "вул. Хрещатик, 1",
          cityId: "city-1",
          id: "warehouse-1",
          name: "Відділення №1",
          number: "1",
          type: "warehouse",
        },
      ]),
    } as never);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("returns internal warehouse DTOs", async () => {
    const response = await GET(
      new Request(
        "https://dase.test/api/carriers/warehouses?carrier=NOVA_POSHTA&cityId=city-1&query=1",
      ),
    );

    await expect(response.json()).resolves.toEqual({
      warehouses: [
        {
          address: "вул. Хрещатик, 1",
          cityId: "city-1",
          id: "warehouse-1",
          name: "Відділення №1",
          number: "1",
          type: "warehouse",
        },
      ],
    });
  });

  it("rejects unsupported carriers with Ukrainian feedback", async () => {
    const response = await GET(
      new Request("https://dase.test/api/carriers/warehouses?carrier=OTHER"),
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      message: "Службу доставки не підтримано",
    });
  });
});
