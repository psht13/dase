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

Nova Post secrets should be set only for the live flows that use them. MonoPay variables are needed only for historical Monobank retry/webhook support, not for the active customer payment option or production startup. Keep Railway values in secure service variables or variable references.

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

The active public customer payment UI should show `Оплата картою онлайн` and the instruction `Після оплати надішліть квитанцію продавцю в Instagram чат`. It should not show MonoPay or Monobank copy unless a historical MonoPay retry/status path is deliberately opened for an old order.

If no active requisites exist, the owner dashboard shows a warning and the public customer form offers only `Післяплата`.

When the seller receives and verifies the transfer, the owner order details page provides `Позначити оплату отриманою`. This marks the manual-card payment paid and only then schedules shipment preparation.

## Shipping Creation Mode

Current Railway `web` and `worker` envs, plus local `.env`, `.env.test.local`, and `.env.production.local`, use `SHIPPING_LABEL_CREATION_MODE=live` against the Nova Post stage/test API.

Use `SHIPPING_LABEL_CREATION_MODE=disabled` only when Nova Post sender settings are intentionally incomplete. Owners will see a Ukrainian notice, shipment creation jobs will stop before live label creation, and no real tracking number is recorded.

Use `SHIPPING_LABEL_CREATION_MODE=mock` only for local fixture-based development. Keep `USE_MOCK_SHIPPING_CARRIERS` blank when `SHIPPING_LABEL_CREATION_MODE=live` should use Nova Post stage/test credentials. Playwright e2e forces shipping creation to `disabled` in its dev server command so automated tests never call the live Nova Post API.

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

Do not commit or store the production smoke credentials in repo files or Railway runtime variables.

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
