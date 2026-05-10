import type { OwnerNovaPostConnectionTester } from "@/modules/shipping/application/test-owner-nova-post-connection";
import {
  FixtureNovaPostConnectionTester,
  NovaPostConnectionTester,
} from "@/modules/shipping/infrastructure/nova-post-connection-tester";

let cachedConnectionTester: OwnerNovaPostConnectionTester | undefined;

export function getOwnerNovaPostConnectionTester(): OwnerNovaPostConnectionTester {
  cachedConnectionTester ??= createOwnerNovaPostConnectionTester();

  return cachedConnectionTester;
}

export function resetOwnerNovaPostConnectionTesterForTests(): void {
  cachedConnectionTester = undefined;
}

function createOwnerNovaPostConnectionTester(): OwnerNovaPostConnectionTester {
  if (
    process.env.NODE_ENV !== "production" &&
    (process.env.PLAYWRIGHT_E2E === "1" ||
      process.env.USE_MOCK_SHIPPING_CARRIERS === "1")
  ) {
    return new FixtureNovaPostConnectionTester();
  }

  return new NovaPostConnectionTester();
}
