import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import type { PersistedOrder } from "@/modules/orders/application/order-repository";
import { getAuditEventRepository } from "@/modules/orders/infrastructure/audit-event-repository-factory";
import { getCustomerRepository } from "@/modules/orders/infrastructure/customer-repository-factory";
import { getOrderRepository } from "@/modules/orders/infrastructure/order-repository-factory";
import { confirmDeliveryAction } from "@/modules/orders/ui/delivery-actions";
import { deliveryFormValuesToFormData } from "@/modules/orders/ui/delivery-form-data";
import { getMonobankPaymentProvider } from "@/modules/payments/infrastructure/payment-provider-factory";
import { getPaymentRepository } from "@/modules/payments/infrastructure/payment-repository-factory";
import { getShipmentJobQueue } from "@/modules/shipping/infrastructure/shipment-job-queue-factory";
import { getShipmentRepository } from "@/modules/shipping/infrastructure/shipment-repository-factory";

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

vi.mock("next/headers", () => ({
  headers: vi.fn(),
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

vi.mock("@/modules/payments/infrastructure/payment-provider-factory", () => ({
  getMonobankPaymentProvider: vi.fn(),
}));

vi.mock("@/modules/shipping/infrastructure/shipment-repository-factory", () => ({
  getShipmentRepository: vi.fn(),
}));

vi.mock("@/modules/shipping/infrastructure/shipment-job-queue-factory", () => ({
  getShipmentJobQueue: vi.fn(),
}));

const validToken = "secure_public_token_123456789012345";
const now = new Date("2026-04-30T10:00:00.000Z");

describe("confirmDeliveryAction", () => {
  beforeEach(() => {
    let currentOrder = createOrder();
    let savedPayment: Awaited<
      ReturnType<ReturnType<typeof getPaymentRepository>["save"]>
    > | null = null;
    let savedShipment: Awaited<
      ReturnType<ReturnType<typeof getShipmentRepository>["save"]>
    > | null = null;

    vi.mocked(headers).mockResolvedValue(
      new Headers({
        host: "dase.test",
        "x-forwarded-proto": "https",
      }) as never,
    );
    vi.mocked(getAuditEventRepository).mockReturnValue({
      append: vi.fn(async (event) => ({
        ...event,
        createdAt: now,
        id: "event-1",
      })),
      listForOrder: vi.fn(),
    } as never);
    vi.mocked(getCustomerRepository).mockReturnValue({
      findById: vi.fn(),
      save: vi.fn(async (input) => ({
        ...input,
        createdAt: now,
        email: null,
        id: "customer-1",
        updatedAt: now,
      })),
    } as never);
    vi.mocked(getOrderRepository).mockReturnValue({
      confirmCustomerDelivery: vi.fn(async (input) => {
        currentOrder = {
          ...currentOrder,
          confirmedAt: input.confirmedAt,
          customerId: input.customerId,
          status: "CONFIRMED_BY_CUSTOMER",
        };
      }),
      listByOwnerId: vi.fn(async (ownerId: string) =>
        currentOrder.ownerId === ownerId ? [currentOrder] : [],
      ),
      findById: vi.fn(async () => currentOrder),
      findByPublicToken: vi.fn(async () => currentOrder),
      updateStatus: vi.fn(async (_orderId, status) => {
        currentOrder = {
          ...currentOrder,
          status,
        };
      }),
    } as never);
    vi.mocked(getPaymentRepository).mockReturnValue({
      findByOrderId: vi.fn(async () => (savedPayment ? [savedPayment] : [])),
      findByProviderInvoiceId: vi.fn(),
      save: vi.fn(async (payment) => {
        savedPayment = {
          ...payment,
          createdAt: now,
          id: "payment-1",
          updatedAt: now,
        };

        return savedPayment;
      }),
      updateProviderInvoice: vi.fn(),
      updateStatus: vi.fn(),
    } as never);
    vi.mocked(getMonobankPaymentProvider).mockReturnValue({
      createInvoice: vi.fn(),
      getInvoiceStatus: vi.fn(),
      verifyWebhook: vi.fn(),
    } as never);
    vi.mocked(getShipmentJobQueue).mockReturnValue({
      enqueueAutoCompleteDeliveredOrder: vi.fn(),
      enqueueCreateShipment: vi.fn(async () => "job-1"),
      enqueueSyncShipmentStatus: vi.fn(),
    } as never);
    vi.mocked(getShipmentRepository).mockReturnValue({
      findByOrderId: vi.fn(async () => (savedShipment ? [savedShipment] : [])),
      save: vi.fn(async (shipment) => {
        savedShipment = {
          ...shipment,
          createdAt: now,
          id: "shipment-1",
          updatedAt: now,
        };

        return savedShipment;
      }),
      updateCreation: vi.fn(),
      updateStatus: vi.fn(),
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
      message: "Замовлення підтверджено. Оплата при отриманні.",
      ok: true,
    });
    expect(revalidatePath).toHaveBeenCalledWith(`/o/${validToken}`);
    expect(revalidatePath).toHaveBeenCalledWith(`/o/${validToken}/delivery`);
    expect(getMonobankPaymentProvider).not.toHaveBeenCalled();
  });

  it("creates a MonoPay invoice and returns a payment redirect URL", async () => {
    const savedPayment = {
      amountMinor: 2_400_00,
      createdAt: now,
      currency: "UAH",
      failureReason: null,
      id: "payment-1",
      orderId: "order-1",
      paidAt: null,
      provider: "MONOBANK" as const,
      providerInvoiceId: null,
      providerModifiedAt: null,
      status: "PENDING" as const,
      updatedAt: now,
    };
    const paymentRepository = {
      findByOrderId: vi.fn(async () => [savedPayment]),
      findByProviderInvoiceId: vi.fn(),
      save: vi.fn(async () => savedPayment),
      updateProviderInvoice: vi.fn(async (input) => ({
        ...savedPayment,
        providerInvoiceId: input.providerInvoiceId,
        providerModifiedAt: input.providerModifiedAt,
      })),
      updateStatus: vi.fn(),
    };
    const paymentProvider = {
      createInvoice: vi.fn(async () => ({
        invoiceId: "invoice-1",
        pageUrl: "https://pay.test/invoice-1",
        providerModifiedAt: null,
      })),
      getInvoiceStatus: vi.fn(),
      verifyWebhook: vi.fn(),
    };

    vi.mocked(getPaymentRepository).mockReturnValue(paymentRepository as never);
    vi.mocked(getMonobankPaymentProvider).mockReturnValue(
      paymentProvider as never,
    );

    await expect(
      confirmDeliveryAction(
        validToken,
        createFormData({ paymentMethod: "MONOBANK" }),
      ),
    ).resolves.toEqual({
      message: "Замовлення підтверджено. Переходимо до оплати MonoPay.",
      ok: true,
      paymentRedirectUrl: "https://pay.test/invoice-1",
    });
    expect(paymentProvider.createInvoice).toHaveBeenCalledWith(
      expect.objectContaining({
        redirectUrl: `https://dase.test/o/${validToken}`,
        webhookUrl: "https://dase.test/api/webhooks/monobank",
      }),
    );
  });

  it("returns Ukrainian feedback when the public link is unavailable", async () => {
    vi.mocked(getOrderRepository).mockReturnValue({
      confirmCustomerDelivery: vi.fn(),
      findById: vi.fn(),
      findByPublicToken: vi.fn(async () => null),
      listByOwnerId: vi.fn(),
      updateStatus: vi.fn(),
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
      findById: vi.fn(),
      findByPublicToken: vi.fn(async () =>
        createOrder({ status: "PAYMENT_PENDING" }),
      ),
      listByOwnerId: vi.fn(),
      updateStatus: vi.fn(),
    } as never);

    await expect(
      confirmDeliveryAction(validToken, createFormData()),
    ).resolves.toEqual({
      message: "Замовлення вже не можна підтвердити",
      ok: false,
    });
  });
});

function createFormData(input: { paymentMethod?: "CASH_ON_DELIVERY" | "MONOBANK" } = {}) {
  return deliveryFormValuesToFormData({
    carrier: "NOVA_POSHTA",
    cityId: "city-1",
    cityName: "Київ",
    fullName: "Олена Петренко",
    paymentMethod: input.paymentMethod ?? "CASH_ON_DELIVERY",
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
