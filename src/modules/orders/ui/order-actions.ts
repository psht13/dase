"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import {
  createOrderDraftUseCase,
  DuplicateOrderProductError,
  OrderBuilderSelectionRequiredError,
  ProductUnavailableForOrderError,
} from "@/modules/orders/application/create-order-draft";
import { getAuditEventRepository } from "@/modules/orders/infrastructure/audit-event-repository-factory";
import { getOrderRepository } from "@/modules/orders/infrastructure/order-repository-factory";
import { getProductRepository } from "@/modules/catalog/infrastructure/product-repository-factory";
import { orderBuilderItemsFromFormData } from "@/modules/orders/ui/order-builder-form-data";
import { requireOwnerSession } from "@/modules/users/ui/require-owner-session";

export type OrderBuilderActionResult =
  | {
      message: string;
      ok: false;
    }
  | {
      message: string;
      ok: true;
      publicUrl: string;
    };

export async function createOrderDraftAction(
  formData: FormData,
): Promise<OrderBuilderActionResult> {
  const owner = await requireOwnerSession();

  try {
    const order = await createOrderDraftUseCase(
      {
        items: orderBuilderItemsFromFormData(formData),
        ownerId: owner.id,
      },
      {
        auditEventRepository: getAuditEventRepository(),
        orderRepository: getOrderRepository(),
        productRepository: getProductRepository(),
      },
    );
    const publicUrl = await absolutePublicOrderUrl(order.publicToken);

    revalidatePath("/dashboard/orders/new");

    return {
      message: "Посилання замовлення створено",
      ok: true,
      publicUrl,
    };
  } catch (error) {
    return orderBuilderErrorResult(error);
  }
}

async function absolutePublicOrderUrl(publicToken: string): Promise<string> {
  const requestHeaders = await headers();
  const origin = requestHeaders.get("origin");

  if (origin) {
    return `${origin}/o/${publicToken}`;
  }

  const host = requestHeaders.get("x-forwarded-host") ?? requestHeaders.get("host");
  const protocol = requestHeaders.get("x-forwarded-proto") ?? "http";

  return host ? `${protocol}://${host}/o/${publicToken}` : `/o/${publicToken}`;
}

function orderBuilderErrorResult(
  error: unknown,
): Extract<OrderBuilderActionResult, { ok: false }> {
  if (error instanceof OrderBuilderSelectionRequiredError) {
    return {
      message: "Оберіть хоча б один товар",
      ok: false,
    };
  }

  if (error instanceof DuplicateOrderProductError) {
    return {
      message: "Товар обрано кілька разів",
      ok: false,
    };
  }

  if (error instanceof ProductUnavailableForOrderError) {
    return {
      message: "Один із товарів недоступний для замовлення",
      ok: false,
    };
  }

  if (error instanceof Error && error.message.includes("positive integer")) {
    return {
      message: "Кількість має бути цілим числом більше нуля",
      ok: false,
    };
  }

  throw error;
}
