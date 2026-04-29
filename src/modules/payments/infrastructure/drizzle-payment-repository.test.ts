import { DrizzlePaymentRepository } from "@/modules/payments/infrastructure/drizzle-payment-repository";

function createWhereResultChain<T>(result: T) {
  const chain = {
    from: vi.fn(() => chain),
    where: vi.fn(async () => result),
  };

  return chain;
}

function createLimitResultChain<T>(result: T) {
  const chain = {
    from: vi.fn(() => chain),
    limit: vi.fn(async () => result),
    where: vi.fn(() => chain),
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
      select: vi.fn(() => createWhereResultChain([payment])),
    };
    const repository = new DrizzlePaymentRepository(db as never);

    await expect(repository.findByOrderId("order-1")).resolves.toEqual([
      expect.objectContaining({ id: "payment-1" }),
    ]);
  });

  it("finds payments by provider invoice id", async () => {
    const db = {
      select: vi.fn(() =>
        createLimitResultChain([{ ...payment, providerInvoiceId: "invoice-1" }]),
      ),
    };
    const repository = new DrizzlePaymentRepository(db as never);

    await expect(
      repository.findByProviderInvoiceId("CASH_ON_DELIVERY", "invoice-1"),
    ).resolves.toMatchObject({
      providerInvoiceId: "invoice-1",
    });
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

  it("updates provider invoice ids and statuses", async () => {
    const returningInvoice = vi.fn(async () => [
      { ...payment, providerInvoiceId: "invoice-1" },
    ]);
    const returningStatus = vi.fn(async () => [
      {
        ...payment,
        paidAt: new Date("2026-04-30T12:00:00.000Z"),
        providerModifiedAt: new Date("2026-04-30T12:00:00.000Z"),
        status: "PAID",
      },
    ]);
    const whereInvoice = vi.fn(() => ({ returning: returningInvoice }));
    const whereStatus = vi.fn(() => ({ returning: returningStatus }));
    const set = vi
      .fn()
      .mockReturnValueOnce({ where: whereInvoice })
      .mockReturnValueOnce({ where: whereStatus });
    const db = {
      update: vi.fn(() => ({ set })),
    };
    const repository = new DrizzlePaymentRepository(db as never);

    await expect(
      repository.updateProviderInvoice({
        paymentId: "payment-1",
        providerInvoiceId: "invoice-1",
        providerModifiedAt: null,
      }),
    ).resolves.toMatchObject({
      providerInvoiceId: "invoice-1",
    });
    await expect(
      repository.updateStatus({
        failureReason: null,
        paidAt: new Date("2026-04-30T12:00:00.000Z"),
        paymentId: "payment-1",
        providerModifiedAt: new Date("2026-04-30T12:00:00.000Z"),
        status: "PAID",
      }),
    ).resolves.toMatchObject({
      status: "PAID",
    });
  });
});
