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
- `OWNER_SETUP_TOKEN` - at least 32 characters; required by shared production env validation. The `web` service validates it only when the `/setup` form is submitted before the first owner exists. Never place this token in URLs, redirects, logs, query strings, or client-side state.
- `AUTO_COMPLETE_AFTER_DELIVERED_HOURS` - default `24` if omitted.
- `NODE_ENV` - normally set to `production` by the runtime.

Required for MonoPay / Monobank production payment flow:
- `MONOBANK_TOKEN`
- `MONOBANK_API_URL`
- `MONOBANK_PUBLIC_KEY`
- `MONOBANK_WEBHOOK_SECRET_OR_PUBLIC_KEY`

Required for Nova Post production shipment flow:
- `NOVA_POST_API_KEY` - secret API key used only server-side to generate temporary JWT tokens.
- `NOVA_POST_API_URL` - default `https://api.novapost.com/v.1.0/`; use `https://api-stage.novapost.pl/v.1.0/` for stage/test verification.
- `NOVA_POST_AUTH_URL` - optional override for the authorization endpoint when it cannot be derived from `NOVA_POST_API_URL`; by default the app calls `/clients/authorization`.
- `NOVA_POST_SENDER_COUNTRY_CODE` - normally `UA`.
- `NOVA_POST_SENDER_DIVISION_ID` - sender branch/division id from Nova Post.
- `NOVA_POST_SENDER_NAME`
- `NOVA_POST_SENDER_PHONE`
- `NOVA_POST_SENDER_EMAIL` - optional.
- `NOVA_POST_SENDER_COMPANY_TIN` - optional.
- `NOVA_POST_SENDER_COMPANY_NAME` - optional.
- `NOVA_POST_PAYER_TYPE` - `Recipient`, `Sender`, or `ThirdPerson`; default `Recipient`.
- `NOVA_POST_PAYER_CONTRACT_NUMBER` - required by Nova Post for some non-cash or third-person payer scenarios.
- `NOVA_POST_DEFAULT_WIDTH_MM`, `NOVA_POST_DEFAULT_LENGTH_MM`, `NOVA_POST_DEFAULT_HEIGHT_MM`
- `NOVA_POST_DEFAULT_ACTUAL_WEIGHT_GRAMS`, `NOVA_POST_DEFAULT_VOLUMETRIC_WEIGHT_GRAMS`

Deprecated compatibility names:
- `NOVA_POSHTA_API_KEY`
- `NOVA_POSHTA_API_URL`

Prefer the `NOVA_POST_*` names for all new Railway variables. The compatibility names are accepted temporarily only to avoid breaking existing environments during rollout.

Test-only variables that must not be enabled in production:
- `PLAYWRIGHT_E2E`
- `PLAYWRIGHT_BASE_URL`
- `USE_MOCK_SHIPPING_CARRIERS`
- `DATABASE_URL_TEST`

Tooling-managed CI variable:
- `CI` - set by GitHub Actions and used by Playwright for retry/reporting behavior.

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
- Open `/setup` before any owner exists, enter `OWNER_SETUP_TOKEN` into the Ukrainian setup-token field, create the first owner, then confirm `/setup` shows the Ukrainian unavailable state. Do not put `OWNER_SETUP_TOKEN` in the URL.
- Confirm `/login` accepts the owner credentials, `/logout` ends the session, and a `user` role cannot access `/dashboard`.
- MonoPay invoice creation redirects to the expected Monobank payment URL.
- MonoPay retry shows `Повторити оплату` when a confirmed order is missing a provider invoice or when payment failed.
- Monobank webhook signature verification accepts a signed provider callback.
- Duplicate Monobank webhooks are idempotent.
- Stale Monobank webhook events do not overwrite newer payment state.
- Nova Post city and warehouse search works for a known city through mocked CI tests and a low-risk manual production check.
- Nova Post shipment creation returns a tracking number for a test shipment after sender config is present.
- Nova Post tracking sync maps provider status codes into Ukrainian dashboard shipment statuses.
- The stored label reference points to Nova Post `/shipments/print`; downloading/serving labels requires a server-side authorized request because the provider endpoint requires JWT authorization.
- Ukrposhta is not shown in the public customer form during the Nova Post MVP; historical records are labeled `Укрпошта (вимкнено)`.
- Shipment tracking updates move orders through Ukrainian dashboard statuses.

## Current Railway Status

Railway authentication was refreshed and Railway MCP was retried on 2026-04-30.

Completed live setup:
- Railway project `dase` was created and linked: https://railway.com/project/42c716e7-674c-4ca6-bafc-2bc59fabb79a
- Services exist in the `production` environment: `web`, `worker`, and `Postgres`.
- No S3, R2, Railway Storage Bucket, or object storage service was created.
- `web` and `worker` are connected to GitHub repository `psht13/dase` on branch `main`.
- GitHub autodeploy is enabled for both `web` and `worker`.
- `web` uses `/railway.json`, `pnpm build`, `pnpm db:migrate`, `pnpm start`, and `/api/health`.
- `worker` uses `/railway.worker.json`, `pnpm build`, and `pnpm worker:start`.
- Required runtime variables were set securely in Railway variables, including `DATABASE_URL` as a Railway reference to `Postgres`.
- `OWNER_SETUP_TOKEN` was configured securely for `web` and `worker` production variables on 2026-04-30 with deploy triggering skipped; do not expose the value in logs or commits.
- Railway web domain: https://web-production-26609.up.railway.app
- Web health check verified: `/api/health` returns `status: ok`.
- Worker runtime verified: deployment logs include `Shipment worker is ready.`
- Railway PostgreSQL connectivity and migrations were verified with a read-only table count check through the Railway public database proxy.

Remaining manual production verification:
- Configure real Monobank and Nova Post credentials in Railway variables.
- Do not configure Ukrposhta for the active MVP; re-enable a future carrier only through the central carrier registry and updated deployment docs.
- Run the external API checklist above with low-risk production test data.
