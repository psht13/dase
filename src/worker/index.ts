import { getServerEnv } from "@/shared/config/env";
import { createPgBoss } from "@/modules/shipping/infrastructure/pg-boss-shipment-job-queue";
import { registerShipmentWorkers } from "@/worker/jobs/shipment-jobs";
import { formatSafeError } from "@/shared/logger/safe-error";

async function main() {
  const env = getServerEnv();

  if (!env.DATABASE_URL) {
    throw new Error("DATABASE_URL is required to start the worker");
  }

  const boss = createPgBoss(env.DATABASE_URL);

  boss.on("error", (error) => {
    console.error("Worker queue error:", formatSafeError(error));
  });

  await boss.start();
  await registerShipmentWorkers(boss);

  const stop = async () => {
    await boss.stop();
    process.exit(0);
  };

  process.once("SIGINT", () => {
    void stop();
  });
  process.once("SIGTERM", () => {
    void stop();
  });

  console.log("Shipment worker is ready.");
}

main().catch((error: unknown) => {
  console.error(formatSafeError(error));
  process.exitCode = 1;
});
