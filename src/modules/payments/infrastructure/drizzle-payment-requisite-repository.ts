import { and, asc, eq } from "drizzle-orm";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import type {
  PaymentRequisiteRecord,
  PaymentRequisiteRepository,
  PublicPaymentRequisite,
  SavePaymentRequisiteInput,
  UpdatePaymentRequisiteInput,
} from "@/modules/payments/application/payment-requisite-repository";
import * as schema from "@/shared/db/schema";

type Database = NodePgDatabase<typeof schema>;
type DbPaymentRequisite = typeof schema.paymentRequisites.$inferSelect;

export class DrizzlePaymentRequisiteRepository
  implements PaymentRequisiteRepository
{
  constructor(private readonly db: Database) {}

  async listByOwnerId(ownerId: string): Promise<PaymentRequisiteRecord[]> {
    const requisites = await this.db
      .select()
      .from(schema.paymentRequisites)
      .where(eq(schema.paymentRequisites.ownerId, ownerId))
      .orderBy(
        asc(schema.paymentRequisites.sortOrder),
        asc(schema.paymentRequisites.createdAt),
      );

    return requisites.map(mapPaymentRequisite);
  }

  async listActiveByOwnerId(
    ownerId: string,
  ): Promise<PublicPaymentRequisite[]> {
    const requisites = await this.db
      .select()
      .from(schema.paymentRequisites)
      .where(
        and(
          eq(schema.paymentRequisites.ownerId, ownerId),
          eq(schema.paymentRequisites.isActive, true),
        ),
      )
      .orderBy(
        asc(schema.paymentRequisites.sortOrder),
        asc(schema.paymentRequisites.createdAt),
      );

    return requisites.map(mapPublicPaymentRequisite);
  }

  async save(
    input: SavePaymentRequisiteInput,
  ): Promise<PaymentRequisiteRecord> {
    const [savedRequisite] = await this.db
      .insert(schema.paymentRequisites)
      .values({
        bankName: input.bankName,
        displayValue: input.displayValue,
        isActive: input.isActive,
        label: input.label,
        note: input.note,
        ownerId: input.ownerId,
        recipientName: input.recipientName,
        sortOrder: input.sortOrder,
      })
      .returning();

    if (!savedRequisite) {
      throw new Error("Failed to save payment requisite");
    }

    return mapPaymentRequisite(savedRequisite);
  }

  async update(
    input: UpdatePaymentRequisiteInput,
  ): Promise<PaymentRequisiteRecord | null> {
    const [updatedRequisite] = await this.db
      .update(schema.paymentRequisites)
      .set({
        bankName: input.bankName,
        displayValue: input.displayValue,
        isActive: input.isActive,
        label: input.label,
        note: input.note,
        recipientName: input.recipientName,
        sortOrder: input.sortOrder,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(schema.paymentRequisites.id, input.requisiteId),
          eq(schema.paymentRequisites.ownerId, input.ownerId),
        ),
      )
      .returning();

    return updatedRequisite ? mapPaymentRequisite(updatedRequisite) : null;
  }

  async setActive(input: {
    isActive: boolean;
    ownerId: string;
    requisiteId: string;
  }): Promise<PaymentRequisiteRecord | null> {
    const [updatedRequisite] = await this.db
      .update(schema.paymentRequisites)
      .set({
        isActive: input.isActive,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(schema.paymentRequisites.id, input.requisiteId),
          eq(schema.paymentRequisites.ownerId, input.ownerId),
        ),
      )
      .returning();

    return updatedRequisite ? mapPaymentRequisite(updatedRequisite) : null;
  }
}

function mapPaymentRequisite(
  requisite: DbPaymentRequisite,
): PaymentRequisiteRecord {
  return {
    bankName: requisite.bankName,
    createdAt: requisite.createdAt,
    displayValue: requisite.displayValue,
    id: requisite.id,
    isActive: requisite.isActive,
    label: requisite.label,
    note: requisite.note,
    ownerId: requisite.ownerId,
    recipientName: requisite.recipientName,
    sortOrder: requisite.sortOrder,
    updatedAt: requisite.updatedAt,
  };
}

function mapPublicPaymentRequisite(
  requisite: DbPaymentRequisite,
): PublicPaymentRequisite {
  return {
    bankName: requisite.bankName,
    displayValue: requisite.displayValue,
    id: requisite.id,
    label: requisite.label,
    note: requisite.note,
    recipientName: requisite.recipientName,
  };
}
