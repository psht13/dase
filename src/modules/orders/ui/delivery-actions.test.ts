import { revalidatePath } from "next/cache";
import type { PersistedOrder } from "@/modules/orders/application/order-repository";
import { getAuditEventRepository } from "@/modules/orders/infrastructure/audit-event-repository-factory";
import { getCustomerRepository } from "@/modules/orders/infrastructure/customer-repository-factory";
import { getOrderRepository } from "@/modules/orders/infrastructure/order-repository-factory";
import { confirmDeliveryAction } from "@/modules/orders/ui/delivery-actions";
import { deliveryFormValuesToFormData } from "@/modules/orders/ui/delivery-form-data";
import { getPaymentRepository } from "@/modules/payments/infrastructure/payment-repository-factory";
import { getShipmentRepository } from "@/modules/shipping/infrastructure/shipment-repository-factory";

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

vi.mock("@/modules/orders/infrastructure/audit-event-repository-factory", () => ({
  getAuditEventRepository: vi.fn(),
}));

vi.mock("@/modules/orders/infrastructure/customer-repository-factory", () => ({
  getCustomerRepository: vi.fn(),
}));

vi.mock("@/modules/orders/infrastructure/order-repository-factory", () => ({
  getOrderRepository: vi.fn(),
}));

vi.mock("@/modules/payments/infrastructure/payment-repository-factory", () => ({
  getPaymentRepository: vi.fn(),
}));

vi.mock("@/modules/shipping/infrastructure/shipment-repository-factory", () => ({
  getShipmentRepository: vi.fn(),
}));

const validToken = "secure_public_token_123456789012345";
const now = new Date("2026-04-30T10:00:00.000Z");

describe("confirmDeliveryAction", () => {
  beforeEach(() => {
    vi.mocked(getAuditEventRepository).mockReturnValue({
      append: vi.fn(async (event) => ({
        ...event,
        createdAt: now,
        id: "event-1",
      })),
      listForOrder: vi.fn(),
    } as never);
    vi.mocked(getCustomerRepository).mockReturnValue({
      save: vi.fn(async (input) => ({
        ...input,
        createdAt: now,
        email: null,
        id: "customer-1",
        updatedAt: now,
      })),
    } as never);
    vi.mocked(getOrderRepository).mockReturnValue({
      confirmCustomerDelivery: vi.fn(),
      findByPublicToken: vi.fn(async () => createOrder()),
    } as never);
    vi.mocked(getPaymentRepository).mockReturnValue({
      save: vi.fn(async (payment) => ({
        ...payment,
        createdAt: now,
        id: "payment-1",
        updatedAt: now,
      })),
    } as never);
    vi.mocked(getShipmentRepository).mockReturnValue({
      save: vi.fn(async (shipment) => ({
        ...shipment,
        createdAt: now,
        id: "shipment-1",
        updatedAt: now,
      })),
    } as never);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("returns Ukrainian validation errors", async () => {
    await expect(confirmDeliveryAction(validToken, new FormData())).resolves.toMatchObject({
      fieldErrors: expect.objectContaining({
        fullName: ["Вкажіть ім’я та прізвище"],
      }),
      message: "Перевірте дані доставки",
      ok: false,
    });
  });

  it("confirms delivery and revalidates public pages", async () => {
    await expect(
      confirmDeliveryAction(validToken, createFormData()),
    ).resolves.toEqual({
      message: "Замовлення підтверджено",
      ok: true,
    });
    expect(revalidatePath).toHaveBeenCalledWith(`/o/${validToken}`);
    expect(revalidatePath).toHaveBeenCalledWith(`/o/${validToken}/delivery`);
  });

  it("returns Ukrainian feedback when the public link is unavailable", async () => {
    vi.mocked(getOrderRepository).mockReturnValue({
      confirmCustomerDelivery: vi.fn(),
      findByPublicToken: vi.fn(async () => null),
    } as never);

    await expect(
      confirmDeliveryAction(validToken, createFormData()),
    ).resolves.toEqual({
      message: "Посилання недоступне або термін його дії завершився",
      ok: false,
    });
  });

  it("returns Ukrainian feedback when the order cannot be confirmed", async () => {
    vi.mocked(getOrderRepository).mockReturnValue({
      confirmCustomerDelivery: vi.fn(),
      findByPublicToken: vi.fn(async () =>
        createOrder({ status: "PAYMENT_PENDING" }),
      ),
    } as never);

    await expect(
      confirmDeliveryAction(validToken, createFormData()),
    ).resolves.toEqual({
      message: "Замовлення вже не можна підтвердити",
      ok: false,
    });
  });
});

function createFormData() {
  return deliveryFormValuesToFormData({
    carrier: "NOVA_POSHTA",
    cityId: "city-1",
    cityName: "Київ",
    fullName: "Олена Петренко",
    paymentMethod: "CASH_ON_DELIVERY",
    phone: "+380671234567",
    warehouseAddress: "вул. Хрещатик, 1",
    warehouseId: "warehouse-1",
    warehouseName: "Відділення №1",
  });
}

function createOrder(input: Partial<PersistedOrder> = {}): PersistedOrder {
  return {
    confirmedAt: null,
    createdAt: now,
    currency: "UAH",
    customerId: null,
    id: "order-1",
    items: [],
    ownerId: "owner-1",
    publicToken: validToken,
    publicTokenExpiresAt: new Date("2026-05-14T10:00:00.000Z"),
    sentAt: now,
    status: "SENT_TO_CUSTOMER",
    totalMinor: 2_400_00,
    updatedAt: now,
    ...input,
  };
}
