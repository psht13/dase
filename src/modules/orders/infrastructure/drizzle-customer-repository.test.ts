import { DrizzleCustomerRepository } from "@/modules/orders/infrastructure/drizzle-customer-repository";

describe("DrizzleCustomerRepository", () => {
  const now = new Date("2026-04-30T10:00:00.000Z");
  const customer = {
    createdAt: now,
    email: null,
    fullName: "Олена Петренко",
    id: "customer-1",
    phone: "+380671234567",
    updatedAt: now,
  };

  it("finds customer rows by id", async () => {
    const chain = {
      from: vi.fn(() => chain),
      limit: vi.fn(async () => [customer]),
      where: vi.fn(() => chain),
    };
    const db = {
      select: vi.fn(() => chain),
    };
    const repository = new DrizzleCustomerRepository(db as never);

    await expect(repository.findById("customer-1")).resolves.toMatchObject({
      id: "customer-1",
      fullName: "Олена Петренко",
    });
  });

  it("saves customer rows", async () => {
    const returning = vi.fn(async () => [customer]);
    const values = vi.fn(() => ({ returning }));
    const db = {
      insert: vi.fn(() => ({ values })),
    };
    const repository = new DrizzleCustomerRepository(db as never);

    await expect(
      repository.save({
        fullName: "Олена Петренко",
        phone: "+380671234567",
      }),
    ).resolves.toMatchObject({
      id: "customer-1",
      fullName: "Олена Петренко",
    });
    expect(values).toHaveBeenCalledWith(
      expect.objectContaining({ phone: "+380671234567" }),
    );
  });
});
