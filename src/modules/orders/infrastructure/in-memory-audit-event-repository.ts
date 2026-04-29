import { randomUUID } from "node:crypto";
import type {
  AuditEventRecord,
  AuditEventRepository,
} from "@/modules/orders/application/audit-event-repository";

export class InMemoryAuditEventRepository implements AuditEventRepository {
  private readonly events: AuditEventRecord[] = [];

  async append(
    event: Omit<AuditEventRecord, "createdAt" | "id">,
  ): Promise<AuditEventRecord> {
    const savedEvent: AuditEventRecord = {
      ...event,
      createdAt: new Date(),
      id: randomUUID(),
    };

    this.events.push(savedEvent);

    return savedEvent;
  }

  async listForOrder(orderId: string): Promise<AuditEventRecord[]> {
    return this.events.filter((event) => event.orderId === orderId);
  }
}
