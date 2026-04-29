import { randomUUID } from "node:crypto";
import type {
  OrderTagRecord,
  OrderTagRepository,
} from "@/modules/orders/application/order-tag-repository";

export class InMemoryOrderTagRepository implements OrderTagRepository {
  private readonly links = new Map<string, Set<string>>();
  private readonly tags = new Map<string, OrderTagRecord>();

  async findByIdForOwner(
    tagId: string,
    ownerId: string,
  ): Promise<OrderTagRecord | null> {
    const tag = this.tags.get(tagId);

    return tag?.ownerId === ownerId ? tag : null;
  }

  async findByNameForOwner(
    name: string,
    ownerId: string,
  ): Promise<OrderTagRecord | null> {
    return (
      [...this.tags.values()].find(
        (tag) => tag.ownerId === ownerId && tag.name === name,
      ) ?? null
    );
  }

  async linkToOrder(orderId: string, tagId: string): Promise<void> {
    const tagIds = this.links.get(orderId) ?? new Set<string>();
    tagIds.add(tagId);
    this.links.set(orderId, tagIds);
  }

  async listForOrder(orderId: string): Promise<OrderTagRecord[]> {
    const tagIds = this.links.get(orderId) ?? new Set<string>();

    return [...tagIds]
      .map((tagId) => this.tags.get(tagId))
      .filter((tag): tag is OrderTagRecord => Boolean(tag))
      .sort((first, second) => first.name.localeCompare(second.name, "uk"));
  }

  async listForOwner(ownerId: string): Promise<OrderTagRecord[]> {
    return [...this.tags.values()]
      .filter((tag) => tag.ownerId === ownerId)
      .sort((first, second) => first.name.localeCompare(second.name, "uk"));
  }

  async save(
    tag: Omit<OrderTagRecord, "createdAt" | "id" | "updatedAt">,
  ): Promise<OrderTagRecord> {
    const now = new Date();
    const savedTag: OrderTagRecord = {
      ...tag,
      createdAt: now,
      id: randomUUID(),
      updatedAt: now,
    };

    this.tags.set(savedTag.id, savedTag);

    return savedTag;
  }

  async unlinkFromOrder(orderId: string, tagId: string): Promise<void> {
    const tagIds = this.links.get(orderId);

    if (!tagIds) {
      return;
    }

    tagIds.delete(tagId);
  }
}
