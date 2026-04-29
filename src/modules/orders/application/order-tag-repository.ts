export type OrderTagRecord = {
  color: string | null;
  createdAt: Date;
  id: string;
  name: string;
  ownerId: string;
  updatedAt: Date;
};

export interface OrderTagRepository {
  findByIdForOwner(tagId: string, ownerId: string): Promise<OrderTagRecord | null>;
  findByNameForOwner(name: string, ownerId: string): Promise<OrderTagRecord | null>;
  linkToOrder(orderId: string, tagId: string): Promise<void>;
  listForOrder(orderId: string): Promise<OrderTagRecord[]>;
  listForOwner(ownerId: string): Promise<OrderTagRecord[]>;
  save(
    tag: Omit<OrderTagRecord, "createdAt" | "id" | "updatedAt">,
  ): Promise<OrderTagRecord>;
  unlinkFromOrder(orderId: string, tagId: string): Promise<void>;
}
