import { InMemoryCustomerRepository } from "@/modules/orders/infrastructure/in-memory-customer-repository";

describe("InMemoryCustomerRepository", () => {
  it("saves customer contact data", async () => {
    const repository = new InMemoryCustomerRepository();

    await expect(
      repository.save({
        fullName: "Олена Петренко",
        phone: "+380671234567",
      }),
    ).resolves.toMatchObject({
      email: null,
      fullName: "Олена Петренко",
      phone: "+380671234567",
    });
  });
});
