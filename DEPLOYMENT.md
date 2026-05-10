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

Required for production `web`:
- `DATABASE_URL` - Railway PostgreSQL private connection string or Railway variable reference.
- `BETTER_AUTH_SECRET` - at least 32 characters.
- `BETTER_AUTH_URL` - canonical deployed web URL. For the current Railway production web service this must be exactly `https://web-production-26609.up.railway.app`.
- `NODE_ENV` - normally set to `production` by the runtime.

`BETTER_AUTH_URL` must never be `localhost`, `127.0.0.1`, `0.0.0.0`, or an internal Railway URL such as `https://web.railway.internal` in production. Production validation rejects non-public or path-based values before auth routes can redirect.

Required only when first-owner setup is available in production `web`:
- `OWNER_SETUP_TOKEN` - at least 32 characters. The `web` service validates it only for the first-owner setup path before an owner exists. Never place this token in URLs, redirects, logs, query strings, or client-side state.

Required before owner Nova Post API keys can be saved or decrypted:
- `APP_ENCRYPTION_KEY` - base64 or hex encoded key material with at least 32 decoded bytes. Configure it through secure Railway variables, do not reuse `BETTER_AUTH_SECRET`, and do not print it in logs. The ENV-01 settings model uses AES-256-GCM and stores only encrypted API keys plus a safe preview.

Required for production `worker`:
- `DATABASE_URL` - Railway PostgreSQL private connection string or Railway variable reference.
- `AUTO_COMPLETE_AFTER_DELIVERED_HOURS` - positive integer such as `24`.
- `NODE_ENV` - normally set to `production` by the runtime.

The production `worker` does not require `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`, or `OWNER_SETUP_TOKEN`.

Shared shipping mode:
- `SHIPPING_LABEL_CREATION_MODE` - `disabled`, `mock`, or `live`. This is only a global label-creation kill switch. Use `disabled` to prevent worker label creation regardless of owner settings, `live` to use saved owner Nova Post settings, and `mock` only for local fixture runs. `mock` is rejected in production.

Required only for historical MonoPay / Monobank retry or webhook verification. These are not required for `web` startup, `worker` startup, or the active manual online card transfer customer flow:
- `MONOBANK_TOKEN`
- `MONOBANK_API_URL`
- `MONOBANK_PUBLIC_KEY`
- `MONOBANK_WEBHOOK_SECRET_OR_PUBLIC_KEY`

Owner-managed Nova Post settings:
- Owners configure the Nova Post API environment, custom API URL when needed, API key, optional auth URL override, sender data, payer data, parcel defaults, and per-owner shipping creation flag in the dashboard under `/dashboard/settings/shipping`.
- Nova Post API keys and sender settings must be configured from the dashboard, not from env variables or tracked files. Active public lookup and worker shipment creation now resolve owner settings by public order token or order owner.
- Railway `web` and `worker` no longer need `NOVA_POST_API_KEY`, `NOVA_POST_API_URL`, `NOVA_POST_AUTH_URL`, `NOVA_POST_SENDER_*`, `NOVA_POST_PAYER_*`, `NOVA_POST_DEFAULT_*`, `NOVA_POSHTA_API_KEY`, or `NOVA_POSHTA_API_URL` for active shipping runtime. ENV-04 still owns deleting any existing Railway/local variables and removing deprecated tracked env references.
- The API key is encrypted in `owner_shipping_settings.api_key_encrypted`; read models expose only `api_key_preview`, for example the last four characters with masking.
- The supported API environments are stage/test `https://api-stage.novapost.pl/v.1.0/`, production global `https://api.novapost.com/v.1.0/`, production Ukraine `https://api.novaposhta.ua/v.1.0/`, and custom HTTPS URL.
- ENV-01 added the encrypted database model and application repositories, ENV-02 added the owner UI and dashboard connection test, and ENV-03 switched public lookup and worker carrier runtime to owner settings. Railway/local variable cleanup remains intentionally left for ENV-04.
- Official Nova Post references:
  - https://api-portal.novapost.com/en/about-api/general/
  - https://api-portal.novapost.com/en/api-nova-post/start/api-keys/
  - https://api-portal.novapost.com/en/api-nova-post/start/endpoints/
  - https://api-portal.novapost.com/en/api-nova-post/start/token-usage/

`NOVA_POST_PAYMENT_METHOD`, legacy sender contact ids, and Ukrposhta variables are not required for the current Nova Post v.1.0 integration. Recipient counterparty data comes from the confirmed customer delivery form for each order.

Nova Post authenticated API calls use the generated JWT as the raw `Authorization` header value. Do not prefix the JWT with `Bearer`.

Test-only variables that must not be enabled in production:
- `PLAYWRIGHT_E2E`
- `PLAYWRIGHT_BASE_URL`
- `USE_MOCK_SHIPPING_CARRIERS`
- `DATABASE_URL_TEST`

Manual authenticated smoke-test variables that must be set only in the local shell running the smoke test, not in Railway production runtime config:
- `RUN_AUTH_SMOKE`
- `E2E_AUTH_EMAIL`
- `E2E_AUTH_PASSWORD`
- `RUN_PROD_SMOKE`
- `E2E_PROD_EMAIL`
- `E2E_PROD_PASSWORD`

Tooling-managed CI variable:
- `CI` - set by GitHub Actions and used by Playwright for retry/reporting behavior.

`DATABASE_URL` must be available to both `web` and `worker`. The `postgres` service should expose it through Railway variable references rather than copied plaintext credentials.

## Локальне перемикання середовищ

Локальні файли з секретами не комітяться. `.gitignore` має покривати `.env`, `.env.*`, `.env.local`, `.env.test.local`, `.env.production`, і `.env.production.local`, але залишати `.env.example` відстежуваним.

Поточна схема після DB-01:
- `.env` - швидкий локальний файл для розробки та тестових перевірок. Він має використовувати стару/current Railway PostgreSQL базу `Postgres` через `DATABASE_PUBLIC_URL` або локальну PostgreSQL базу.
- `.env.test.local` - запасний локальний тестовий файл із тим самим test/staging підключенням.
- `.env.production.local` - локальний файл тільки для emergency production checks на довіреній машині. Він має використовувати нову production Railway PostgreSQL базу `Postgres-1P5k` через `DATABASE_PUBLIC_URL`, production `BETTER_AUTH_URL`, production `BETTER_AUTH_SECRET`, і production `OWNER_SETUP_TOKEN`.

Для звичайної локальної роботи тримайте test/staging значення в `.env`:

```bash
cp .env.test.local .env
```

Для короткої production-перевірки на довіреній локальній машині тимчасово скопіюйте production файл у `.env`:

```bash
cp .env.production.local .env
```

Після production-перевірки одразу поверніть `.env` на test/staging:

```bash
cp .env.test.local .env
```

Ніколи не комітьте локальні env файли або значення секретів. Не вставляйте приватні Railway runtime URL з `postgres.railway.internal` у локальний `.env`, якщо локальна машина не підключена через Railway CLI/proxy; для звичайного локального доступу використовуйте тільки `DATABASE_PUBLIC_URL`.

Локальний `pnpm test:e2e` запускає dev server із `PLAYWRIGHT_E2E=1` і навмисно очищає `DATABASE_URL` / `DATABASE_URL_TEST`, щоб браузерні тести працювали на ізольованих in-memory адаптерах і не змінювали Railway бази з локальних env файлів.

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

Current forward-only app migration:
- `drizzle/0004_cute_veda.sql` adds nullable `customers.instagram_username` for optional customer Instagram nicknames. Existing customer rows remain valid and no secret or environment variable is involved.
- `drizzle/0005_wonderful_preak.sql` adds `MANUAL_CARD_TRANSFER` to `payment_provider` and creates owner-scoped `payment_requisites` for active manual online card transfer details. No new environment variable is involved.
- `drizzle/0006_skinny_lockheed.sql` creates owner-scoped `owner_shipping_settings` plus dedicated Nova Post settings enums. It does not rename the existing `shipment_carrier` enum value `NOVA_POSHTA`, because historical shipment rows and compatibility code still depend on that database value.

If a migration fails during Railway pre-deploy, Railway should not promote that web deployment. Fix the migration locally, verify it against a safe database, then redeploy.

## Rollback Notes

Use Railway deployment rollback for the affected service if a deployment fails after release.

For schema changes, prefer forward-compatible migrations. If a rollback requires schema reversal, create and test a new corrective migration instead of manually editing production data.

If the worker causes shipment or tracking errors, stop or roll back the `worker` service first while leaving `web` available for owners and customers.

## Manual External API Verification

Do not call live external APIs in CI. After production variables are configured, verify manually in Railway using a low-risk test order:
- Open `/setup` before any owner exists, enter `OWNER_SETUP_TOKEN` into the Ukrainian setup-token field, create the first owner, then confirm `/setup` shows the Ukrainian unavailable state. Do not put `OWNER_SETUP_TOKEN` in the URL.
- Confirm `/login` accepts the owner credentials, `/logout` ends the session, and a `user` role cannot access `/dashboard`.
- Before saving Nova Post owner settings, configure `APP_ENCRYPTION_KEY` as a secure Railway variable. Open `/dashboard/settings/shipping`, save a test API key and sender settings from the dashboard, then confirm the UI shows only the masked preview, not the decrypted key.
- With `SHIPPING_LABEL_CREATION_MODE=disabled`, confirm the owner order details page shows the Ukrainian disabled-shipping notice and no live Nova Post shipment is created.
- Owner payment settings allow creating active requisites under `/dashboard/settings/payment`, and the public customer payment step shows only active requisites for `Оплата картою онлайн`.
- If no active requisites exist, confirm the owner dashboard warning appears and the public customer payment step does not offer online card payment.
- For an online-card order, confirm owner order details show `Позначити оплату отриманою`; after using it, payment status becomes paid and shipment preparation is queued only after that action.
- Historical MonoPay invoice creation redirects to the expected Monobank payment URL when the retry path is used.
- Historical MonoPay retry shows `Повторити оплату` when a confirmed order is missing a provider invoice or when payment failed.
- Monobank webhook signature verification accepts a signed provider callback.
- Duplicate Monobank webhooks are idempotent.
- Stale Monobank webhook events do not overwrite newer payment state.
- Nova Post city and warehouse search works for a known city through mocked CI tests and a low-risk manual production check.
- Nova Post shipment creation returns a tracking number for a test shipment only after `SHIPPING_LABEL_CREATION_MODE=live` and the order owner has enabled complete Nova Post settings in `/dashboard/settings/shipping`.
- Nova Post tracking sync maps provider status codes into Ukrainian dashboard shipment statuses.
- The stored label reference points to Nova Post `/shipments/print`; downloading/serving labels requires a server-side authorized request because the provider endpoint requires JWT authorization.
- Ukrposhta is not shown in the public customer form during the Nova Post MVP; historical records are labeled `Укрпошта (вимкнено)`.
- Shipment tracking updates move orders through Ukrainian dashboard statuses.

## Production Auth Smoke Test

Run the authenticated production smoke test only from a local shell with temporary credentials:

```bash
E2E_PROD_EMAIL='owner@example.com' \
E2E_PROD_PASSWORD='temporary-password' \
pnpm test:e2e:prod
```

The smoke test opens the Railway production URL, signs in, verifies `/dashboard`, `/dashboard/products`, and `/dashboard/orders`, logs out through the POST logout button, asserts the browser ends at `https://web-production-26609.up.railway.app/login?logout=1`, and fails if any browser request targets `https://localhost:8080`.

For a DB-backed local or test environment, store the account only in an ignored
env file such as `.env.test.local`:

```bash
E2E_AUTH_EMAIL='owner@example.com'
E2E_AUTH_PASSWORD='temporary-password'
```

Run the auth smoke against an isolated local port:

```bash
PLAYWRIGHT_BASE_URL=http://127.0.0.1:3300 pnpm test:e2e:auth
```

`RUN_AUTH_SMOKE=1` uses the configured database and real login instead of the
in-memory `PLAYWRIGHT_E2E=1` fallback. It still disables shipment creation for
the dev server so the login smoke never calls live carrier APIs.

## Створення першого owner у production

Поки в новій production базі немає жодного `owner`, створюйте першого власника тільки через production-процес налаштування:

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

## Current Railway Status

Railway authentication was refreshed and Railway MCP was retried on 2026-04-30.

Completed live setup:
- Railway project `dase` was created and linked: https://railway.com/project/42c716e7-674c-4ca6-bafc-2bc59fabb79a
- Services exist in the `production` environment: `web`, `worker`, `Postgres-1P5k`, and `Postgres`.
- `Postgres-1P5k` is the production PostgreSQL service after DB-01; `Postgres` is retained as the test/staging database service.
- No S3, R2, Railway Storage Bucket, or object storage service was created.
- `web` and `worker` are connected to GitHub repository `psht13/dase` on branch `main`.
- GitHub autodeploy is enabled for both `web` and `worker`.
- `web` uses `/railway.json`, `pnpm build`, `pnpm db:migrate`, `pnpm start`, and `/api/health`.
- `worker` uses `/railway.worker.json`, `pnpm build`, and `pnpm worker:start`.
- Required runtime variables were set securely in Railway variables, including `DATABASE_URL` as a Railway reference to `Postgres-1P5k` for production `web` and `worker`.
- `OWNER_SETUP_TOKEN` was configured securely on 2026-04-30 with deploy triggering skipped; current runtime validation requires it only for the production `web` first-owner setup path. The `worker` no longer requires login/setup-only secrets. Do not expose the value in logs or commits.
- Railway web domain: https://web-production-26609.up.railway.app
- Web health check verified: `/api/health` returns `status: ok`.
- Worker runtime verified: deployment logs include `Shipment worker is ready.`
- Railway PostgreSQL connectivity and migrations were verified with a read-only table count check through the Railway public database proxy.
- Нова production база досі не має жодного `owner` після DB-03 перевірки; створіть першого власника через `/setup` з `OWNER_SETUP_TOKEN`.

Remaining manual production verification:
- Configure real Monobank credentials in Railway variables only if historical MonoPay retry/webhook verification is intentionally needed; no Monobank variable is required for the active customer payment flow.
- Nova Post stage/test API variables and live shipment creation mode are configured on both `web` and `worker`. Run a low-risk shipment smoke test after creating the first `owner`.
- Do not configure Ukrposhta for the active MVP; re-enable a future carrier only through the central carrier registry and updated deployment docs.
- Run the external API checklist above with low-risk production test data.

Prompt 09 production smoke on 2026-05-08:
- Unauthenticated production health passed at `https://web-production-26609.up.railway.app/api/health` with `status: ok`.
- Authenticated production smoke was not run because temporary local `E2E_PROD_EMAIL` and `E2E_PROD_PASSWORD` were not set in the shell. Do not configure these values in Railway runtime variables or commit them to repository files.

## DB-00 план розділення Railway PostgreSQL

Аудит виконано 2026-05-09 без створення нових баз, без перемикання змінних і без перейменування сервісів.

Поточний безпечний стан:
- Проєкт Railway: `dase`; середовище: `production`.
- Production сервіси: `web`, `worker` і `Postgres`.
- Поточний сервіс бази даних: `Postgres` (`aff7...cb4d`), позначка для розділення: `test/staging candidate`.
- `web` (`663c...998f`) і `worker` (`9335...e9b1`) зараз резолвлять `DATABASE_URL` у приватний Railway Postgres endpoint поточного сервісу `Postgres`.
- Останні успішні деплої `web` і `worker` використовують GitHub `main` коміт `2f252b83a32c755f390f5a9a72ee8f8fa7b04809` (`Add tasks for railway DB split`).
- `web` запускає `pnpm db:migrate` перед `pnpm start`; це має залишатися production воротами міграції до того, як `worker` почне використовувати нову базу.
- `worker` стартує через `pnpm worker:start` і не повинен отримувати нову production базу, доки deploy `web` з міграціями не завершиться успішно.
- Поточний `Postgres` має `postgres-volume`, змонтований у `/var/lib/postgresql/data`. Railway volume backups/snapshots підтримуються для сервісів із volume, але доступний MCP/CLI аудит показав volume і не відкрив список наявних backup-записів або розкладів.
- Поточний `Postgres` надає приватну Railway мережу для runtime сервісів і `DATABASE_PUBLIC_URL` для локального доступу через Railway public proxy. Використовуйте `DATABASE_PUBLIC_URL` у локальному `.env`, коли поточна база стане test/staging; ніколи не вставляйте повне значення у відстежувані файли.
- Локальні `.env`, `.env.production.local` і `.env.production` відсутні в перевіреній робочій копії. Вони покриті `.gitignore` і мають залишатися невідстежуваними.

Послідовність production розділення:
1. Створити новий Railway PostgreSQL сервіс для production.
2. Перед будь-яким перемиканням створити або перевірити manual backup/snapshot/export поточного сервісу `Postgres`.
3. Залишити поточний `Postgres` як `test/staging candidate`; не перейменовувати його, доки кожне посилання `DATABASE_URL` не буде перевірене.
4. Встановити production `web` `DATABASE_URL` на новий production PostgreSQL reference.
5. Спочатку задеплоїти `web`, щоб `pnpm db:migrate` міг мігрувати нову production базу.
6. Після успішного `web` deploy і health check встановити production `worker` `DATABASE_URL` на той самий новий production PostgreSQL reference і задеплоїти або перезапустити `worker`.
7. Поточний/test `DATABASE_PUBLIC_URL` тримати тільки в локальному `.env` для development або staging перевірки.
8. Production значення тримати тільки в локальному `.env.production.local` або `.env.production` для швидкого перемикання; ці файли не комітити.
9. Коли нова production база буде live, відкрити `/setup`, ввести `OWNER_SETUP_TOKEN` в українське поле setup-token, створити першого `owner`, потім перевірити, що `/setup` недоступний, а `/login` відкриває `/dashboard` для цього owner.

## DB-01 production PostgreSQL split

Виконано 2026-05-09.

Pre-switch audit:
- Railway MCP confirmed production services `web`, `worker`, and `Postgres`.
- Existing `web` (`663c...998f`) and `worker` (`9335...e9b1`) `DATABASE_URL` values resolved to the same redacted private Railway PostgreSQL endpoint as current `Postgres` (`aff7...cb4d`) before the switch.
- Current `Postgres` has volume `postgres-volume` (`c4f...a598`) mounted at `/var/lib/postgresql/data`.
- Available Railway MCP/CLI commands can list volumes but do not expose backup creation. Before deleting, mutating, or repurposing the current DB, create a manual Railway backup in the dashboard: open project `dase` -> environment `production` -> service `Postgres` -> `Backups` tab -> create a manual backup for `postgres-volume` and verify the backup timestamp. The current DB must remain untouched as test/staging.

Result:
- Created new Railway PostgreSQL service `Postgres-1P5k` (`f7fd...3271`) for production. Railway generated this service name; the available MCP/CLI commands do not expose service renaming.
- Retained old/current `Postgres` (`aff7...cb4d`) as the test/staging database service. It was not deleted, mutated, or repurposed.
- Set production `web` `DATABASE_URL` to the `Postgres-1P5k` Railway reference first. The `worker` remained on the old DB until web migration verification passed.
- Redeployed `web`; deployment `5265...5bcd` succeeded, `pnpm db:migrate` reported migrations applied successfully, and `/api/health` returned `status: ok`.
- Read-only schema verification through the new production database public proxy returned 17 public tables, all 16 expected app tables present, and zero owners.
- Set production `worker` `DATABASE_URL` to the same `Postgres-1P5k` Railway reference only after web verification passed.
- Redeployed `worker`; deployment `a0be...3271` succeeded and deploy logs include `Shipment worker is ready.`
- Final redacted variable comparison showed production `web` and `worker` resolve to the new production database fingerprint and no longer resolve to the old `Postgres` fingerprint.
- The first production owner must be created in the new empty DB through `/setup` with `OWNER_SETUP_TOKEN`.
- No object storage service was created.
- Local verification after the documentation update passed: `pnpm lint`, `pnpm typecheck`, `pnpm test:coverage`, `pnpm test:e2e`, and `pnpm build`.

## DB-03 перевірка production setup першого owner

Виконано 2026-05-09 без створення production `owner`.

Перевірка:
- Railway MCP підтвердив production сервіси `web`, `worker`, `Postgres-1P5k` і `Postgres`; останні production деплої `web` і `worker` успішні.
- Перевірка змінних Railway з редагуванням секретних значень підтвердила, що production `web` має `DATABASE_URL` як посилання на `Postgres-1P5k`, `BETTER_AUTH_URL=https://web-production-26609.up.railway.app`, `BETTER_AUTH_SECRET`, `OWNER_SETUP_TOKEN` і `NODE_ENV=production`. Значення секретів не друкувалися.
- Запит тільки для читання проти `Postgres-1P5k` через публічний proxy повернув 17 `public` таблиць і `owner_count=0`.
- `/setup` відкриває українську форму `Створення першого власника` з полями `Токен налаштування`, `Ім’я власника`, `Електронна пошта`, `Пароль` і кнопкою `Створити власника`.
- Спроба з недійсним токеном налаштування показала українську помилку `Токен налаштування недійсний або відсутній`, а повторний запит тільки для читання підтвердив `owner_count=0`.
- Створення через дійсний токен, `/login`, `/dashboard` і стан недоступності після створення owner не виконувалися, бо в цьому запуску не було явного дозволу створити production `owner`.

Ручні кроки створення задокументовані вище в розділі `Створення першого owner у production`.

## DB-04 recovery audit after database split

Виконано 2026-05-09 без видалення сервісів бази даних, без destructive міграцій, без зміни production даних і без публікації секретів.

Root cause status:
- Активної поломки після розділення production/test баз не знайдено.
- Потенційний ризик був у тому, що `web` або `worker` могли залишитися на старій test/staging базі, але перевірка показала, що обидва production сервіси зараз резолвлять `DATABASE_URL` у нову production базу `Postgres-1P5k`.

Railway стан:
- Production сервіси існують: `web`, `worker`, `Postgres-1P5k`, `Postgres`.
- `Postgres-1P5k` - production PostgreSQL. `Postgres` - retained test/staging PostgreSQL.
- Останній успішний `web` deploy: `5265...5bcd`, GitHub commit `2f252b83a32c755f390f5a9a72ee8f8fa7b04809`, config `/railway.json`.
- Останній успішний `worker` deploy: `a0be...3271`, той самий GitHub commit, config `/railway.worker.json`.
- `web` і `worker` `DATABASE_URL` резолвляться в `postgres-1p5k.railway.internal:5432/<db>`.
- Test/staging `Postgres` резолвиться в `postgres.railway.internal:5432/<db>` і не використовується production `web` або `worker`.

Логи та перевірки:
- `web` deploy logs: `pnpm db:migrate` завершився з `migrations applied successfully`; у фільтрованих логах не знайдено migration failure, auth env validation failure, `DATABASE_URL` errors або owner setup errors.
- `worker` deploy logs: є `Shipment worker is ready.`; у фільтрованих логах не знайдено `DATABASE_URL` errors, pg-boss startup errors, migration/table-missing errors або relation errors.
- Read-only запит до `Postgres-1P5k` через public proxy повернув 17 `public` таблиць, жодної відсутньої expected app table, `owner_count=0`, і 7 pg-boss таблиць.
- `https://web-production-26609.up.railway.app/api/health` повертає `status: ok`.
- `/logout` повертає `307` на `https://web-production-26609.up.railway.app/login?logout=1`, не на localhost, і встановлює secure Better Auth cookie cleanup headers.
- `/setup` доступний і показує українську форму першого owner, бо production база ще має `owner_count=0`.

Resolution:
- Runtime змінні не виправлялися, бо `web` і `worker` вже використовують правильну production базу.
- `worker` не зупинявся і не redeploy-ився, бо `web` migration gate вже успішний, health check зелений, а worker ready.
- Додатковий `pnpm db:migrate` не запускався вручну, бо production база вже має таблиці і Railway `web` pre-deploy migration завершився успішно.
- Owner setup статус незмінний: першого production `owner` треба створити через `/setup` з `OWNER_SETUP_TOKEN`, коли буде явний дозвіл створити реальний production акаунт.
- Local verification після DB-04 документації пройшла: `pnpm lint`, `pnpm typecheck`, `pnpm test:coverage`, `pnpm test:e2e`, і `pnpm build`.

## Shipping creation mode enabled for Nova Post stage/test

Оновлено 2026-05-09 після підтвердження, що інтеграція Nova Post використовує stage/test API.

- Railway production `web` і `worker` отримали `SHIPPING_LABEL_CREATION_MODE=live`.
- На обох сервісах налаштовано Nova Post stage/test API host, sender country, test sender division/name/phone, payer type `Recipient`, and parcel dimension/weight defaults.
- Локальні ignored файли `.env`, `.env.test.local`, and `.env.production.local` також переведені на `SHIPPING_LABEL_CREATION_MODE=live` з тими самими test sender/payer/parcel defaults.
- Для локального live режиму `USE_MOCK_SHIPPING_CARRIERS` має бути порожнім; explicit `SHIPPING_LABEL_CREATION_MODE=live` використовує Nova Post adapter, а не fixture carrier.
- Значення `NOVA_POST_API_KEY`, database URLs, auth secrets, and owner setup token не друкувалися і не додавалися у tracked files.
- Playwright e2e залишається ізольованим: `playwright.config.ts` явно задає `SHIPPING_LABEL_CREATION_MODE=disabled`, тому автоматизовані тести не викликають live Nova Post API.
- ENV-03 supersedes the env-backed Nova Post runtime path: active shipping runtime now reads encrypted owner settings from the database. Delete the older Nova Post Railway/local variables only during ENV-04 operational cleanup.
