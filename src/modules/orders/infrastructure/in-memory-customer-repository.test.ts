import { InMemoryCustomerRepository } from "@/modules/orders/infrastructure/in-memory-customer-repository";

describe("InMemoryCustomerRepository", () => {
  it("saves customer contact data", async () => {
    const repository = new InMemoryCustomerRepository();

    const customer = await repository.save({
        fullName: "Олена Петренко",
        instagramUsername: "olena.shop",
        phone: "+380671234567",
      });

    expect(customer).toMatchObject({
      email: null,
      fullName: "Олена Петренко",
      instagramUsername: "olena.shop",
      phone: "+380671234567",
    });
    await expect(repository.findById(customer.id)).resolves.toMatchObject({
      fullName: "Олена Петренко",
    });
  });
});
