import type {
  OwnerNovaPostConnectionTester,
  OwnerNovaPostConnectionTestInput,
  OwnerNovaPostConnectionTestResult,
} from "@/modules/shipping/application/test-owner-nova-post-connection";
import { NovaPostShippingCarrier } from "@/modules/shipping/infrastructure/nova-post-shipping-carrier";

export class NovaPostConnectionTester implements OwnerNovaPostConnectionTester {
  constructor(private readonly fetchImpl: typeof fetch = fetch) {}

  async testConnection(
    input: OwnerNovaPostConnectionTestInput,
  ): Promise<OwnerNovaPostConnectionTestResult> {
    const carrier = new NovaPostShippingCarrier({
      apiKey: input.apiKey,
      authUrl: input.authUrl ?? undefined,
      baseUrl: input.apiBaseUrl,
      fetchImpl: this.fetchImpl,
    });
    const cities = await carrier.searchCities({
      limit: 1,
      query: "Київ",
    });

    return {
      directoryResultCount: cities.length,
    };
  }
}

export class FixtureNovaPostConnectionTester
  implements OwnerNovaPostConnectionTester
{
  async testConnection(): Promise<OwnerNovaPostConnectionTestResult> {
    return {
      directoryResultCount: 1,
    };
  }
}
