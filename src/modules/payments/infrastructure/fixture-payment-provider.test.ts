import { PaymentWebhookSignatureError } from "@/modules/payments/application/payment-provider";
import { FixtureMonobankPaymentProvider } from "@/modules/payments/infrastructure/fixture-payment-provider";

describe("FixtureMonobankPaymentProvider", () => {
  it("creates local e2e redirect URLs and verifies fixture webhooks", async () => {
    const provider = new FixtureMonobankPaymentProvider();

    await expect(
      provider.createInvoice({
        amountMinor: 1_200_00,
        currency: "UAH",
        description: "Оплата замовлення Dase",
        items: [],
        orderId: "order-1",
        redirectUrl: "http://127.0.0.1:3000/o/public-token",
        reference: "order-1",
        webhookUrl: "http://127.0.0.1:3000/api/webhooks/monobank",
      }),
    ).resolves.toMatchObject({
      invoiceId: "e2e-order-1",
      pageUrl:
        "http://127.0.0.1:3000/o/public-token?payment=monobank&invoiceId=e2e-order-1",
    });
    await expect(provider.getInvoiceStatus("e2e-order-1")).resolves.toMatchObject(
      {
        rawStatus: "success",
      },
    );
    await expect(
      provider.verifyWebhook({
        rawBody: JSON.stringify({
          amount: 1_200_00,
          failureReason: "Недостатньо коштів",
          invoiceId: "e2e-order-1",
          modifiedDate: "2026-04-30T12:00:00.000Z",
          reference: "order-1",
          status: "failure",
        }),
        signature: "fixture-valid",
      }),
    ).resolves.toMatchObject({
      amountMinor: 1_200_00,
      failureReason: "Недостатньо коштів",
      rawStatus: "failure",
      reference: "order-1",
    });
  });

  it("rejects non-fixture webhook signatures", async () => {
    const provider = new FixtureMonobankPaymentProvider();

    await expect(
      provider.verifyWebhook({
        rawBody: "{}",
        signature: "bad-signature",
      }),
    ).rejects.toBeInstanceOf(PaymentWebhookSignatureError);
  });
});
