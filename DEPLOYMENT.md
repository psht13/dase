# Deployment

## Railway Services

Target platform: Railway.

Required services:
- `web` - Next.js App Router application.
- `worker` - shipment and tracking background worker.
- `postgres` - Railway PostgreSQL database.

Do not create S3, R2, Railway Storage Bucket, or any object storage service for the initial deployment. Product image handling currently stores validated external image URLs in `product_images` only.

## Repository Configuration

The `web` service uses the default Railway config file at `railway.json`:
- builder: Railpack
- build command: `pnpm build`
- start command: `pnpm start`
- pre-deploy command: `pnpm db:migrate`
- health check path: `/api/health`

The `worker` service should use the custom Railway config file path `/railway.worker.json`:
- builder: Railpack
- build command: `pnpm build`
- start command: `pnpm worker:start`
- no public health check

Railway config-as-code applies per service deployment. If both `web` and `worker` are connected to the same repository root, set the worker service config file path to `/railway.worker.json` in Railway service settings or set the worker start command directly to `pnpm worker:start`.

## Environment Variables

Set all values through Railway service variables or shared environment variables. Never commit real values.

Required for production `web` and `worker`:
- `DATABASE_URL` - Railway PostgreSQL private connection string.
- `BETTER_AUTH_SECRET` - at least 32 characters.
- `BETTER_AUTH_URL` - canonical deployed web URL.
- `AUTO_COMPLETE_AFTER_DELIVERED_HOURS` - default `24` if omitted.

Required for MonoPay / Monobank production payment flow:
- `MONOBANK_TOKEN`
- `MONOBANK_API_URL`
- `MONOBANK_PUBLIC_KEY`
- `MONOBANK_WEBHOOK_SECRET_OR_PUBLIC_KEY`

Required for Nova Poshta production shipment flow:
- `NOVA_POSHTA_API_KEY`
- `NOVA_POSHTA_API_URL`

Required for Ukrposhta production shipment flow:
- `UKRPOSHTA_BEARER_TOKEN`
- `UKRPOSHTA_COUNTERPARTY_TOKEN`
- `UKRPOSHTA_API_URL`

Test-only variables that must not be enabled in production:
- `PLAYWRIGHT_E2E`
- `USE_MOCK_SHIPPING_CARRIERS`
- `DATABASE_URL_TEST`

`DATABASE_URL` must be available to both `web` and `worker`. The `postgres` service should expose it through Railway variable references rather than copied plaintext credentials.

## Deployment Flow

1. Connect the GitHub repository `psht13/dase` to Railway.
2. Create or confirm services named `web`, `worker`, and `postgres`.
3. Attach Railway PostgreSQL to the project and expose `DATABASE_URL` to `web` and `worker`.
4. Configure GitHub autodeploy on `main` for `web` and `worker`.
5. Enable Railway Wait for CI so Railway deploys only after the GitHub Actions workflow succeeds.
6. Ensure `main` is protected in GitHub and requires the CI workflow before merge.
7. Confirm `web` uses `railway.json` and `worker` uses `/railway.worker.json`.
8. Push to `main`; Railway builds both services.
9. The `web` pre-deploy command runs `pnpm db:migrate` before the web process starts.
10. The `worker` process starts with `pnpm worker:start` after deployment.

## Migration Notes

`pnpm db:migrate` uses Drizzle Kit and requires `DATABASE_URL`.

Run migrations against development or staging PostgreSQL first. Do not run destructive tests or manual schema experiments against production. The worker should use the same migrated database because pg-boss manages its queue schema in PostgreSQL through `DATABASE_URL`.

If a migration fails during Railway pre-deploy, Railway should not promote that web deployment. Fix the migration locally, verify it against a safe database, then redeploy.

## Rollback Notes

Use Railway deployment rollback for the affected service if a deployment fails after release.

For schema changes, prefer forward-compatible migrations. If a rollback requires schema reversal, create and test a new corrective migration instead of manually editing production data.

If the worker causes shipment or tracking errors, stop or roll back the `worker` service first while leaving `web` available for owners and customers.

## Manual External API Verification

Do not call live external APIs in CI. After production variables are configured, verify manually in Railway using a low-risk test order:
- MonoPay invoice creation redirects to the expected Monobank payment URL.
- Monobank webhook signature verification accepts a signed provider callback.
- Duplicate Monobank webhooks are idempotent.
- Stale Monobank webhook events do not overwrite newer payment state.
- Nova Poshta city and warehouse search works for a known city.
- Nova Poshta shipment creation returns a tracking number for a test shipment.
- Ukrposhta city or post-office lookup returns only active offices where the provider marks availability.
- Ukrposhta shipment creation returns a provider shipment reference for a test shipment.
- Shipment tracking updates move orders through Ukrainian dashboard statuses.

## Current Blocker

Railway MCP was attempted from this workspace on 2026-04-30, but the Railway CLI token is invalid or expired. Because of that, live service creation, GitHub linking, variable configuration, PostgreSQL provisioning, autodeploy settings, and migration verification could not be completed from this session.
