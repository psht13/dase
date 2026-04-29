import { DrizzlePaymentRepository } from "@/modules/payments/infrastructure/drizzle-payment-repository";

function createSelectChain<T>(result: T) {
  const chain = {
    from: vi.fn(() => chain),
    where: vi.fn(async () => result),
  };

  return chain;
}

describe("DrizzlePaymentRepository", () => {
  const now = new Date("2026-04-30T10:00:00.000Z");
  const payment = {
    amountMinor: 1_200_00,
    createdAt: now,
    currency: "UAH",
    failureReason: null,
    id: "payment-1",
    orderId: "order-1",
    paidAt: null,
    provider: "CASH_ON_DELIVERY",
    providerInvoiceId: null,
    providerModifiedAt: null,
    status: "PENDING",
    updatedAt: now,
  } as const;

  it("finds payments by order id", async () => {
    const db = {
      select: vi.fn(() => createSelectChain([payment])),
    };
    const repository = new DrizzlePaymentRepository(db as never);

    await expect(repository.findByOrderId("order-1")).resolves.toEqual([
      expect.objectContaining({ id: "payment-1" }),
    ]);
  });

  it("saves payment rows", async () => {
    const returning = vi.fn(async () => [payment]);
    const values = vi.fn(() => ({ returning }));
    const db = {
      insert: vi.fn(() => ({ values })),
    };
    const repository = new DrizzlePaymentRepository(db as never);

    await expect(
      repository.save({
        amountMinor: 1_200_00,
        currency: "UAH",
        failureReason: null,
        orderId: "order-1",
        paidAt: null,
        provider: "CASH_ON_DELIVERY",
        providerInvoiceId: null,
        providerModifiedAt: null,
        status: "PENDING",
      }),
    ).resolves.toMatchObject({ id: "payment-1" });
    expect(values).toHaveBeenCalledWith(
      expect.objectContaining({ orderId: "order-1" }),
    );
  });
});
