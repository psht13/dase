export type PaymentRequisiteRecord = {
  bankName: string | null;
  createdAt: Date;
  displayValue: string;
  id: string;
  isActive: boolean;
  label: string;
  note: string | null;
  ownerId: string;
  recipientName: string | null;
  sortOrder: number;
  updatedAt: Date;
};

export type PublicPaymentRequisite = Pick<
  PaymentRequisiteRecord,
  "bankName" | "displayValue" | "id" | "label" | "note" | "recipientName"
>;

export type SavePaymentRequisiteInput = Omit<
  PaymentRequisiteRecord,
  "createdAt" | "id" | "updatedAt"
>;

export type UpdatePaymentRequisiteInput = Omit<
  PaymentRequisiteRecord,
  "createdAt" | "id" | "ownerId" | "updatedAt"
> & {
  ownerId: string;
  requisiteId: string;
};

export interface PaymentRequisiteRepository {
  listActiveByOwnerId(ownerId: string): Promise<PublicPaymentRequisite[]>;
  listByOwnerId(ownerId: string): Promise<PaymentRequisiteRecord[]>;
  save(input: SavePaymentRequisiteInput): Promise<PaymentRequisiteRecord>;
  setActive(input: {
    isActive: boolean;
    ownerId: string;
    requisiteId: string;
  }): Promise<PaymentRequisiteRecord | null>;
  update(
    input: UpdatePaymentRequisiteInput,
  ): Promise<PaymentRequisiteRecord | null>;
}
