export type AuditActorType = "OWNER" | "CUSTOMER" | "SYSTEM";

export type AuditEventRecord = {
  actorCustomerId: string | null;
  actorType: AuditActorType;
  actorUserId: string | null;
  createdAt: Date;
  eventType: string;
  id: string;
  orderId: string | null;
  payload: Record<string, unknown>;
};

export interface AuditEventRepository {
  append(
    event: Omit<AuditEventRecord, "createdAt" | "id">,
  ): Promise<AuditEventRecord>;
  listForOrder(orderId: string): Promise<AuditEventRecord[]>;
}
