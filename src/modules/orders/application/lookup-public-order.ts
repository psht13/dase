import type { OrderRepository } from "@/modules/orders/application/order-repository";
import { formatOrderDisplayNumber } from "@/modules/orders/application/order-display-number";
import { orderStatusLabels } from "@/modules/orders/application/order-labels";
import { isValidPublicOrderToken } from "@/modules/orders/application/public-order-token";
import { getPublicOrderStatusMessage } from "@/modules/orders/application/public-order-status";
import type { OrderStatus } from "@/modules/orders/domain/status";
import type {
  PaymentProviderCode,
  PaymentRepository,
  PaymentStatus,
} from "@/modules/payments/application/payment-repository";
import {
  listActivePaymentRequisitesForOwnerUseCase,
} from "@/modules/payments/application/manage-payment-requisites";
import type {
  PaymentRequisiteRepository,
  PublicPaymentRequisite,
} from "@/modules/payments/application/payment-requisite-repository";

type PublicOrderBase = {
  currency: string;
  items: PublicOrderReviewItem[];
  paymentProvider: PaymentProviderCode | null;
  paymentRequisites: PublicPaymentRequisite[];
  paymentStatus: PaymentStatus | null;
  publicToken: string;
  publicTokenExpiresAt: Date;
  status: OrderStatus;
  totalMinor: number;
};

export type PublicOrderReview = PublicOrderBase & {
  state: "review";
  status: "SENT_TO_CUSTOMER";
};

export type PublicOrderStatus = PublicOrderBase & {
  displayNumber: string;
  state: "status";
  statusLabel: string;
  statusMessage: string;
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
      order: PublicOrderReview | PublicOrderStatus;
    };

export async function lookupPublicOrderUseCase(
  input: {
    now?: Date;
    publicToken: string;
  },
  dependencies: {
    orderRepository: OrderRepository;
    paymentRequisiteRepository: PaymentRequisiteRepository;
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
  const currentPayment =
    payments.find((payment) => payment.provider === "MANUAL_CARD_TRANSFER") ??
    payments.find((payment) => payment.provider === "CASH_ON_DELIVERY") ??
    null;
  const paymentRequisites = await listActivePaymentRequisitesForOwnerUseCase(
    {
      ownerId: order.ownerId,
    },
    {
      paymentRequisiteRepository: dependencies.paymentRequisiteRepository,
    },
  );

  const publicOrderBase: PublicOrderBase = {
    currency: order.currency,
    items: order.items.map((item) => ({
      lineTotalMinor: item.lineTotalMinor,
      productImageUrlsSnapshot: item.productImageUrlsSnapshot,
      productNameSnapshot: item.productNameSnapshot,
      productSkuSnapshot: item.productSkuSnapshot,
      quantity: item.quantity,
      unitPriceMinor: item.unitPriceMinor,
    })),
    paymentProvider:
      currentPayment && isPublicPaymentProvider(currentPayment.provider)
        ? currentPayment.provider
        : null,
    paymentRequisites,
    paymentStatus: currentPayment?.status ?? null,
    publicToken: order.publicToken,
    publicTokenExpiresAt: order.publicTokenExpiresAt,
    status: order.status,
    totalMinor: order.totalMinor,
  };

  if (order.status === "SENT_TO_CUSTOMER") {
    return {
      available: true,
      order: {
        ...publicOrderBase,
        state: "review",
        status: "SENT_TO_CUSTOMER",
      },
    };
  }

  return {
    available: true,
    order: {
      ...publicOrderBase,
      displayNumber: formatOrderDisplayNumber(order.id),
      state: "status",
      statusLabel: orderStatusLabels[order.status],
      statusMessage: getPublicOrderStatusMessage(order.status),
    },
  };
}

function isPublicPaymentProvider(
  provider: string,
): provider is PaymentProviderCode {
  return (
    provider === "MANUAL_CARD_TRANSFER" || provider === "CASH_ON_DELIVERY"
  );
}
