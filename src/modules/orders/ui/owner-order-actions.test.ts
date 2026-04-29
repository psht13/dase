import { revalidatePath } from "next/cache";
import { getAuditEventRepository } from "@/modules/orders/infrastructure/audit-event-repository-factory";
import { getOrderRepository } from "@/modules/orders/infrastructure/order-repository-factory";
import { getOrderTagRepository } from "@/modules/orders/infrastructure/order-tag-repository-factory";
import {
  createAndAssignOrderTagAction,
  updateOwnerOrderStatusAction,
} from "@/modules/orders/ui/owner-order-actions";
import { requireOwnerSession } from "@/modules/users/ui/require-owner-session";

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

vi.mock("@/modules/users/ui/require-owner-session", () => ({
  requireOwnerSession: vi.fn(),
}));

vi.mock("@/modules/orders/infrastructure/audit-event-repository-factory", () => ({
  getAuditEventRepository: vi.fn(),
}));

vi.mock("@/modules/orders/infrastructure/order-repository-factory", () => ({
  getOrderRepository: vi.fn(),
}));

vi.mock("@/modules/orders/infrastructure/order-tag-repository-factory", () => ({
  getOrderTagRepository: vi.fn(),
}));

describe("owner order actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(requireOwnerSession).mockResolvedValue({
      email: "owner@example.com",
      id: "owner-1",
      name: "Власниця",
      role: "owner",
    });
    vi.mocked(getAuditEventRepository).mockReturnValue({
      append: vi.fn(async (event) => ({
        ...event,
        createdAt: new Date("2026-04-30T10:00:00.000Z"),
        id: "event-1",
      })),
      listForOrder: vi.fn(),
    } as never);
    vi.mocked(getOrderRepository).mockReturnValue({
      confirmCustomerDelivery: vi.fn(),
      create: vi.fn(),
      findById: vi.fn(async () => ({
        confirmedAt: null,
        createdAt: new Date("2026-04-30T10:00:00.000Z"),
        currency: "UAH",
        customerId: null,
        id: "order-1",
        items: [],
        ownerId: "owner-1",
        publicToken: "secure-public-token",
        publicTokenExpiresAt: new Date("2026-05-14T10:00:00.000Z"),
        sentAt: new Date("2026-04-30T10:00:00.000Z"),
        status: "SENT_TO_CUSTOMER",
        totalMinor: 2_400_00,
        updatedAt: new Date("2026-04-30T10:00:00.000Z"),
      })),
      findByPublicToken: vi.fn(),
      listByOwnerId: vi.fn(),
      updateStatus: vi.fn(),
    } as never);
    vi.mocked(getOrderTagRepository).mockReturnValue({
      findByIdForOwner: vi.fn(),
      findByNameForOwner: vi.fn(async () => null),
      linkToOrder: vi.fn(),
      listForOrder: vi.fn(),
      listForOwner: vi.fn(),
      save: vi.fn(async (tag) => ({
        ...tag,
        createdAt: new Date("2026-04-30T10:00:00.000Z"),
        id: "tag-1",
        updatedAt: new Date("2026-04-30T10:00:00.000Z"),
      })),
      unlinkFromOrder: vi.fn(),
    } as never);
  });

  it("returns Ukrainian success and revalidates order pages after tag creation", async () => {
    const formData = new FormData();
    formData.set("tagName", "Подарунок");

    await expect(
      createAndAssignOrderTagAction("order-1", formData),
    ).resolves.toEqual({
      message: "Тег додано до замовлення",
      ok: true,
    });
    expect(revalidatePath).toHaveBeenCalledWith("/dashboard/orders");
    expect(revalidatePath).toHaveBeenCalledWith("/dashboard/orders/order-1");
  });

  it("returns Ukrainian validation feedback for invalid tag names", async () => {
    const formData = new FormData();
    formData.set("tagName", "x");

    await expect(
      createAndAssignOrderTagAction("order-1", formData),
    ).resolves.toEqual({
      message: "Назва тегу має містити від 2 до 40 символів",
      ok: false,
    });
  });

  it("returns Ukrainian feedback for forbidden status transitions", async () => {
    const formData = new FormData();
    formData.set("status", "PAID");

    await expect(updateOwnerOrderStatusAction("order-1", formData)).resolves.toEqual({
      message: "Такий перехід статусу недоступний",
      ok: false,
    });
  });
});
