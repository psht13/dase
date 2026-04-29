export type OrderTagRecord = {
  color: string | null;
  createdAt: Date;
  id: string;
  name: string;
  ownerId: string;
  updatedAt: Date;
};

export interface OrderTagRepository {
  linkToOrder(orderId: string, tagId: string): Promise<void>;
  listForOrder(orderId: string): Promise<OrderTagRecord[]>;
  save(tag: Omit<OrderTagRecord, "createdAt" | "id" | "updatedAt">): Promise<OrderTagRecord>;
  unlinkFromOrder(orderId: string, tagId: string): Promise<void>;
}
