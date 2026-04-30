import { count, eq } from "drizzle-orm";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import type { AppRole } from "@/modules/users/domain/roles";
import type {
  UserRecord,
  UserRepository,
} from "@/modules/users/application/user-repository";
import * as schema from "@/shared/db/schema";

type Database = NodePgDatabase<typeof schema>;

export class DrizzleUserRepository implements UserRepository {
  constructor(private readonly db: Database) {}

  async countByRole(role: AppRole): Promise<number> {
    const [result] = await this.db
      .select({ value: count() })
      .from(schema.users)
      .where(eq(schema.users.role, role));

    return result?.value ?? 0;
  }

  async findByEmail(email: string): Promise<UserRecord | null> {
    const [user] = await this.db
      .select()
      .from(schema.users)
      .where(eq(schema.users.email, email))
      .limit(1);

    return user ?? null;
  }

  async findById(id: string): Promise<UserRecord | null> {
    const [user] = await this.db
      .select()
      .from(schema.users)
      .where(eq(schema.users.id, id))
      .limit(1);

    return user ?? null;
  }

  async updateRole(userId: string, role: AppRole): Promise<UserRecord> {
    const [user] = await this.db
      .update(schema.users)
      .set({
        role,
        updatedAt: new Date(),
      })
      .where(eq(schema.users.id, userId))
      .returning();

    if (!user) {
      throw new Error("User not found");
    }

    return user;
  }
}
