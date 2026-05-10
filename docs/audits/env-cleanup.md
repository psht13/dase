# Environment Cleanup Audit

Audit date: 2026-05-10

Scope: environment variables, shipping/payment configuration, Railway variable names, ignored local env files, schema/migrations, and existing owner settings UI. This audit is documentation-only. It does not remove env keys, change Railway variables, edit ignored env files, or change runtime behavior.

Secret handling: Railway and local env files were inspected for variable names only. Secret values are intentionally omitted.

## Desired Target State

Nova Post owner-managed settings should move from environment variables into authenticated owner UI:

- API environment and API base URL.
- API key.
- Optional auth URL override.
- Sender identity and branch/division data.
- Payer settings.
- Default parcel dimensions and weight.
- Per-owner shipping creation enabled/disabled flag.

Runtime env should keep infrastructure/runtime settings only:

- `DATABASE_URL`
- `DATABASE_URL_TEST` for local/test use only, where still needed
- `BETTER_AUTH_SECRET`
- `BETTER_AUTH_URL`
- `OWNER_SETUP_TOKEN` while first-owner setup can run
- `AUTO_COMPLETE_AFTER_DELIVERED_HOURS`
- `NODE_ENV`, `CI`, and test runner variables
- `SHIPPING_LABEL_CREATION_MODE` only if retained as a global kill switch
- new `APP_ENCRYPTION_KEY` for encrypted owner settings

Monobank/MonoPay is no longer part of the active customer payment flow. The active flow is manual owner card/requisite transfer through `payment_requisites`.

## Deprecated Or Transitional Keys Found

| Key or group | Current references | Target |
| --- | --- | --- |
| `MONOBANK_TOKEN` | `.env.example`, `src/shared/config/env.ts`, `src/modules/payments/infrastructure/payment-provider-factory.ts`, `src/modules/payments/infrastructure/monobank-payment-provider.ts`, payment retry/webhook tests, `README.md`, `DEPLOYMENT.md`, `spec.md`, `TASKS.md` | Remove from runtime env validation/docs when inactive Monobank code is removed. Keep existing DB enum value only as a historical data compatibility decision. |
| `MONOBANK_API_URL` | `.env.example`, `src/shared/config/env.ts`, `payment-provider-factory.ts`, Monobank provider/tests, docs | Remove with Monobank runtime cleanup. |
| `MONOBANK_PUBLIC_KEY` | `.env.example`, `src/shared/config/env.ts`, `payment-provider-factory.ts`, Monobank provider/tests, docs | Remove with Monobank runtime cleanup. |
| `MONOBANK_WEBHOOK_SECRET_OR_PUBLIC_KEY` | `.env.example`, `src/shared/config/env.ts`, `payment-provider-factory.ts`, docs | Remove with Monobank runtime cleanup. |
| `NOVA_POSHTA_API_KEY` | `.env.example`, `DEPLOYMENT.md`, `spec.md`, `TASKS.md`, `src/shared/config/env.ts`, `src/modules/shipping/infrastructure/shipping-carrier-factory.ts`, tests | Remove compatibility fallback after owner settings are implemented. |
| `NOVA_POSHTA_API_URL` | `.env.example`, `DEPLOYMENT.md`, `spec.md`, `TASKS.md`, `src/shared/config/env.ts`, `shipping-carrier-factory.ts`, tests | Remove compatibility fallback after owner settings are implemented. |
| `NOVA_POST_API_KEY` | `.env.example`, `DEPLOYMENT.md`, `spec.md`, `TASKS.md`, `src/shared/config/env.ts`, `shipping-carrier-factory.ts`, `src/shared/logger/safe-error.test.ts`, env tests, local ignored env files, Railway `web` and `worker` | Move to encrypted owner settings. Do not keep as runtime env after code reads settings from DB. |
| `NOVA_POST_API_URL` | `.env.example`, docs, `src/shared/config/env.ts`, `shipping-carrier-factory.ts`, env tests, local ignored env files, Railway `web` and `worker` | Move to owner settings API environment/base URL. |
| `NOVA_POST_AUTH_URL` | `.env.example`, docs, `src/shared/config/env.ts`, `shipping-carrier-factory.ts`, env tests | Move to owner settings as optional override. Not present in inspected Railway/local env names. |
| `NOVA_POST_SENDER_*` | `.env.example`, docs, `src/shared/config/env.ts`, `shipping-carrier-factory.ts`, `src/modules/shipping/infrastructure/nova-post-shipping-carrier.ts`, env/factory/worker tests, local ignored env files, Railway `web` and `worker` for required sender fields | Move to owner settings. Keep missing-settings messages Ukrainian but stop naming env keys after refactor. |
| `NOVA_POST_PAYER_*` | `.env.example`, docs, `src/shared/config/env.ts`, `shipping-carrier-factory.ts`, env/factory tests, local ignored env files, Railway `web` and `worker` for `NOVA_POST_PAYER_TYPE` | Move to owner settings. |
| `NOVA_POST_DEFAULT_*` | `.env.example`, docs, `src/shared/config/env.ts`, `shipping-carrier-factory.ts`, env/factory tests, local ignored env files, Railway `web` and `worker` | Move to owner settings parcel defaults. |
| `SHIPPING_LABEL_CREATION_MODE` | `.env.example`, `README.md`, `DEPLOYMENT.md`, `spec.md`, `TASKS.md`, `playwright.config.ts`, `src/shared/config/env.ts`, `shipping-carrier-factory.ts`, `src/worker/jobs/shipment-jobs.ts`, owner order details, retry shipment action, tests, local ignored env files, Railway `web` and `worker` | Keep only as global kill switch if still needed. It must not substitute for owner settings. |
| `USE_MOCK_SHIPPING_CARRIERS` | `.env.example`, `README.md`, `src/modules/shipping/infrastructure/shipping-carrier-factory.ts`, factory tests, local `.env` and `.env.test.local` | Keep test/dev-only only if still needed after owner settings. Prefer explicit test adapters and Playwright overrides. |
| `UKRPOSHTA` | DB enums, shipping registry, labels, route tests, owner list/detail tests, docs | Not an env key. Keep readable for historical records while disabled, or handle through a later safe carrier enum migration. |

At ENV-00 audit time, no `APP_ENCRYPTION_KEY` reference existed yet.

## Runtime Reference Map

Environment validation:

- `src/shared/config/env.ts` parses all current Monobank and Nova Post env keys, applies production/live shipping validation, defaults production shipping mode to `disabled`, and rejects `mock` in production.
- `src/shared/config/env.test.ts` covers Monobank/Nova Post parsing and live-mode validation.

Shipping runtime:

- `src/modules/shipping/infrastructure/shipping-carrier-factory.ts` builds Nova Post from env, supports `NOVA_POSHTA_*` compatibility names, reads `SHIPPING_LABEL_CREATION_MODE`, and reads `process.env.USE_MOCK_SHIPPING_CARRIERS` directly.
- `src/modules/shipping/infrastructure/nova-post-shipping-carrier.ts` accepts API/sender/default config from the factory and emits missing sender messages that currently name `NOVA_POST_SENDER_*` keys.
- `src/app/api/carriers/cities/route.ts` and `src/app/api/carriers/warehouses/route.ts` call `getShippingCarrier(carrier)` with no owner/order context.
- `src/worker/jobs/shipment-jobs.ts` passes global shipping mode and global live-config validation into shipment job use cases.
- `src/app/(owner)/dashboard/orders/[orderId]/page.tsx` and `src/modules/shipping/ui/shipment-actions.ts` read global shipping mode for owner UI/retry behavior.
- `playwright.config.ts` forces `SHIPPING_LABEL_CREATION_MODE=disabled` for local E2E dev servers.

Payment runtime:

- `src/modules/payments/infrastructure/payment-provider-factory.ts` creates a Monobank provider from `MONOBANK_*` env keys, or the fixture provider when `PLAYWRIGHT_E2E=1`.
- `src/modules/payments/infrastructure/monobank-payment-provider.ts` still implements invoice/status/webhook behavior.
- `src/app/api/webhooks/monobank/route.ts`, `src/modules/payments/application/process-monobank-webhook.ts`, `src/modules/payments/application/create-payment-invoice.ts`, `src/modules/payments/application/retry-payment-invoice.ts`, and `src/modules/payments/ui/payment-actions.ts` keep historical Monobank webhook/retry behavior.
- `src/modules/orders/application/delivery-form-validation.ts` rejects `MONOBANK` from active customer payment choices.
- `src/modules/orders/ui/delivery-form.tsx` active payment UI uses manual card transfer and cash on delivery, and tests assert MonoPay/Monobank copy is absent from the active flow.

Documentation:

- `.env.example`, `README.md`, `DEPLOYMENT.md`, `spec.md`, and `TASKS.md` still document current/deprecated env keys.
- `docs/adr/0001-architecture.md` confirms carrier selection through the application carrier registry and disabled legacy carriers remaining readable.
- `docs/ui/mobile-form-table-guidelines.md` still has older MonoPay wording in the public delivery refactor plan and should be corrected during docs cleanup.

## Schema And Migration Audit

Current schema:

- `payment_provider` enum in `src/shared/db/schema.ts` contains `MONOBANK`, `MANUAL_CARD_TRANSFER`, and `CASH_ON_DELIVERY`.
- `shipment_carrier` enum contains `NOVA_POSHTA` and `UKRPOSHTA`.
- `webhook_provider` enum contains `MONOBANK`, `NOVA_POSHTA`, and `UKRPOSHTA`.
- `payments.provider_invoice_id` and `payments.provider_modified_at` remain nullable historical provider fields.
- `payment_requisites` exists and is owner-scoped for active manual card transfer settings.
- `carrier_directory_cache` is global by carrier/resource/lookup key and is not owner-scoped.

Migration files:

- `drizzle/0001_secret_the_fallen.sql` creates `payment_provider` with `MONOBANK` and `CASH_ON_DELIVERY`, `shipment_carrier` with `NOVA_POSHTA` and `UKRPOSHTA`, and `carrier_directory_cache`.
- `drizzle/0005_wonderful_preak.sql` adds `MANUAL_CARD_TRANSFER` and creates `payment_requisites`.
- Drizzle snapshots still include historical `MONOBANK`, `NOVA_POSHTA`, and `UKRPOSHTA` enum values.

No owner shipping settings table exists yet.

Schema implications for refactor:

- Renaming DB enum value `NOVA_POSHTA` to `NOVA_POST` needs a deliberate forward migration and production data check. If risky, keep DB enum compatibility and introduce an application-level `NOVA_POST` mapping.
- Removing `MONOBANK` from Postgres enum is risky while historical rows may exist. Prefer leaving the enum value readable until a data-retention decision is made.
- `carrier_directory_cache` either needs owner/settings scoping or a documented reason why directory results can stay globally cached across owner API settings and API environments.

## Current Owner Settings UI

Existing payment settings pattern:

- Route: `src/app/(owner)/dashboard/settings/payment/page.tsx`.
- Dashboard navigation: `src/app/(owner)/dashboard/dashboard-shell.tsx` links `Налаштування` to `/dashboard/settings/payment`.
- UI: `src/modules/payments/ui/payment-requisites-settings.tsx` and `src/modules/payments/ui/payment-requisite-form.tsx`.
- Server actions: `src/modules/payments/ui/payment-requisite-actions.ts`.
- Application/repository ports: `src/modules/payments/application/manage-payment-requisites.ts`, `src/modules/payments/application/payment-requisite-repository.ts`.
- Infrastructure: `src/modules/payments/infrastructure/drizzle-payment-requisite-repository.ts`, in-memory repository, and repository factory.
- Shared UI: `src/shared/ui/page-layout.tsx` provides `PageHeader`, `ActionBar`, and `FormActions`; `src/shared/ui/button.tsx` provides button primitives.

Recommended shipping settings UI:

- Add `/dashboard/settings/shipping` or a settings index that links payment and shipping settings.
- Reuse the payment settings shape: thin route, owner session guard, application use cases, repository port, Drizzle repository, in-memory test repository, Ukrainian form labels, server actions, `ActionBar`/`FormActions`.
- Do not put Nova Post API calls, encryption, validation business rules, or DB writes directly in React components.

## Proposed Owner Settings Model

Add an owner-scoped settings table, for example `owner_shipping_settings`:

- `id`
- `owner_id` unique and foreign-keyed to `users.id`
- `carrier`, preferably application-level `NOVA_POST`
- `is_enabled`
- `api_environment`: `stage`, `production_global`, `production_ukraine`, or `custom`
- `api_base_url`
- `auth_url` nullable
- `api_key_encrypted` nullable
- `api_key_preview` nullable
- `sender_country_code`
- `sender_division_id`
- `sender_name`
- `sender_phone`
- `sender_email` nullable
- `sender_company_tin` nullable
- `sender_company_name` nullable
- `payer_type`: `Recipient`, `Sender`, or `ThirdPerson`
- `payer_contract_number` nullable
- `default_width_mm`
- `default_length_mm`
- `default_height_mm`
- `default_actual_weight_grams`
- `default_volumetric_weight_grams`
- `created_at`
- `updated_at`

Security model:

- Add `APP_ENCRYPTION_KEY` as the only new runtime env key for this refactor.
- Require at least 32 bytes encoded as base64 or hex.
- Use authenticated encryption such as AES-256-GCM.
- Do not reuse `BETTER_AUTH_SECRET` as the encryption key.
- Store the Nova Post API key encrypted, plus a safe preview only.
- Never return decrypted API keys from read models.
- Never log decrypted settings or full encrypted payloads.
- Owner UI should accept a new API key on create/update, then show only the preview after save.

Application model:

- Add domain/application validation for API environment, custom URL, sender, payer, and parcel defaults.
- Add a `ShippingSettingsRepository` port and use cases for read/save/update.
- Add an encryption service port in application or shared infrastructure boundary.
- Add a settings resolver that builds `NovaPostShippingCarrier` from owner settings, not process env.
- Keep route handlers/server actions thin.

Owner context requirement:

- Current public directory endpoints are global: `/api/carriers/cities?carrier=...` and `/api/carriers/warehouses?carrier=...`.
- Owner-based carrier settings require these lookups to become owner/order scoped. A safe option is to include the public order token in the request and resolve the order owner server-side before building the carrier.
- Worker shipment creation already has order/shipment context and can resolve owner settings through the order owner before creating the provider.

## Planned Migration Strategy

1. Add encrypted owner shipping settings model.
   - Add forward-only migration.
   - Add `APP_ENCRYPTION_KEY` validation and docs.
   - Keep existing env-backed shipping behavior until the settings resolver is ready.

2. Add owner shipping settings UI.
   - Add dashboard settings route/navigation.
   - Save encrypted API key and owner-entered sender/payer/parcel fields.
   - Keep all UI copy Ukrainian.

3. Refactor Nova Post resolution.
   - Directory routes resolve owner by order token or another server-trusted owner context.
   - Worker shipment creation resolves owner settings by order owner.
   - Global env values stop feeding Nova Post API/sender/payer/parcel config.
   - `SHIPPING_LABEL_CREATION_MODE` remains only a global safety switch if kept.

4. Remove inactive Monobank runtime integration.
   - Remove Monobank provider factory, webhook route, retry actions, active tests, and env validation/docs once product decision confirms no historical retry/webhook operation is needed.
   - Keep historical DB enum/read compatibility as needed.

5. Remove deprecated env validation and docs.
   - Remove `MONOBANK_*`, `NOVA_POSHTA_*`, `NOVA_POST_API_*`, `NOVA_POST_AUTH_URL`, `NOVA_POST_SENDER_*`, `NOVA_POST_PAYER_*`, and `NOVA_POST_DEFAULT_*` from tracked docs and env parser.
   - Keep `.env.example` focused on infrastructure/runtime keys plus `APP_ENCRYPTION_KEY`.

6. Perform operational cleanup.
   - Delete deprecated Railway variables only after deployed code no longer reads them.
   - Remove deprecated keys from ignored local env files only after local code no longer reads them.

## Railway Variable Inventory

Inspected services:

- `web`
- `worker`
- `Postgres`
- `Postgres-1P5k`

Application services with deprecated or transitional names:

- `web`: `NOVA_POST_API_KEY`, `NOVA_POST_API_URL`, `NOVA_POST_DEFAULT_ACTUAL_WEIGHT_GRAMS`, `NOVA_POST_DEFAULT_HEIGHT_MM`, `NOVA_POST_DEFAULT_LENGTH_MM`, `NOVA_POST_DEFAULT_VOLUMETRIC_WEIGHT_GRAMS`, `NOVA_POST_DEFAULT_WIDTH_MM`, `NOVA_POST_PAYER_TYPE`, `NOVA_POST_SENDER_COUNTRY_CODE`, `NOVA_POST_SENDER_DIVISION_ID`, `NOVA_POST_SENDER_NAME`, `NOVA_POST_SENDER_PHONE`, `SHIPPING_LABEL_CREATION_MODE`.
- `worker`: `NOVA_POST_API_KEY`, `NOVA_POST_API_URL`, `NOVA_POST_DEFAULT_ACTUAL_WEIGHT_GRAMS`, `NOVA_POST_DEFAULT_HEIGHT_MM`, `NOVA_POST_DEFAULT_LENGTH_MM`, `NOVA_POST_DEFAULT_VOLUMETRIC_WEIGHT_GRAMS`, `NOVA_POST_DEFAULT_WIDTH_MM`, `NOVA_POST_PAYER_TYPE`, `NOVA_POST_SENDER_COUNTRY_CODE`, `NOVA_POST_SENDER_DIVISION_ID`, `NOVA_POST_SENDER_NAME`, `NOVA_POST_SENDER_PHONE`, `SHIPPING_LABEL_CREATION_MODE`.

Application services without matching deprecated names:

- `web`: no `MONOBANK_*`, no `NOVA_POSHTA_*`, and no `NOVA_POST_AUTH_URL` were present in the key-only inventory.
- `worker`: no `MONOBANK_*`, no `NOVA_POSHTA_*`, and no `NOVA_POST_AUTH_URL` were present in the key-only inventory.

Database services:

- `Postgres` has Railway/Postgres-generated variable names such as `DATABASE_URL`, `DATABASE_PUBLIC_URL`, `PG*`, `POSTGRES_*`, `RAILWAY_*`, and volume/proxy names. No deprecated app shipping/payment variable names were found.
- `Postgres-1P5k` has Railway/Postgres-generated variable names such as `DATABASE_URL`, `DATABASE_PUBLIC_URL`, `PG*`, `POSTGRES_*`, `RAILWAY_*`, and volume/proxy names. No deprecated app shipping/payment variable names were found.

Other observed production app variables:

- `web` has infrastructure/runtime variables including `DATABASE_URL`, `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`, `OWNER_SETUP_TOKEN`, `NODE_ENV`, and Railway-managed names.
- `worker` has `DATABASE_URL`, `AUTO_COMPLETE_AFTER_DELIVERED_HOURS`, `NODE_ENV`, Railway-managed names, and currently also auth/setup variables. The auth/setup variables are not part of the shipping/payment cleanup, but current deployment docs already say the worker does not require them.

Railway cleanup plan after code support:

1. Confirm a deployed version no longer reads owner-managed Nova Post env keys.
2. On `web` and `worker`, delete `NOVA_POST_API_KEY`, `NOVA_POST_API_URL`, `NOVA_POST_AUTH_URL` if present, all `NOVA_POST_SENDER_*`, all `NOVA_POST_PAYER_*`, all `NOVA_POST_DEFAULT_*`, and any `NOVA_POSHTA_*` compatibility keys if they appear.
3. Delete any `MONOBANK_*` keys if they appear in future inventories and inactive Monobank runtime code has been removed.
4. Keep `SHIPPING_LABEL_CREATION_MODE` only if retained as a global kill switch.
5. Add `APP_ENCRYPTION_KEY` before any encrypted owner API key can be saved or read in production.
6. Do not change Postgres service variables for this cleanup except normal DB/runtime management.

## Local Ignored Env Inventory

Files checked:

- `.env`
- `.env.local`
- `.env.test.local`
- `.env.production`
- `.env.production.local`

Files with deprecated or transitional keys:

- `.env`: `SHIPPING_LABEL_CREATION_MODE`, `USE_MOCK_SHIPPING_CARRIERS`, `NOVA_POST_API_KEY`, `NOVA_POST_API_URL`, `NOVA_POST_SENDER_COUNTRY_CODE`, `NOVA_POST_SENDER_DIVISION_ID`, `NOVA_POST_SENDER_NAME`, `NOVA_POST_SENDER_PHONE`, `NOVA_POST_PAYER_TYPE`, `NOVA_POST_DEFAULT_WIDTH_MM`, `NOVA_POST_DEFAULT_LENGTH_MM`, `NOVA_POST_DEFAULT_HEIGHT_MM`, `NOVA_POST_DEFAULT_ACTUAL_WEIGHT_GRAMS`, `NOVA_POST_DEFAULT_VOLUMETRIC_WEIGHT_GRAMS`.
- `.env.test.local`: `SHIPPING_LABEL_CREATION_MODE`, `USE_MOCK_SHIPPING_CARRIERS`, `NOVA_POST_API_KEY`, `NOVA_POST_API_URL`, `NOVA_POST_SENDER_COUNTRY_CODE`, `NOVA_POST_SENDER_DIVISION_ID`, `NOVA_POST_SENDER_NAME`, `NOVA_POST_SENDER_PHONE`, `NOVA_POST_PAYER_TYPE`, `NOVA_POST_DEFAULT_WIDTH_MM`, `NOVA_POST_DEFAULT_LENGTH_MM`, `NOVA_POST_DEFAULT_HEIGHT_MM`, `NOVA_POST_DEFAULT_ACTUAL_WEIGHT_GRAMS`, `NOVA_POST_DEFAULT_VOLUMETRIC_WEIGHT_GRAMS`.
- `.env.production.local`: `SHIPPING_LABEL_CREATION_MODE`, `NOVA_POST_API_KEY`, `NOVA_POST_API_URL`, `NOVA_POST_SENDER_COUNTRY_CODE`, `NOVA_POST_SENDER_DIVISION_ID`, `NOVA_POST_SENDER_NAME`, `NOVA_POST_SENDER_PHONE`, `NOVA_POST_PAYER_TYPE`, `NOVA_POST_DEFAULT_WIDTH_MM`, `NOVA_POST_DEFAULT_LENGTH_MM`, `NOVA_POST_DEFAULT_HEIGHT_MM`, `NOVA_POST_DEFAULT_ACTUAL_WEIGHT_GRAMS`, `NOVA_POST_DEFAULT_VOLUMETRIC_WEIGHT_GRAMS`, `USE_MOCK_SHIPPING_CARRIERS`.

Files not present in this working copy during the audit:

- `.env.local`
- `.env.production`

No local `MONOBANK_*` or `NOVA_POSHTA_*` key names were found in the checked ignored env files.

Local cleanup plan after code support:

1. Do not edit ignored env files until the deployed/local code no longer depends on these keys.
2. Remove owner-managed Nova Post keys from `.env`, `.env.test.local`, and `.env.production.local`.
3. Keep or add `APP_ENCRYPTION_KEY` in ignored env files only after encrypted owner settings are implemented.
4. Keep `DATABASE_URL`, auth settings, owner setup token, and local smoke credentials only where needed.
5. Keep `SHIPPING_LABEL_CREATION_MODE` only if it remains the global kill switch.
6. Remove `USE_MOCK_SHIPPING_CARRIERS` if Playwright/test adapters no longer need it.

## Code Changes Versus Operational Cleanup

Code changes still required:

- Add encrypted owner shipping settings persistence.
- Add owner shipping settings UI.
- Refactor carrier lookup and worker creation to use owner settings.
- Add owner/order context to public carrier directory lookups.
- Decide whether carrier directory cache must be owner/settings scoped.
- Remove env validation for owner-managed shipping values.
- Remove inactive Monobank runtime/env/docs after compatibility decision.
- Update tests for Ukrainian owner shipping settings UI and no secret leakage.

Operational cleanup later:

- Delete deprecated Railway variables from `web` and `worker`.
- Remove deprecated keys from ignored local env files.
- Rotate or re-enter Nova Post API keys through owner UI.
- Add production `APP_ENCRYPTION_KEY`.
- Verify production owner settings save/read, directory lookup, shipment creation, and disabled/kill-switch behavior without printing secrets.

No operational cleanup was performed during the ENV-00 audit.

## ENV-04 Tracked Cleanup Result

Completed on 2026-05-10 for tracked code and documentation only.

- `.env.example` no longer contains inactive Monobank keys or owner-managed Nova Post API, sender, payer, or parcel-default keys.
- Active environment validation no longer parses Monobank keys, `NOVA_POSHTA_*` compatibility keys, or owner-managed `NOVA_POST_*` runtime keys. Unknown deprecated names are stripped from the parsed env object.
- Active payment runtime is manual owner card transfer plus cash on delivery. Monobank invoice creation, retry actions, webhook route, provider factory, provider implementation, and active tests were removed.
- Public UI offers only `Оплата картою онлайн` and `Післяплата`; owner UI no longer shows Monobank retry actions.
- Active shipping runtime continues to resolve Nova Post from encrypted owner settings. `SHIPPING_LABEL_CREATION_MODE` remains as the global kill switch.
- Existing migrations and Drizzle snapshots still contain historical enum values such as `MONOBANK` and `NOVA_POSHTA`; they were not rewritten or made destructive.
- This milestone did not delete Railway variables, edit ignored local env files, redeploy production, run a migration helper, or perform final production smoke.

## ENV-05 Operational Cleanup Result

Completed on 2026-05-10 for ignored local env files and Railway production variables.

Secret handling:
- Local and Railway values were not printed or copied into tracked files.
- Railway and local env inventories were recorded by key name only.
- Ignored env files remain untracked and were not committed.

Local ignored env files:
- Checked files: `.env`, `.env.local`, `.env.test.local`, `.env.production`, `.env.production.local`.
- Present and edited: `.env`, `.env.test.local`, `.env.production.local`.
- Not present: `.env.local`, `.env.production`.
- Removed key names from present local files: `NOVA_POST_API_KEY`, `NOVA_POST_API_URL`, `NOVA_POST_SENDER_COUNTRY_CODE`, `NOVA_POST_SENDER_DIVISION_ID`, `NOVA_POST_SENDER_NAME`, `NOVA_POST_SENDER_PHONE`, `NOVA_POST_PAYER_TYPE`, `NOVA_POST_DEFAULT_WIDTH_MM`, `NOVA_POST_DEFAULT_LENGTH_MM`, `NOVA_POST_DEFAULT_HEIGHT_MM`, `NOVA_POST_DEFAULT_ACTUAL_WEIGHT_GRAMS`, and `NOVA_POST_DEFAULT_VOLUMETRIC_WEIGHT_GRAMS`.
- No local `MONOBANK_*`, `NOVA_POSHTA_*`, `NOVA_POST_AUTH_URL`, `NOVA_POST_SENDER_EMAIL`, `NOVA_POST_SENDER_COMPANY_TIN`, `NOVA_POST_SENDER_COMPANY_NAME`, or `NOVA_POST_PAYER_CONTRACT_NUMBER` entries were present during ENV-05 cleanup.
- Added generated development/test `APP_ENCRYPTION_KEY` entries to `.env` and `.env.test.local`.
- Added a placeholder comment for `APP_ENCRYPTION_KEY` in `.env.production.local`; a production secret was not invented or copied into the local production file.
- File permissions for present ignored env files were set to `600`.

Railway production variables:
- Railway MCP authentication passed before live variable work.
- Inspected production services: `web` and `worker`.
- Removed deprecated key names from `web`: `NOVA_POST_API_KEY`, `NOVA_POST_API_URL`, `NOVA_POST_DEFAULT_ACTUAL_WEIGHT_GRAMS`, `NOVA_POST_DEFAULT_HEIGHT_MM`, `NOVA_POST_DEFAULT_LENGTH_MM`, `NOVA_POST_DEFAULT_VOLUMETRIC_WEIGHT_GRAMS`, `NOVA_POST_DEFAULT_WIDTH_MM`, `NOVA_POST_PAYER_TYPE`, `NOVA_POST_SENDER_COUNTRY_CODE`, `NOVA_POST_SENDER_DIVISION_ID`, `NOVA_POST_SENDER_NAME`, and `NOVA_POST_SENDER_PHONE`.
- Removed deprecated key names from `worker`: `NOVA_POST_API_KEY`, `NOVA_POST_API_URL`, `NOVA_POST_DEFAULT_ACTUAL_WEIGHT_GRAMS`, `NOVA_POST_DEFAULT_HEIGHT_MM`, `NOVA_POST_DEFAULT_LENGTH_MM`, `NOVA_POST_DEFAULT_VOLUMETRIC_WEIGHT_GRAMS`, `NOVA_POST_DEFAULT_WIDTH_MM`, `NOVA_POST_PAYER_TYPE`, `NOVA_POST_SENDER_COUNTRY_CODE`, `NOVA_POST_SENDER_DIVISION_ID`, `NOVA_POST_SENDER_NAME`, and `NOVA_POST_SENDER_PHONE`.
- No `MONOBANK_*`, `NOVA_POSHTA_*`, `NOVA_POST_AUTH_URL`, `NOVA_POST_SENDER_EMAIL`, `NOVA_POST_SENDER_COMPANY_TIN`, `NOVA_POST_SENDER_COMPANY_NAME`, or `NOVA_POST_PAYER_CONTRACT_NUMBER` entries remained after cleanup.
- Required production `web` variables are present by name: `DATABASE_URL`, `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`, `OWNER_SETUP_TOKEN`, `APP_ENCRYPTION_KEY`, and `SHIPPING_LABEL_CREATION_MODE`.
- Required production `worker` variables are present by name: `DATABASE_URL`, `AUTO_COMPLETE_AFTER_DELIVERED_HOURS`, `APP_ENCRYPTION_KEY`, and `SHIPPING_LABEL_CREATION_MODE`.
- `APP_ENCRYPTION_KEY` was generated once, set on both `web` and `worker`, and verified to differ from `BETTER_AUTH_SECRET`.
- `SHIPPING_LABEL_CREATION_MODE` was set to `disabled` on both `web` and `worker` until owner shipping settings are saved and verified for a deliberate live-shipping cutover.

Railway verification:
- Latest ENV-05 Railway `web` deployment succeeded from GitHub `main` commit `74e82b487e7d0182df4f0179d005890034ab959d`; deployment id `b6dd81bd-8c5e-4a12-9e37-fa5905ddd18e`.
- Latest ENV-05 Railway `worker` deployment succeeded from the same GitHub commit; deployment id `3eaa4437-f2ac-49f9-b458-4ffbac9eadec`.
- `https://web-production-26609.up.railway.app/api/health` returned `status: ok`.
- `web` deploy logs showed migrations applied successfully and the Next.js server ready.
- Filtered `web` and `worker` logs did not show missing Nova Post env errors after cleanup.
- `worker` deploy logs included `Shipment worker is ready.`
- Local Playwright coverage verifies `/dashboard/settings/shipping` opens for a seeded owner and remains denied for a `user` role; no authenticated production smoke was run in ENV-05.
