import type { AuditEventRepository } from "@/modules/orders/application/audit-event-repository";
import type { OrderRepository } from "@/modules/orders/application/order-repository";
import type {
  OrderTagRecord,
  OrderTagRepository,
} from "@/modules/orders/application/order-tag-repository";

type OrderTagDependencies = {
  auditEventRepository: AuditEventRepository;
  orderRepository: OrderRepository;
  orderTagRepository: OrderTagRepository;
};

export class OrderTagValidationError extends Error {
  constructor() {
    super("Order tag name is invalid");
    this.name = "OrderTagValidationError";
  }
}

export class OrderTagOwnerOrderNotFoundError extends Error {
  constructor() {
    super("Owner order was not found for tag operation");
    this.name = "OrderTagOwnerOrderNotFoundError";
  }
}

export class OrderTagNotFoundError extends Error {
  constructor() {
    super("Order tag was not found");
    this.name = "OrderTagNotFoundError";
  }
}

export async function createAndAssignOrderTagUseCase(
  input: {
    name: string;
    orderId: string;
    ownerId: string;
  },
  dependencies: OrderTagDependencies,
): Promise<OrderTagRecord> {
  const order = await dependencies.orderRepository.findById(input.orderId);

  if (!order || order.ownerId !== input.ownerId) {
    throw new OrderTagOwnerOrderNotFoundError();
  }

  const name = normalizeTagName(input.name);
  const tag =
    (await dependencies.orderTagRepository.findByNameForOwner(
      name,
      input.ownerId,
    )) ??
    (await dependencies.orderTagRepository.save({
      color: null,
      name,
      ownerId: input.ownerId,
    }));

  await linkTagAndAudit(order.id, tag, input.ownerId, dependencies);

  return tag;
}

export async function assignOrderTagUseCase(
  input: {
    orderId: string;
    ownerId: string;
    tagId: string;
  },
  dependencies: OrderTagDependencies,
): Promise<OrderTagRecord> {
  const [order, tag] = await Promise.all([
    dependencies.orderRepository.findById(input.orderId),
    dependencies.orderTagRepository.findByIdForOwner(input.tagId, input.ownerId),
  ]);

  if (!order || order.ownerId !== input.ownerId) {
    throw new OrderTagOwnerOrderNotFoundError();
  }

  if (!tag) {
    throw new OrderTagNotFoundError();
  }

  await linkTagAndAudit(order.id, tag, input.ownerId, dependencies);

  return tag;
}

export async function removeOrderTagUseCase(
  input: {
    orderId: string;
    ownerId: string;
    tagId: string;
  },
  dependencies: OrderTagDependencies,
): Promise<OrderTagRecord> {
  const [order, tag] = await Promise.all([
    dependencies.orderRepository.findById(input.orderId),
    dependencies.orderTagRepository.findByIdForOwner(input.tagId, input.ownerId),
  ]);

  if (!order || order.ownerId !== input.ownerId) {
    throw new OrderTagOwnerOrderNotFoundError();
  }

  if (!tag) {
    throw new OrderTagNotFoundError();
  }

  await dependencies.orderTagRepository.unlinkFromOrder(order.id, tag.id);
  await dependencies.auditEventRepository.append({
    actorCustomerId: null,
    actorType: "OWNER",
    actorUserId: input.ownerId,
    eventType: "ORDER_TAG_REMOVED",
    orderId: order.id,
    payload: {
      message: "Тег знято із замовлення",
      tagId: tag.id,
      tagName: tag.name,
    },
  });

  return tag;
}

async function linkTagAndAudit(
  orderId: string,
  tag: OrderTagRecord,
  ownerId: string,
  dependencies: OrderTagDependencies,
): Promise<void> {
  await dependencies.orderTagRepository.linkToOrder(orderId, tag.id);
  await dependencies.auditEventRepository.append({
    actorCustomerId: null,
    actorType: "OWNER",
    actorUserId: ownerId,
    eventType: "ORDER_TAG_ASSIGNED",
    orderId,
    payload: {
      message: "Тег додано до замовлення",
      tagId: tag.id,
      tagName: tag.name,
    },
  });
}

function normalizeTagName(value: string): string {
  const name = value.trim().replace(/\s+/g, " ");

  if (name.length < 2 || name.length > 40) {
    throw new OrderTagValidationError();
  }

  return name;
}
