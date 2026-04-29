import { DrizzleCustomerRepository } from "@/modules/orders/infrastructure/drizzle-customer-repository";

describe("DrizzleCustomerRepository", () => {
  it("saves customer rows", async () => {
    const now = new Date("2026-04-30T10:00:00.000Z");
    const returning = vi.fn(async () => [
      {
        createdAt: now,
        email: null,
        fullName: "Олена Петренко",
        id: "customer-1",
        phone: "+380671234567",
        updatedAt: now,
      },
    ]);
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
