import { randomUUID } from "node:crypto";
import type {
  CustomerRecord,
  CustomerRepository,
  SaveCustomerInput,
} from "@/modules/orders/application/customer-repository";

export class InMemoryCustomerRepository implements CustomerRepository {
  private readonly customers = new Map<string, CustomerRecord>();

  async findById(customerId: string): Promise<CustomerRecord | null> {
    return this.customers.get(customerId) ?? null;
  }

  async save(input: SaveCustomerInput): Promise<CustomerRecord> {
    const now = new Date();
    const customer: CustomerRecord = {
      createdAt: now,
      email: input.email ?? null,
      fullName: input.fullName,
      id: randomUUID(),
      phone: input.phone,
      updatedAt: now,
    };

    this.customers.set(customer.id, customer);

    return customer;
  }
}
