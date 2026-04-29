import { NextResponse } from "next/server";
import { processMonobankWebhookUseCase } from "@/modules/payments/application/process-monobank-webhook";
import {
  PaymentProviderRequestError,
  PaymentWebhookSignatureError,
} from "@/modules/payments/application/payment-provider";
import { getAuditEventRepository } from "@/modules/orders/infrastructure/audit-event-repository-factory";
import { getOrderRepository } from "@/modules/orders/infrastructure/order-repository-factory";
import { getMonobankPaymentProvider } from "@/modules/payments/infrastructure/payment-provider-factory";
import { getPaymentRepository } from "@/modules/payments/infrastructure/payment-repository-factory";
import { getWebhookEventRepository } from "@/modules/payments/infrastructure/webhook-event-repository-factory";
import { getShipmentJobQueue } from "@/modules/shipping/infrastructure/shipment-job-queue-factory";
import { getShipmentRepository } from "@/modules/shipping/infrastructure/shipment-repository-factory";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const rawBody = await request.text();
  const signature = request.headers.get("x-sign");

  try {
    const result = await processMonobankWebhookUseCase(
      {
        rawBody,
        signature,
      },
      {
        auditEventRepository: getAuditEventRepository(),
        orderRepository: getOrderRepository(),
        paymentProvider: getMonobankPaymentProvider(),
        paymentRepository: getPaymentRepository(),
        shipmentJobQueue: getShipmentJobQueue(),
        shipmentRepository: getShipmentRepository(),
        webhookEventRepository: getWebhookEventRepository(),
      },
    );

    return NextResponse.json(
      { ok: true, outcome: result.outcome },
      {
        headers: {
          "cache-control": "no-store",
        },
      },
    );
  } catch (error) {
    if (error instanceof PaymentWebhookSignatureError) {
      return NextResponse.json(
        { message: "Неправильний підпис вебхуку" },
        { status: 401 },
      );
    }

    if (error instanceof PaymentProviderRequestError) {
      return NextResponse.json(
        { message: "Некоректний вебхук Monobank" },
        { status: 400 },
      );
    }

    throw error;
  }
}
