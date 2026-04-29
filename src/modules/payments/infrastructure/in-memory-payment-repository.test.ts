import { InMemoryPaymentRepository } from "@/modules/payments/infrastructure/in-memory-payment-repository";

describe("InMemoryPaymentRepository", () => {
  it("saves and lists payments by order", async () => {
    const repository = new InMemoryPaymentRepository();

    await repository.save({
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

    await expect(repository.findByOrderId("order-1")).resolves.toEqual([
      expect.objectContaining({
        amountMinor: 1_200_00,
        provider: "CASH_ON_DELIVERY",
      }),
    ]);
    await expect(repository.findByOrderId("other-order")).resolves.toEqual([]);
  });
});
