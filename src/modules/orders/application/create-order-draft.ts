import type { ProductRepository } from "@/modules/catalog/application/product-repository";
import type { AuditEventRepository } from "@/modules/orders/application/audit-event-repository";
import type {
  OrderRepository,
  PersistedOrder,
} from "@/modules/orders/application/order-repository";
import {
  assertValidQuantity,
  calculateOrderTotal,
  createOrderItemFromProductSnapshot,
} from "@/modules/orders/domain/order";
import { generatePublicOrderToken } from "@/modules/orders/application/public-order-token";

const publicOrderLinkTtlMs = 14 * 24 * 60 * 60 * 1_000;

export type CreateOrderDraftInput = {
  items: CreateOrderDraftItemInput[];
  ownerId: string;
};

export type CreateOrderDraftItemInput = {
  productId: string;
  quantity: number;
};

type CreateOrderDraftDependencies = {
  auditEventRepository: AuditEventRepository;
  generateToken?: () => string;
  now?: () => Date;
  orderRepository: OrderRepository;
  productRepository: ProductRepository;
};

export class OrderBuilderSelectionRequiredError extends Error {
  constructor() {
    super("At least one product is required to create an order");
    this.name = "OrderBuilderSelectionRequiredError";
  }
}

export class DuplicateOrderProductError extends Error {
  constructor(productId: string) {
    super(`Product is selected more than once: ${productId}`);
    this.name = "DuplicateOrderProductError";
  }
}

export class ProductUnavailableForOrderError extends Error {
  constructor(productId: string) {
    super(`Product is unavailable for order: ${productId}`);
    this.name = "ProductUnavailableForOrderError";
  }
}

export async function createOrderDraftUseCase(
  input: CreateOrderDraftInput,
  dependencies: CreateOrderDraftDependencies,
): Promise<PersistedOrder> {
  if (!input.items.length) {
    throw new OrderBuilderSelectionRequiredError();
  }

  assertNoDuplicateProducts(input.items);
  input.items.forEach((item) => assertValidQuantity(item.quantity));

  const products = await Promise.all(
    input.items.map((item) =>
      dependencies.productRepository.findById(item.productId),
    ),
  );

  const orderItems = input.items.map((item, index) => {
    const product = products[index];

    if (!product || product.ownerId !== input.ownerId || !product.isActive) {
      throw new ProductUnavailableForOrderError(item.productId);
    }

    return createOrderItemFromProductSnapshot(
      {
        id: product.id,
        imageUrls: product.images.map((image) => image.url),
        name: product.name,
        sku: product.sku,
        unitPriceMinor: product.priceMinor,
      },
      item.quantity,
    );
  });
  const totalMinor = calculateOrderTotal(orderItems);
  const now = dependencies.now?.() ?? new Date();
  const publicTokenExpiresAt = new Date(now.getTime() + publicOrderLinkTtlMs);
  const order = await dependencies.orderRepository.create({
    items: orderItems,
    ownerId: input.ownerId,
    publicToken: (dependencies.generateToken ?? generatePublicOrderToken)(),
    publicTokenExpiresAt,
    sentAt: now,
    status: "SENT_TO_CUSTOMER",
    totalMinor,
  });

  await dependencies.auditEventRepository.append({
    actorCustomerId: null,
    actorType: "OWNER",
    actorUserId: input.ownerId,
    eventType: "ORDER_CREATED",
    orderId: order.id,
    payload: {
      currency: order.currency,
      itemCount: order.items.length,
      publicTokenExpiresAt: order.publicTokenExpiresAt.toISOString(),
      status: order.status,
      totalMinor: order.totalMinor,
    },
  });

  return order;
}

function assertNoDuplicateProducts(
  items: readonly CreateOrderDraftItemInput[],
): void {
  const productIds = new Set<string>();

  for (const item of items) {
    if (productIds.has(item.productId)) {
      throw new DuplicateOrderProductError(item.productId);
    }

    productIds.add(item.productId);
  }
}
