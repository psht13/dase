import type { OrderRepository } from "@/modules/orders/application/order-repository";
import { isValidPublicOrderToken } from "@/modules/orders/application/public-order-token";
import type {
  PaymentProviderCode,
  PaymentRepository,
  PaymentStatus,
} from "@/modules/payments/application/payment-repository";

export type PublicOrderReview = {
  currency: string;
  items: PublicOrderReviewItem[];
  paymentProvider: PaymentProviderCode | null;
  paymentStatus: PaymentStatus | null;
  publicToken: string;
  publicTokenExpiresAt: Date;
  status: string;
  totalMinor: number;
};

export type PublicOrderReviewItem = {
  lineTotalMinor: number;
  productImageUrlsSnapshot: string[];
  productNameSnapshot: string;
  productSkuSnapshot: string;
  quantity: number;
  unitPriceMinor: number;
};

export type PublicOrderLookupResult =
  | {
      available: false;
      reason: "cancelled" | "expired" | "not-found";
    }
  | {
      available: true;
      order: PublicOrderReview;
    };

export async function lookupPublicOrderUseCase(
  input: {
    now?: Date;
    publicToken: string;
  },
  dependencies: {
    orderRepository: OrderRepository;
    paymentRepository: PaymentRepository;
  },
): Promise<PublicOrderLookupResult> {
  if (!isValidPublicOrderToken(input.publicToken)) {
    return {
      available: false,
      reason: "not-found",
    };
  }

  const order = await dependencies.orderRepository.findByPublicToken(
    input.publicToken,
  );

  if (!order) {
    return {
      available: false,
      reason: "not-found",
    };
  }

  if (order.status === "CANCELLED") {
    return {
      available: false,
      reason: "cancelled",
    };
  }

  const now = input.now ?? new Date();

  if (order.publicTokenExpiresAt.getTime() <= now.getTime()) {
    return {
      available: false,
      reason: "expired",
    };
  }

  const payments = await dependencies.paymentRepository.findByOrderId(order.id);
  const monobankPayment =
    payments.find((payment) => payment.provider === "MONOBANK") ?? null;

  return {
    available: true,
    order: {
      currency: order.currency,
      items: order.items.map((item) => ({
        lineTotalMinor: item.lineTotalMinor,
        productImageUrlsSnapshot: item.productImageUrlsSnapshot,
        productNameSnapshot: item.productNameSnapshot,
        productSkuSnapshot: item.productSkuSnapshot,
        quantity: item.quantity,
        unitPriceMinor: item.unitPriceMinor,
      })),
      paymentProvider: monobankPayment?.provider ?? null,
      paymentStatus: monobankPayment?.status ?? null,
      publicToken: order.publicToken,
      publicTokenExpiresAt: order.publicTokenExpiresAt,
      status: order.status,
      totalMinor: order.totalMinor,
    },
  };
}
