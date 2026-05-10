# Dase

Commercial order-confirmation app for jewelry sellers.

## Local Setup

1. Install dependencies:

```bash
pnpm install
```

2. Copy `.env.example` to your local environment file and fill safe development values. Do not commit real secrets.

3. Run the development server:

```bash
pnpm dev
```

4. Open `http://localhost:3000`.

## Runtime Environment

Production `web` requires `DATABASE_URL`, `BETTER_AUTH_SECRET`, and `BETTER_AUTH_URL`. On Railway, `BETTER_AUTH_URL` must be the public HTTPS origin `https://web-production-26609.up.railway.app`; it must never be localhost, loopback, or `*.railway.internal` in production. `OWNER_SETUP_TOKEN` is required only for the production first-owner setup path while no owner exists.

Production `worker` requires `DATABASE_URL` and `AUTO_COMPLETE_AFTER_DELIVERED_HOURS`. It does not require login or setup secrets.

`APP_ENCRYPTION_KEY` is required before an owner can save a Nova Post API key. Use a base64 or hex encoded value with at least 32 decoded bytes and do not reuse `BETTER_AUTH_SECRET`.

Nova Post API keys, endpoint choice, sender, payer, parcel defaults, and the per-owner shipment creation switch are configured in the dashboard under `/dashboard/settings/shipping`. The API key is encrypted in `owner_shipping_settings`, and the owner UI shows only a safe preview such as `****7890`; never put owner Nova Post API keys or sender settings into tracked env files. Public delivery lookup and worker shipment creation resolve these saved owner settings by order context.

Owners configure payment details in `/dashboard/settings/payment`. The active customer payment flow is manual card transfer through those owner-managed requisites; no external acquiring credentials are required for normal startup.

## Створення першого owner у production

Поки в production базі немає жодного `owner`, створіть першого власника тільки через production-процес налаштування:

1. Відкрийте `https://web-production-26609.up.railway.app/setup` або `/setup` на власному домені.
2. Якщо форма просить токен, введіть значення зі змінної Railway `OWNER_SETUP_TOKEN`. Не вставляйте токен в URL, перенаправлення, логи, рядок запиту або клієнтський стан.
3. Створіть `owner` з ім’ям, email і паролем.
4. Після перенаправлення на `/login` увійдіть під щойно створеним `owner`.
5. Відкрийте `/dashboard` і перевірте, що кабінет завантажується.
6. Знову відкрийте `/setup` і перевірте, що сторінка налаштування більше недоступна після створення `owner`.
7. Після створення першого `owner` змініть або видаліть `OWNER_SETUP_TOKEN`, якщо застосунок більше не потребує його для процесу налаштування.

Опційна перевірка кількості `owner` тільки для читання, без публікації облікових даних бази даних:

```bash
psql "$DATABASE_PUBLIC_URL" <<'SQL'
BEGIN READ ONLY;
SELECT count(*)::int AS owner_count FROM users WHERE role = 'owner';
ROLLBACK;
SQL
```

## Public Order Links

Customers open `/o/[token]` to review selected products and continue to delivery while the order is waiting for confirmation.

The delivery/contact form asks for full name, phone, and an optional Instagram nickname so the seller can match the order with chat history. Instagram nicknames are stored normalized without duplicate leading `@` characters, while owner UI displays them with one leading `@`.

After a customer submits delivery/payment details, the same public link becomes a Ukrainian status page with `Замовлення #...`, current status, seller-chat instruction, selected products, and total. Reopening `/o/[token]/delivery` after confirmation shows the status page instead of the delivery form, so the customer cannot submit the same order twice.

## Manual Online Card Payment

Owners manage public payment requisites under `/dashboard/settings/payment` in `Реквізити для оплати`.

This is a manual transfer flow, not card processing. The app stores owner-provided public card/IBAN/payment details, shows only active requisites to customers, and never asks buyers for card number, expiry, CVV, or other customer card data.

Customers choose `Оплата картою онлайн`, copy one of the active owner requisites, and send the receipt to the seller in Instagram chat.

The active public customer payment UI should show `Оплата картою онлайн` and the instruction `Після оплати надішліть квитанцію продавцю в Instagram чат`. It must not show inactive acquiring copy.

If no active requisites exist, the owner dashboard shows a warning and the public customer form offers only `Післяплата`.

When the seller receives and verifies the transfer, the owner order details page provides `Позначити оплату отриманою`. This marks the manual-card payment paid and only then schedules shipment preparation.

## Shipping Creation Mode

`SHIPPING_LABEL_CREATION_MODE` is only a global label-creation kill switch. Use `live` to create shipments from saved owner Nova Post settings, `disabled` to stop worker label creation regardless of owner settings, and `mock` only for local fixture development.

Configure owner Nova Post API access and sender data from `/dashboard/settings/shipping`, not from env variables. Railway should keep only infrastructure/runtime variables and must not keep deprecated payment or owner-managed shipping variables for active runtime.

## One-Time Local Shipping Env Migration

If a local or staging shell still has old Nova Post variables loaded, migrate them into one explicit owner account:

```bash
pnpm settings:migrate-shipping-env -- --owner-email owner@example.com
```

Use `--owner-id <id>` instead of email when that is safer. The helper reads only the current process env, requires `DATABASE_URL` and `APP_ENCRYPTION_KEY`, encrypts the API key before saving it, and prints only a masked preview such as `****7890`.

It refuses to overwrite existing owner shipping settings unless `--force` is passed, and it refuses `NODE_ENV=production` unless separately approved with `--allow-production`. For production, configure Nova Post manually through `/dashboard/settings/shipping` after signing in as the correct owner.

Use `SHIPPING_LABEL_CREATION_MODE=disabled` when shipment creation must be blocked globally. Shipment creation jobs stop before live label creation, and no real tracking number is recorded.

Use `SHIPPING_LABEL_CREATION_MODE=mock` only for local fixture-based development. Playwright e2e forces shipping creation to `disabled` in its dev server command and uses saved fake owner settings plus fixture carrier lookup, so automated tests never call the live Nova Post API.

Official Nova Post references for owner settings:
- https://api-portal.novapost.com/en/about-api/general/
- https://api-portal.novapost.com/en/api-nova-post/start/api-keys/
- https://api-portal.novapost.com/en/api-nova-post/start/endpoints/
- https://api-portal.novapost.com/en/api-nova-post/start/token-usage/

## Verification

```bash
pnpm lint
pnpm typecheck
pnpm test:coverage
pnpm test:e2e
pnpm build
```

Local Playwright runs use isolated port 3100 by default so they do not attach to another app already bound to port 3000. To use a different port, set `PLAYWRIGHT_BASE_URL` and Playwright will start this repo's dev server on the matching port:

```bash
PLAYWRIGHT_BASE_URL=http://127.0.0.1:3200 pnpm test:e2e
```

The responsive QA coverage includes the critical owner and public routes at phone, tablet, and desktop viewports, including 390x844, 768x1024, and 1440x900.

Authenticated production smoke testing is opt-in and uses only temporary local shell variables:

```bash
E2E_PROD_EMAIL='owner@example.com' \
E2E_PROD_PASSWORD='temporary-password' \
pnpm test:e2e:prod
```

Do not commit or store the production smoke credentials in repo files or Railway runtime variables. Optional local-only variables `E2E_PROD_SHIPPING_API_KEY`, `E2E_PROD_SHIPPING_SENDER_DIVISION_ID`, and `E2E_PROD_PUBLIC_ORDER_URL` extend that smoke to save a Nova Post test key through the owner UI and check an existing public delivery page without printing the key.

For a DB-backed local/test environment, put the owner account only in an ignored
env file such as `.env.test.local`:

```bash
E2E_AUTH_EMAIL='owner@example.com'
E2E_AUTH_PASSWORD='temporary-password'
```

Then run the authenticated smoke against an isolated local port:

```bash
PLAYWRIGHT_BASE_URL=http://127.0.0.1:3300 pnpm test:e2e:auth
```
