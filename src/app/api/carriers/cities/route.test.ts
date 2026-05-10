import { GET } from "@/app/api/carriers/cities/route";
import type { PersistedOrder } from "@/modules/orders/application/order-repository";
import { getOrderRepository } from "@/modules/orders/infrastructure/order-repository-factory";
import {
  publicDeliveryUnavailableMessage,
  ShippingCarrierSettingsUnavailableError,
} from "@/modules/shipping/application/shipping-carrier";
import { getCarrierDirectoryCacheRepository } from "@/modules/shipping/infrastructure/carrier-directory-cache-repository-factory";
import { ShippingCarrierApiError } from "@/modules/shipping/infrastructure/shipping-carrier-api-error";
import {
  resolveShippingCarrierForOwner,
} from "@/modules/shipping/infrastructure/shipping-carrier-factory";

vi.mock("@/modules/orders/infrastructure/order-repository-factory", () => ({
  getOrderRepository: vi.fn(),
}));

vi.mock(
  "@/modules/shipping/infrastructure/carrier-directory-cache-repository-factory",
  () => ({
    getCarrierDirectoryCacheRepository: vi.fn(),
  }),
);

vi.mock("@/modules/shipping/infrastructure/shipping-carrier-factory", () => ({
  resolveShippingCarrierForOwner: vi.fn(),
}));

describe("GET /api/carriers/cities", () => {
  beforeEach(() => {
    vi.mocked(getOrderRepository).mockReturnValue({
      findByPublicToken: vi.fn(async () => createOrder()),
    } as never);
    vi.mocked(getCarrierDirectoryCacheRepository).mockReturnValue({
      findFresh: vi.fn(async () => null),
      upsert: vi.fn(async (entry) => ({
        ...entry,
        createdAt: new Date("2026-04-30T10:00:00.000Z"),
        id: "cache-1",
        updatedAt: new Date("2026-04-30T10:00:00.000Z"),
      })),
    } as never);
    vi.mocked(resolveShippingCarrierForOwner).mockResolvedValue({
      cacheScopeKey: "owner-shipping-settings:owner-1:settings-1:2026-05-10",
      shippingCarrier: {
        createShipment: vi.fn(),
        getShipmentStatus: vi.fn(),
        searchCities: vi.fn(async () => [
          { id: "city-1", name: "Київ", region: "Київська область" },
        ]),
        searchWarehouses: vi.fn(),
      },
    } as never);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("uses public token to resolve the order owner before returning cities", async () => {
    const response = await GET(
      new Request(
        "https://dase.test/api/carriers/cities?carrier=NOVA_POSHTA&query=Київ&token=secure_public_token_123456789012345&ownerId=attacker-owner",
      ),
    );

    await expect(response.json()).resolves.toEqual({
      cities: [{ id: "city-1", name: "Київ", region: "Київська область" }],
    });
    expect(resolveShippingCarrierForOwner).toHaveBeenCalledWith(
      "NOVA_POSHTA",
      { ownerId: "owner-1" },
    );
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

  it("rejects disabled carriers with Ukrainian feedback", async () => {
    const response = await GET(
      new Request(
        "https://dase.test/api/carriers/cities?carrier=UKRPOSHTA&token=secure_public_token_123456789012345",
      ),
    );

    expect(response.status).toBe(400);
    expect(resolveShippingCarrierForOwner).not.toHaveBeenCalled();
    await expect(response.json()).resolves.toEqual({
      message: "Службу доставки тимчасово вимкнено",
    });
  });

  it("returns public-safe feedback when settings are missing", async () => {
    vi.mocked(resolveShippingCarrierForOwner).mockRejectedValue(
      new ShippingCarrierSettingsUnavailableError(),
    );

    const response = await GET(
      new Request(
        "https://dase.test/api/carriers/cities?carrier=NOVA_POSHTA&query=Київ&token=secure_public_token_123456789012345",
      ),
    );

    expect(response.status).toBe(503);
    await expect(response.json()).resolves.toEqual({
      message: publicDeliveryUnavailableMessage,
    });
  });

  it("maps provider errors to safe Ukrainian feedback", async () => {
    vi.mocked(resolveShippingCarrierForOwner).mockResolvedValue({
      cacheScopeKey: "owner-shipping-settings:owner-1:settings-1:2026-05-10",
      shippingCarrier: {
        createShipment: vi.fn(),
        getShipmentStatus: vi.fn(),
        searchCities: vi.fn(async () => {
          throw new ShippingCarrierApiError("provider raw failure");
        }),
        searchWarehouses: vi.fn(),
      },
    } as never);

    const response = await GET(
      new Request(
        "https://dase.test/api/carriers/cities?carrier=NOVA_POSHTA&query=Київ&token=secure_public_token_123456789012345",
      ),
    );

    expect(response.status).toBe(502);
    await expect(response.json()).resolves.toEqual({
      message: "Не вдалося завантажити міста. Спробуйте ще раз.",
    });
  });
});

function createOrder(): PersistedOrder {
  return {
    confirmedAt: null,
    createdAt: new Date("2026-05-10T10:00:00.000Z"),
    currency: "UAH",
    customerId: null,
    id: "order-1",
    items: [],
    ownerId: "owner-1",
    publicToken: "secure_public_token_123456789012345",
    publicTokenExpiresAt: new Date("2026-05-20T10:00:00.000Z"),
    sentAt: new Date("2026-05-10T10:00:00.000Z"),
    status: "SENT_TO_CUSTOMER",
    totalMinor: 2_400_00,
    updatedAt: new Date("2026-05-10T10:00:00.000Z"),
  };
}
