import {
  ManualCardPaymentCannotBeMarkedPaidError,
  ManualCardPaymentNotFoundError,
  markManualCardPaymentPaidUseCase,
} from "@/modules/payments/application/mark-manual-card-payment-paid";
import { InMemoryAuditEventRepository } from "@/modules/orders/infrastructure/in-memory-audit-event-repository";
import { InMemoryCustomerRepository } from "@/modules/orders/infrastructure/in-memory-customer-repository";
import { InMemoryOrderRepository } from "@/modules/orders/infrastructure/in-memory-order-repository";
import { InMemoryPaymentRepository } from "@/modules/payments/infrastructure/in-memory-payment-repository";
import { InMemoryShipmentJobQueue } from "@/modules/shipping/infrastructure/in-memory-shipment-job-queue";
import { InMemoryShipmentRepository } from "@/modules/shipping/infrastructure/in-memory-shipment-repository";

const now = new Date("2026-05-08T10:00:00.000Z");

describe("markManualCardPaymentPaidUseCase", () => {
  it("marks manual card payment paid, writes audit event, and enqueues shipment", async () => {
    const context = await createContext();

    await expect(
      markManualCardPaymentPaidUseCase(
        {
          orderId: context.order.id,
          ownerId: "owner-1",
        },
        {
          ...context,
          now: () => now,
        },
      ),
    ).resolves.toMatchObject({
      enqueuedShipment: true,
      orderId: context.order.id,
      paymentId: context.payment.id,
    });

    await expect(
      context.paymentRepository.findByOrderId(context.order.id),
    ).resolves.toEqual([
      expect.objectContaining({
        paidAt: now,
        provider: "MANUAL_CARD_TRANSFER",
        status: "PAID",
      }),
    ]);
    await expect(
      context.orderRepository.findById(context.order.id),
    ).resolves.toMatchObject({
      status: "SHIPMENT_PENDING",
    });
    await expect(
      context.auditEventRepository.listForOrder(context.order.id),
    ).resolves.toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          actorType: "OWNER",
          actorUserId: "owner-1",
          eventType: "MANUAL_PAYMENT_MARKED_PAID",
          payload: expect.objectContaining({
            paymentMethod: "MANUAL_CARD_TRANSFER",
            paymentStatus: "PAID",
            status: "PAID",
          }),
        }),
        expect.objectContaining({
          eventType: "SHIPMENT_CREATION_ENQUEUED",
        }),
      ]),
    );
    expect(context.shipmentJobQueue.createShipmentJobs).toEqual([
      expect.objectContaining({
        orderId: context.order.id,
        requestedBy: "owner",
        shipmentId: context.shipment.id,
      }),
    ]);
  });

  it("rejects orders owned by another owner", async () => {
    const context = await createContext();

    await expect(
      markManualCardPaymentPaidUseCase(
        {
          orderId: context.order.id,
          ownerId: "owner-2",
        },
        context,
      ),
    ).rejects.toBeInstanceOf(ManualCardPaymentNotFoundError);
    expect(context.shipmentJobQueue.createShipmentJobs).toHaveLength(0);
  });

  it("rejects manual card payments that are not pending", async () => {
    const context = await createContext({ paymentStatus: "PAID" });

    await expect(
      markManualCardPaymentPaidUseCase(
        {
          orderId: context.order.id,
          ownerId: "owner-1",
        },
        context,
      ),
    ).rejects.toBeInstanceOf(ManualCardPaymentCannotBeMarkedPaidError);
    expect(context.shipmentJobQueue.createShipmentJobs).toHaveLength(0);
  });
});

async function createContext(
  input: {
    paymentStatus?: "PAID" | "PENDING";
  } = {},
) {
  const auditEventRepository = new InMemoryAuditEventRepository();
  const customerRepository = new InMemoryCustomerRepository();
  const orderRepository = new InMemoryOrderRepository();
  const paymentRepository = new InMemoryPaymentRepository();
  const shipmentJobQueue = new InMemoryShipmentJobQueue();
  const shipmentRepository = new InMemoryShipmentRepository();
  const order = await orderRepository.create({
    items: [],
    ownerId: "owner-1",
    publicToken: "secure_public_token_123456789012345",
    publicTokenExpiresAt: new Date("2026-05-14T10:00:00.000Z"),
    sentAt: now,
    status: "PAYMENT_PENDING",
    totalMinor: 2_400_00,
  });
  const customer = await customerRepository.save({
    fullName: "Олена Петренко",
    instagramUsername: "olena.shop",
    phone: "+380671234567",
  });
  const payment = await paymentRepository.save({
    amountMinor: 2_400_00,
    currency: "UAH",
    failureReason: null,
    orderId: order.id,
    paidAt: input.paymentStatus === "PAID" ? now : null,
    provider: "MANUAL_CARD_TRANSFER",
    providerInvoiceId: null,
    providerModifiedAt: null,
    status: input.paymentStatus ?? "PENDING",
  });
  const shipment = await shipmentRepository.save({
    addressText: "Київ, Відділення №1",
    carrier: "NOVA_POSHTA",
    carrierOfficeId: "warehouse-1",
    carrierPayload: { paymentMethod: "MANUAL_CARD_TRANSFER" },
    carrierShipmentId: null,
    cityName: "Київ",
    cityRef: "city-1",
    deliveredAt: null,
    labelUrl: null,
    orderId: order.id,
    recipientCustomerId: customer.id,
    status: "PENDING",
    trackingNumber: null,
  });

  return {
    auditEventRepository,
    order,
    orderRepository,
    payment,
    paymentRepository,
    shipment,
    shipmentJobQueue,
    shipmentRepository,
  };
}
