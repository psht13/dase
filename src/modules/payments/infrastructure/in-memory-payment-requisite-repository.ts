import { randomUUID } from "node:crypto";
import type {
  PaymentRequisiteRecord,
  PaymentRequisiteRepository,
  PublicPaymentRequisite,
  SavePaymentRequisiteInput,
  UpdatePaymentRequisiteInput,
} from "@/modules/payments/application/payment-requisite-repository";

export class InMemoryPaymentRequisiteRepository
  implements PaymentRequisiteRepository
{
  private readonly requisites = new Map<string, PaymentRequisiteRecord>();

  async listByOwnerId(ownerId: string): Promise<PaymentRequisiteRecord[]> {
    return this.sortedRequisites((requisite) => requisite.ownerId === ownerId);
  }

  async listActiveByOwnerId(
    ownerId: string,
  ): Promise<PublicPaymentRequisite[]> {
    return this.sortedRequisites(
      (requisite) => requisite.ownerId === ownerId && requisite.isActive,
    ).map(toPublicPaymentRequisite);
  }

  async save(
    input: SavePaymentRequisiteInput,
  ): Promise<PaymentRequisiteRecord> {
    const now = new Date();
    const requisite: PaymentRequisiteRecord = {
      ...input,
      createdAt: now,
      id: randomUUID(),
      updatedAt: now,
    };

    this.requisites.set(requisite.id, requisite);

    return requisite;
  }

  async update(
    input: UpdatePaymentRequisiteInput,
  ): Promise<PaymentRequisiteRecord | null> {
    const currentRequisite = this.requisites.get(input.requisiteId);

    if (!currentRequisite || currentRequisite.ownerId !== input.ownerId) {
      return null;
    }

    const updatedRequisite: PaymentRequisiteRecord = {
      ...currentRequisite,
      bankName: input.bankName,
      displayValue: input.displayValue,
      isActive: input.isActive,
      label: input.label,
      note: input.note,
      recipientName: input.recipientName,
      sortOrder: input.sortOrder,
      updatedAt: new Date(),
    };

    this.requisites.set(updatedRequisite.id, updatedRequisite);

    return updatedRequisite;
  }

  async setActive(input: {
    isActive: boolean;
    ownerId: string;
    requisiteId: string;
  }): Promise<PaymentRequisiteRecord | null> {
    const currentRequisite = this.requisites.get(input.requisiteId);

    if (!currentRequisite || currentRequisite.ownerId !== input.ownerId) {
      return null;
    }

    const updatedRequisite: PaymentRequisiteRecord = {
      ...currentRequisite,
      isActive: input.isActive,
      updatedAt: new Date(),
    };

    this.requisites.set(updatedRequisite.id, updatedRequisite);

    return updatedRequisite;
  }

  private sortedRequisites(
    filter: (requisite: PaymentRequisiteRecord) => boolean,
  ): PaymentRequisiteRecord[] {
    return [...this.requisites.values()]
      .filter(filter)
      .sort((first, second) => {
        const sortOrderDiff = first.sortOrder - second.sortOrder;

        if (sortOrderDiff !== 0) {
          return sortOrderDiff;
        }

        return first.createdAt.getTime() - second.createdAt.getTime();
      });
  }
}

function toPublicPaymentRequisite(
  requisite: PaymentRequisiteRecord,
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
