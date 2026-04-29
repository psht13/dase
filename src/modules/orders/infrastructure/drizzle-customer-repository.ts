import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import type {
  CustomerRecord,
  CustomerRepository,
  SaveCustomerInput,
} from "@/modules/orders/application/customer-repository";
import * as schema from "@/shared/db/schema";

type Database = NodePgDatabase<typeof schema>;
type DbCustomer = typeof schema.customers.$inferSelect;

export class DrizzleCustomerRepository implements CustomerRepository {
  constructor(private readonly db: Database) {}

  async save(input: SaveCustomerInput): Promise<CustomerRecord> {
    const [customer] = await this.db
      .insert(schema.customers)
      .values({
        email: input.email ?? null,
        fullName: input.fullName,
        phone: input.phone,
      })
      .returning();

    if (!customer) {
      throw new Error("Failed to save customer");
    }

    return mapCustomer(customer);
  }
}

function mapCustomer(customer: DbCustomer): CustomerRecord {
  return {
    createdAt: customer.createdAt,
    email: customer.email,
    fullName: customer.fullName,
    id: customer.id,
    phone: customer.phone,
    updatedAt: customer.updatedAt,
  };
}
