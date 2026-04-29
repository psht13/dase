import { GET } from "@/app/api/carriers/cities/route";
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

describe("GET /api/carriers/cities", () => {
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
      searchCities: vi.fn(async () => [
        { id: "city-1", name: "Київ", region: "Київська область" },
      ]),
      searchWarehouses: vi.fn(),
    } as never);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("returns internal city DTOs", async () => {
    const response = await GET(
      new Request(
        "https://dase.test/api/carriers/cities?carrier=NOVA_POSHTA&query=Київ",
      ),
    );

    await expect(response.json()).resolves.toEqual({
      cities: [{ id: "city-1", name: "Київ", region: "Київська область" }],
    });
  });

  it("rejects unsupported carriers with Ukrainian feedback", async () => {
    const response = await GET(
      new Request("https://dase.test/api/carriers/cities?carrier=OTHER"),
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      message: "Службу доставки не підтримано",
    });
  });
});
