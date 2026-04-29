import { InMemoryPaymentRepository } from "@/modules/payments/infrastructure/in-memory-payment-repository";

describe("InMemoryPaymentRepository", () => {
  it("saves and lists payments by order", async () => {
    const repository = new InMemoryPaymentRepository();

    const payment = await repository.save({
      amountMinor: 1_200_00,
      currency: "UAH",
      failureReason: null,
      orderId: "order-1",
      paidAt: null,
      provider: "CASH_ON_DELIVERY",
      providerInvoiceId: null,
      providerModifiedAt: null,
      status: "PENDING",
    });
    await repository.updateProviderInvoice({
      paymentId: payment.id,
      providerInvoiceId: "invoice-1",
      providerModifiedAt: null,
    });
    await repository.updateStatus({
      failureReason: null,
      paidAt: new Date("2026-04-30T12:00:00.000Z"),
      paymentId: payment.id,
      providerModifiedAt: new Date("2026-04-30T12:00:00.000Z"),
      status: "PAID",
    });

    await expect(repository.findByOrderId("order-1")).resolves.toEqual([
      expect.objectContaining({
        amountMinor: 1_200_00,
        providerInvoiceId: "invoice-1",
        provider: "CASH_ON_DELIVERY",
        status: "PAID",
      }),
    ]);
    await expect(
      repository.findByProviderInvoiceId("CASH_ON_DELIVERY", "invoice-1"),
    ).resolves.toMatchObject({ id: payment.id });
    await expect(repository.findByOrderId("other-order")).resolves.toEqual([]);
  });
});
