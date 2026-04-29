import { InMemoryAuditEventRepository } from "@/modules/orders/infrastructure/in-memory-audit-event-repository";
import { InMemoryOrderRepository } from "@/modules/orders/infrastructure/in-memory-order-repository";
import type { PaymentProvider } from "@/modules/payments/application/payment-provider";
import { processMonobankWebhookUseCase } from "@/modules/payments/application/process-monobank-webhook";
import { InMemoryPaymentRepository } from "@/modules/payments/infrastructure/in-memory-payment-repository";
import { InMemoryWebhookEventRepository } from "@/modules/payments/infrastructure/in-memory-webhook-event-repository";
import { InMemoryShipmentJobQueue } from "@/modules/shipping/infrastructure/in-memory-shipment-job-queue";
import { InMemoryShipmentRepository } from "@/modules/shipping/infrastructure/in-memory-shipment-repository";

const now = new Date("2026-04-30T10:00:00.000Z");

describe("processMonobankWebhookUseCase", () => {
  it("updates payment and order status for successful Monobank payments", async () => {
    const dependencies = await createDependencies();

    await expect(
      processMonobankWebhookUseCase(createWebhookInput(), dependencies),
    ).resolves.toMatchObject({
      outcome: "processed",
      paymentStatus: "PAID",
    });

    await expect(
      dependencies.paymentRepository.findByProviderInvoiceId(
        "MONOBANK",
        "invoice-1",
      ),
    ).resolves.toMatchObject({
      paidAt: new Date("2026-04-30T12:00:00.000Z"),
      status: "PAID",
    });
    await expect(
      dependencies.orderRepository.findById("order-1"),
    ).resolves.toMatchObject({
      status: "SHIPMENT_PENDING",
    });
    expect(dependencies.shipmentJobQueue.createShipmentJobs).toHaveLength(1);
    expect(dependencies.shipmentJobQueue.createShipmentJobs[0]).toMatchObject({
      orderId: "order-1",
      requestedBy: "system",
    });
  });

  it("stores webhook events idempotently", async () => {
    const dependencies = await createDependencies();
    const updateStatusSpy = vi.spyOn(
      dependencies.paymentRepository,
      "updateStatus",
    );

    await processMonobankWebhookUseCase(createWebhookInput(), dependencies);
    await expect(
      processMonobankWebhookUseCase(createWebhookInput(), dependencies),
    ).resolves.toMatchObject({
      outcome: "duplicate",
    });
    expect(updateStatusSpy).toHaveBeenCalledTimes(1);
  });

  it("ignores stale webhook events by provider modified date", async () => {
    const dependencies = await createDependencies({
      initialOrderStatus: "PAID",
      initialPaymentModifiedAt: new Date("2026-04-30T12:00:00.000Z"),
      initialPaymentStatus: "PAID",
      providerStatus: "failure",
      providerStatusModifiedAt: new Date("2026-04-30T11:00:00.000Z"),
    });

    await expect(
      processMonobankWebhookUseCase(createWebhookInput(), dependencies),
    ).resolves.toMatchObject({
      outcome: "stale",
      paymentStatus: "PAID",
    });
    await expect(
      dependencies.paymentRepository.findByProviderInvoiceId(
        "MONOBANK",
        "invoice-1",
      ),
    ).resolves.toMatchObject({
      status: "PAID",
    });
  });

  it("moves failed payments to the Ukrainian order payment failure state", async () => {
    const dependencies = await createDependencies({
      providerFailureReason: "Недостатньо коштів",
      providerStatus: "failure",
    });

    await expect(
      processMonobankWebhookUseCase(createWebhookInput(), dependencies),
    ).resolves.toMatchObject({
      outcome: "processed",
      paymentStatus: "FAILED",
    });
    await expect(
      dependencies.paymentRepository.findByProviderInvoiceId(
        "MONOBANK",
        "invoice-1",
      ),
    ).resolves.toMatchObject({
      failureReason: "Недостатньо коштів",
      status: "FAILED",
    });
    await expect(
      dependencies.orderRepository.findById("order-1"),
    ).resolves.toMatchObject({
      status: "PAYMENT_FAILED",
    });
  });
});

type DependencyInput = {
  initialOrderStatus?: "PAYMENT_PENDING" | "PAID";
  initialPaymentModifiedAt?: Date | null;
  initialPaymentStatus?: "PENDING" | "PAID";
  providerFailureReason?: string | null;
  providerStatus?: string;
  providerStatusModifiedAt?: Date;
};

async function createDependencies(input: DependencyInput = {}) {
  const orderRepository = new InMemoryOrderRepository();
  const paymentRepository = new InMemoryPaymentRepository();
  const shipmentJobQueue = new InMemoryShipmentJobQueue();
  const shipmentRepository = new InMemoryShipmentRepository();
  const webhookEventRepository = new InMemoryWebhookEventRepository();
  const auditEventRepository = new InMemoryAuditEventRepository();
  const providerStatusModifiedAt =
    input.providerStatusModifiedAt ??
    new Date("2026-04-30T12:00:00.000Z");

  await orderRepository.create({
    items: [],
    ownerId: "owner-1",
    publicToken: "secure_public_token_123456789012345",
    publicTokenExpiresAt: new Date("2026-05-14T10:00:00.000Z"),
    sentAt: now,
    status: input.initialOrderStatus ?? "PAYMENT_PENDING",
    totalMinor: 2_400_00,
  });
  await paymentRepository.save({
    amountMinor: 2_400_00,
    currency: "UAH",
    failureReason: null,
    orderId: "order-1",
    paidAt: null,
    provider: "MONOBANK",
    providerInvoiceId: "invoice-1",
    providerModifiedAt: input.initialPaymentModifiedAt ?? null,
    status: input.initialPaymentStatus ?? "PENDING",
  });
  const savedShipment = await shipmentRepository.save({
    addressText: "Київ, Відділення №1",
    carrier: "NOVA_POSHTA",
    carrierOfficeId: "warehouse-1",
    carrierPayload: { warehouseName: "Відділення №1" },
    carrierShipmentId: null,
    cityName: "Київ",
    cityRef: "city-1",
    deliveredAt: null,
    labelUrl: null,
    orderId: "order-1",
    recipientCustomerId: "customer-1",
    status: "PENDING",
    trackingNumber: null,
  });

  const savedOrder = await orderRepository.findByPublicToken(
    "secure_public_token_123456789012345",
  );
  const savedPayment = await paymentRepository.findByProviderInvoiceId(
    "MONOBANK",
    "invoice-1",
  );

  if (!savedOrder || !savedPayment) {
    throw new Error("Failed to prepare payment webhook test fixtures");
  }

  return {
    auditEventRepository,
    now: () => now,
    orderRepository: {
      confirmCustomerDelivery: vi.fn(),
      create: vi.fn(),
      findById: vi.fn(async (orderId: string) => {
        void orderId;

        return {
          ...savedOrder,
          id: "order-1",
          status:
            (await orderRepository.findByPublicToken(
              "secure_public_token_123456789012345",
            ))?.status ?? savedOrder.status,
        };
      }),
      findByPublicToken: vi.fn(async () => savedOrder),
      listByOwnerId: vi.fn(async (ownerId: string) =>
        savedOrder.ownerId === ownerId ? [savedOrder] : [],
      ),
      updateStatus: vi.fn(async (orderId, status) => {
        void orderId;
        await orderRepository.updateStatus(savedOrder.id, status);
      }),
    },
    paymentProvider: createPaymentProvider({
      failureReason: input.providerFailureReason ?? null,
      modifiedAt: providerStatusModifiedAt,
      status: input.providerStatus ?? "success",
    }),
    paymentRepository: {
      findByOrderId: vi.fn(async () => {
        const currentPayment = await paymentRepository.findByProviderInvoiceId(
          "MONOBANK",
          "invoice-1",
        );

        return currentPayment ? [currentPayment] : [];
      }),
      findByProviderInvoiceId: vi.fn(
        async (provider: "MONOBANK", invoiceId: string) => {
          void provider;
          void invoiceId;

          return paymentRepository.findByProviderInvoiceId(
            "MONOBANK",
            "invoice-1",
          );
        },
      ),
      save: vi.fn(),
      updateProviderInvoice: vi.fn(),
      updateStatus: vi.fn(async (updateInput) =>
        paymentRepository.updateStatus({
          ...updateInput,
          paymentId: savedPayment.id,
        }),
      ),
    },
    shipmentJobQueue,
    shipmentRepository: {
      findByOrderId: vi.fn(async (orderId: string) => {
        void orderId;

        const shipments = await shipmentRepository.findByOrderId("order-1");

        return shipments.map((shipment) => ({
          ...shipment,
          id: savedShipment.id,
          orderId: "order-1",
        }));
      }),
      save: vi.fn(),
      updateCreation: vi.fn(),
      updateStatus: vi.fn(),
    },
    webhookEventRepository,
  };
}

function createPaymentProvider(input: {
  failureReason: string | null;
  modifiedAt: Date;
  status: string;
}): PaymentProvider {
  return {
    createInvoice: vi.fn(),
    getInvoiceStatus: vi.fn(),
    verifyWebhook: vi.fn(async () => ({
      amountMinor: 2_400_00,
      currency: "UAH",
      eventId: `invoice-1:${input.status}:${input.modifiedAt.toISOString()}`,
      failureReason: input.failureReason,
      invoiceId: "invoice-1",
      providerModifiedAt: input.modifiedAt,
      rawPayload: {
        invoiceId: "invoice-1",
        modifiedDate: input.modifiedAt.toISOString(),
        status: input.status,
      },
      rawStatus: input.status,
      reference: "order-1",
    })),
  };
}

function createWebhookInput() {
  return {
    rawBody: "{}",
    signature: "valid-signature",
  };
}
