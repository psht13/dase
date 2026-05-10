import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import {
  migrateOwnerShippingSettingsFromEnvUseCase,
  migrateShippingEnvHelpText,
  parseMigrateShippingEnvArgs,
  ShippingSettingsEnvMigrationError,
} from "@/modules/shipping/application/migrate-owner-shipping-env";
import { DrizzleOwnerShippingSettingsRepository } from "@/modules/shipping/infrastructure/drizzle-owner-shipping-settings-repository";
import { createApplicationEncryptionServiceFromEnv } from "@/modules/shipping/infrastructure/node-application-encryption-service";
import { DrizzleUserRepository } from "@/modules/users/infrastructure/drizzle-user-repository";
import * as schema from "@/shared/db/schema";

async function main(): Promise<void> {
  const options = parseMigrateShippingEnvArgs(process.argv.slice(2));

  if (options.help) {
    console.log(migrateShippingEnvHelpText);
    return;
  }

  if (process.env.NODE_ENV === "production" && !options.allowProduction) {
    throw new ShippingSettingsEnvMigrationError(
      "Refusing to run with NODE_ENV=production. Configure production manually through the dashboard unless this run is explicitly approved.",
    );
  }

  const databaseUrl = process.env.DATABASE_URL?.trim();

  if (!databaseUrl) {
    throw new ShippingSettingsEnvMigrationError(
      "DATABASE_URL is required in the current shell",
    );
  }

  const encryptionService = createApplicationEncryptionServiceFromEnv(
    process.env,
  );
  const pool = new Pool({ connectionString: databaseUrl });
  const db = drizzle(pool, { schema });

  try {
    const result = await migrateOwnerShippingSettingsFromEnvUseCase(
      {
        allowProduction: options.allowProduction,
        env: process.env,
        force: options.force,
        nodeEnv: process.env.NODE_ENV,
        ownerEmail: options.ownerEmail,
        ownerId: options.ownerId,
      },
      {
        encryptionService,
        ownerShippingSettingsRepository:
          new DrizzleOwnerShippingSettingsRepository(db),
        userRepository: new DrizzleUserRepository(db),
      },
    );
    const actionText =
      result.action === "created" ? "Created" : "Updated";

    console.log(
      [
        `${actionText} Nova Post shipping settings for ${result.ownerEmail} (${result.ownerId}).`,
        `API key preview: ${result.apiKeyPreview ?? "not configured"}`,
        `API environment: ${result.apiEnvironment}`,
        `API base URL: ${result.apiBaseUrl}`,
        `Owner shipment creation enabled: ${result.isEnabled ? "yes" : "no"}`,
        "No shipment was created.",
      ].join("\n"),
    );
  } finally {
    await pool.end();
  }
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : "Migration failed";

  console.error(message);
  process.exitCode = 1;
});
