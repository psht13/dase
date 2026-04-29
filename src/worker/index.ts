import { getServerEnv } from "@/shared/config/env";

async function main() {
  const env = getServerEnv();

  if (!env.DATABASE_URL) {
    throw new Error("DATABASE_URL is required to start the worker");
  }

  console.log("Worker process is ready.");
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
