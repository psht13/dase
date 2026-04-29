import type { PaymentProvider } from "@/modules/payments/application/payment-provider";
import { PaymentProviderConfigurationError } from "@/modules/payments/application/payment-provider";
import { FixtureMonobankPaymentProvider } from "@/modules/payments/infrastructure/fixture-payment-provider";
import { MonobankPaymentProvider } from "@/modules/payments/infrastructure/monobank-payment-provider";
import { getServerEnv } from "@/shared/config/env";

let cachedMonobankProvider: PaymentProvider | undefined;

export function getMonobankPaymentProvider(): PaymentProvider {
  cachedMonobankProvider ??= createMonobankPaymentProvider();

  return cachedMonobankProvider;
}

export function resetPaymentProviderForTests(): void {
  cachedMonobankProvider = undefined;
}

function createMonobankPaymentProvider(): PaymentProvider {
  const env = getServerEnv();

  if (isPlaywrightFallbackEnabled()) {
    return new FixtureMonobankPaymentProvider();
  }

  const publicKey =
    env.MONOBANK_PUBLIC_KEY ?? env.MONOBANK_WEBHOOK_SECRET_OR_PUBLIC_KEY;

  if (!env.MONOBANK_TOKEN || !publicKey) {
    throw new PaymentProviderConfigurationError(
      "MONOBANK_TOKEN and MONOBANK_PUBLIC_KEY are required",
    );
  }

  return new MonobankPaymentProvider({
    baseUrl: env.MONOBANK_API_URL,
    publicKeyBase64: publicKey,
    token: env.MONOBANK_TOKEN,
  });
}

function isPlaywrightFallbackEnabled(): boolean {
  return (
    process.env.NODE_ENV !== "production" && process.env.PLAYWRIGHT_E2E === "1"
  );
}
