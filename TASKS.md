# Dase prompts - owner-configured Nova Post settings and env cleanup v1

Цей файл містить набір промптів для Codex, щоб перенести налаштування доставки з env у UI, прибрати застарілі env ключі, очистити Railway/local envs і документацію.

## Контекст аудиту

Поточний стан репозиторію:

- `.env.example` все ще містить історичні MonoPay / Monobank змінні, `NOVA_POSHTA_*` compatibility names, а також багато `NOVA_POST_SENDER_*`, `NOVA_POST_PAYER_*`, `NOVA_POST_DEFAULT_*` змінних, які мають перейти в UI налаштування власника.
- `src/shared/config/env.ts` все ще валідує Monobank змінні, `NOVA_POSHTA_*`, `NOVA_POST_API_*`, sender, payer і parcel defaults.
- `shipping-carrier-factory.ts` все ще будує Nova Post carrier з env і допускає fallback на `NOVA_POSHTA_API_KEY` / `NOVA_POSHTA_API_URL`.
- `nova-post-shipping-carrier.ts` вже використовує новий Nova Post API shape і JWT provider, але отримує API/sender config з фабрики.
- В UI вже є приклад owner settings у `/dashboard/settings/payment`, тож shipping settings краще робити аналогічно.
- Monobank активний flow уже замінено на manual card transfer, але Monobank provider factory, webhook route, retry actions і env docs усе ще можуть залишатися як історичний код.
- Потрібно не просто змінити `.env.example`, а також прибрати застарілі keys із локальних `.env*` файлів під `.gitignore` і Railway service variables через Railway MCP.

## Основні правила для всіх промптів

- Перед змінами читати `AGENTS.md`, `spec.md`, `DEPLOYMENT.md`, `README.md`, `docs/adr/0001-architecture.md`.
- Не комітити secrets.
- Не друкувати secret values у логах, тестах, docs або final summary.
- Усі user-facing повідомлення українською.
- Commit messages англійською, imperative sentence case, без Conventional Commits prefix.
- Не створювати S3/R2/object storage.
- Не додавати роль `admin`.
- Не видаляти production дані.
- Не запускати destructive DB операції без явної forward-only міграції.
- Усі тести, лінтери й build мають пройти перед completion.

Обовʼязкові перевірки після кожного промпта, якщо prompt не є чисто operational Railway/local-env cleanup:

```bash
pnpm lint
pnpm typecheck
pnpm test:coverage
pnpm test:e2e
pnpm build
```

---

================================================================================
PROMPT ENV-00 - audit env usage, docs, Railway vars, and local ignored envs
================================================================================

```text
Read AGENTS.md, spec.md, DEPLOYMENT.md, README.md, and docs/adr/0001-architecture.md first.

Goal:
Perform a complete audit of environment variables and shipping/payment configuration before refactoring.

Context:
The app currently still documents and validates env keys that should no longer be owner-managed through env:
- Monobank / MonoPay keys
- legacy NOVA_POSHTA_* keys
- NOVA_POST_API_KEY / NOVA_POST_API_URL / NOVA_POST_AUTH_URL
- NOVA_POST_SENDER_* keys
- NOVA_POST_PAYER_* keys
- NOVA_POST_DEFAULT_* parcel keys

The desired future state:
- API URL, API key, sender information, payer settings, and parcel defaults for Nova Post must be configured from owner UI, not env.
- Env should keep only infrastructure/runtime secrets such as DATABASE_URL, auth secret, owner setup token, global shipping kill switch, and a settings encryption key.
- Local ignored env files and Railway variables should be cleaned after code supports UI-based settings.
- Monobank is no longer part of the active payment flow.

Tasks:
1. Inspect current env usage across the codebase.
   Search for all references to:
   - MONOBANK
   - MonoPay
   - Monobank
   - NOVA_POSHTA
   - NOVA_POST_API
   - NOVA_POST_AUTH
   - NOVA_POST_SENDER
   - NOVA_POST_PAYER
   - NOVA_POST_DEFAULT
   - UKRPOSHTA
   - SHIPPING_LABEL_CREATION_MODE
   - USE_MOCK_SHIPPING_CARRIERS
2. Inspect docs:
   - .env.example
   - README.md
   - DEPLOYMENT.md
   - spec.md
   - TASKS.md if present
   - any docs/ files
3. Inspect migrations and schema:
   - payment_provider enum
   - shipment_carrier enum
   - payment_requisites table
   - existing carrier/cache tables
4. Inspect current owner settings UI:
   - /dashboard/settings/payment
   - dashboard navigation
   - shared form/card/action UI components
5. Use Railway MCP to inspect production and test service variables.
   - Do not print secret values.
   - Print only variable names and service names.
   - Identify deprecated names that need deletion later.
6. Inspect local ignored env files if they exist:
   - .env
   - .env.local
   - .env.test.local
   - .env.production
   - .env.production.local
   Do not print secret values. Only list deprecated key names found.
7. Create or update `docs/audits/env-cleanup.md` with:
   - current deprecated keys found;
   - where each key is referenced;
   - proposed new owner-settings model;
   - planned migration strategy;
   - Railway cleanup plan;
   - local env cleanup plan;
   - clear distinction between code changes and operational cleanup.
8. Do not change runtime behavior yet.
9. Run at least:
   - pnpm lint
   - pnpm typecheck
10. Commit docs-only audit.

Important:
Do not remove env keys in this prompt.
Do not change Railway variables in this prompt.
Do not modify local ignored env files in this prompt.
Do not expose secrets.

Commit message:
Audit environment configuration
```

---

================================================================================
PROMPT ENV-01 - add encrypted owner Nova Post settings model
================================================================================

```text
Read AGENTS.md, spec.md, DEPLOYMENT.md, README.md, docs/adr/0001-architecture.md, and docs/audits/env-cleanup.md first.

Goal:
Add a secure owner-configured Nova Post settings model in the database.

Required product behavior:
Owners should configure Nova Post settings inside the app UI instead of env:
- API environment selector:
  - Test / stage API: https://api-stage.novapost.pl/v.1.0/
  - Production global API: https://api.novapost.com/v.1.0/
  - Production Ukraine API: https://api.novaposhta.ua/v.1.0/
  - Custom URL
- API key
- optional auth URL override
- sender country code
- sender division / branch id
- sender full name
- sender phone
- sender email
- sender company TIN
- sender company name
- payer type
- payer contract number
- default parcel width/length/height
- default actual weight
- default volumetric weight
- shipping creation enabled/disabled per owner

Security:
- API key must not be stored in plaintext.
- Add an application encryption service.
- Use AES-256-GCM or another modern authenticated encryption method available in Node.js.
- Add a new env var only for encryption:
  APP_ENCRYPTION_KEY=
- APP_ENCRYPTION_KEY must be at least 32 bytes encoded as base64 or hex.
- Do not use BETTER_AUTH_SECRET as the encryption key.
- Do not show the decrypted API key after save.
- Store only encrypted API key and a safe preview, for example last 4 characters.
- Never log decrypted values.
- Never put API key in client components except during the owner form submit.
- Update .env.example with APP_ENCRYPTION_KEY only; do not keep Nova Post API key/env sender fields.

Database:
1. Add a new owner-scoped table, for example `owner_shipping_settings`.
2. Suggested fields:
   - id
   - owner_id unique
   - carrier, preferably `NOVA_POST`
   - is_enabled
   - api_environment: `stage` | `production_global` | `production_ukraine` | `custom`
   - api_base_url
   - auth_url nullable
   - api_key_encrypted nullable
   - api_key_preview nullable
   - sender_country_code
   - sender_division_id
   - sender_name
   - sender_phone
   - sender_email nullable
   - sender_company_tin nullable
   - sender_company_name nullable
   - payer_type: `Recipient` | `Sender` | `ThirdPerson`
   - payer_contract_number nullable
   - default_width_mm
   - default_length_mm
   - default_height_mm
   - default_actual_weight_grams
   - default_volumetric_weight_grams
   - created_at
   - updated_at
3. Use a forward-only Drizzle migration.
4. Keep nullable fields where needed so deployment does not break existing data.

Carrier naming:
- Prefer new application-level name `NOVA_POST`.
- If the database currently has enum value `NOVA_POSHTA`, evaluate whether a safe forward migration can rename it to `NOVA_POST`.
- If enum renaming is risky for existing production data, keep the database enum temporarily but isolate it behind typed mapping and document why.
- Do not keep `NOVA_POSHTA_*` env compatibility names.

Architecture:
- Add domain/application ports for shipping settings.
- Add infrastructure Drizzle repository.
- Add in-memory repository for tests.
- Do not put settings persistence logic inside UI components.

Tests:
- encryption/decryption roundtrip;
- encryption rejects missing/invalid APP_ENCRYPTION_KEY in production when saving API key;
- API key is not returned to UI from read models;
- api key preview is safe;
- validation for endpoint selector;
- validation for custom URL;
- validation for sender/parcel/payer settings;
- repository save/update/list behavior.

Docs:
- Update spec.md.
- Update README.md.
- Update DEPLOYMENT.md.
- Mention official Nova Post docs links in docs:
  - https://api-portal.novapost.com/en/about-api/general/
  - https://api-portal.novapost.com/en/api-nova-post/start/api-keys/
  - https://api-portal.novapost.com/en/api-nova-post/start/endpoints/
  - https://api-portal.novapost.com/en/api-nova-post/start/token-usage/
- Mention that Nova Post API keys are now configured in UI and encrypted in DB.

Run:
pnpm lint
pnpm typecheck
pnpm test:coverage
pnpm build

Commit message:
Add owner shipping settings model
```

---

================================================================================
PROMPT ENV-02 - add owner shipping settings UI
================================================================================

```text
Read AGENTS.md, spec.md, DEPLOYMENT.md, README.md, docs/adr/0001-architecture.md, and docs/audits/env-cleanup.md first.

Goal:
Add owner UI for Nova Post settings.

Route:
- Add `/dashboard/settings/shipping`.
- Add a settings landing page if useful:
  - `/dashboard/settings`
  - cards for `Реквізити для оплати` and `Доставка`
- Update dashboard navigation so settings do not point only to payment settings.

UI requirements:
1. User-facing copy must be Ukrainian.
2. The form must be mobile-friendly and desktop-friendly.
3. Use a multi-step layout if the form is long:
   - Step 1: API доступ
   - Step 2: Відправник
   - Step 3: Параметри посилки
   - Step 4: Перевірка
4. API section:
   - Environment selector:
     - `Тестове середовище`
     - `Production global`
     - `Production Україна`
     - `Власний URL`
   - Show the resolved URL preview.
   - Default for a new owner should be `Тестове середовище` with:
     `https://api-stage.novapost.pl/v.1.0/`
   - For custom URL, validate HTTPS URL.
   - Auth URL override should be optional and collapsed under advanced settings.
   - API key input should be password-like.
   - If an API key already exists, show `API ключ збережено` and a safe preview, never the full key.
   - Provide a checkbox or separate button to replace the key.
5. Sender section:
   - full name
   - phone
   - email
   - country code
   - division/branch ID
   - company TIN and company name optional
6. Payer/parcel section:
   - payer type
   - contract number if payer type is ThirdPerson
   - width/length/height
   - actual weight
   - volumetric weight
7. Add enabled/disabled switch:
   - `Створення відправлень увімкнено`
   - If disabled, city/warehouse search may still work only if API settings exist, but label creation must not run.
8. Add a `Перевірити підключення` owner action:
   - Calls Nova Post stage/selected endpoint through server code.
   - Tests auth/JWT and a small harmless lookup, not shipment creation.
   - Does not log API key.
   - Shows Ukrainian result.

Architecture:
- UI components under shipping/ui.
- Server actions thin.
- Application use cases for:
  - get owner shipping settings
  - update owner shipping settings
  - test owner Nova Post connection
- Infrastructure repository implements persistence.
- Do not put encryption logic in UI.

Tests:
- form renders Ukrainian labels;
- default endpoint selector chooses test/stage;
- custom URL validation;
- saved API key is not displayed;
- replacing key works;
- disabled/enabled state works;
- connection test action uses saved settings;
- user role cannot access shipping settings;
- owner can access shipping settings.

E2E:
- owner opens `/dashboard/settings/shipping`;
- sees test endpoint default;
- saves settings with a fake API key in mocked test mode;
- sees safe key preview;
- navigates away and back;
- full key is not displayed.

Docs:
- Update README.md and DEPLOYMENT.md with UI-based configuration instructions.
- State that Nova Post API key/sender settings must be configured from dashboard, not env.
- Keep official docs links in docs.

Run:
pnpm lint
pnpm typecheck
pnpm test:coverage
pnpm test:e2e
pnpm build

Commit message:
Add owner shipping settings UI
```

---

================================================================================
PROMPT ENV-03 - refactor shipping to use owner settings instead of env
================================================================================

```text
Read AGENTS.md, spec.md, DEPLOYMENT.md, README.md, docs/adr/0001-architecture.md, and docs/audits/env-cleanup.md first.

Goal:
Make all active Nova Post API usage read owner settings from the database instead of env.

Current problem:
Shipping carrier factory currently reads API URL, API key, sender data, payer settings, and parcel defaults from env. This must be replaced by owner-configured settings.

Requirements:
1. Remove active use of these env names from shipping runtime code:
   - NOVA_POST_API_KEY
   - NOVA_POST_API_URL
   - NOVA_POST_AUTH_URL
   - NOVA_POST_SENDER_*
   - NOVA_POST_PAYER_*
   - NOVA_POST_DEFAULT_*
   - NOVA_POSHTA_API_KEY
   - NOVA_POSHTA_API_URL
2. Keep only infrastructure/global envs:
   - DATABASE_URL
   - APP_ENCRYPTION_KEY
   - SHIPPING_LABEL_CREATION_MODE if used as a global kill switch
   - normal auth/runtime envs
3. Refactor shipping carrier construction so it accepts an explicit `OwnerShippingSettings` or `NovaPostRuntimeConfig`, not `process.env`.

Public customer city/warehouse lookup:
1. Public delivery form must include the public order token in city/warehouse lookup requests.
2. `/api/carriers/cities` and `/api/carriers/warehouses` must identify the order by public token and load that order owner's shipping settings.
3. Do not accept raw ownerId from public query params.
4. If settings are missing or disabled, return a safe Ukrainian error message:
   `Доставка тимчасово недоступна. Зверніться до продавця.`
5. Do not reveal whether API key is missing to the public customer.
6. For owner dashboard/settings test action, detailed Ukrainian missing-field messages are allowed.

Worker shipment creation:
1. When `createShipmentJobUseCase` runs, load order by id.
2. Use `order.ownerId` to load owner shipping settings.
3. Build Nova Post carrier from decrypted owner settings.
4. If settings are missing/disabled, do not call Nova Post.
5. Mark shipment as failed or blocked according to existing domain flow, append safe audit event:
   `Налаштування доставки не завершено. Відправлення не створено.`
6. Do not log secrets.

Shipping label creation mode:
- Keep `SHIPPING_LABEL_CREATION_MODE` only as global kill switch if needed:
  - `disabled`: never create labels regardless of owner settings.
  - `live`: use owner settings.
  - `mock`: test/local only.
- Production must reject `mock`.
- Do not use `SHIPPING_LABEL_CREATION_MODE` as a substitute for owner settings.

Nova Post adapter:
- Keep the adapter focused on provider HTTP mapping.
- It should not know about env.
- It receives base URL, auth URL, API key, sender config, payer config, and parcel defaults explicitly.

Tests:
- public city lookup uses token -> order -> owner settings;
- public lookup cannot pass arbitrary ownerId;
- missing settings returns public-safe Ukrainian error;
- worker uses owner settings;
- worker does not call Nova Post when settings disabled;
- global kill switch disabled prevents live label creation;
- API key is decrypted only server-side;
- no active shipping code reads deprecated env keys.

E2E:
- owner saves shipping settings;
- customer delivery city/warehouse lookup works with mocked Nova Post via saved settings;
- missing settings public page shows safe Ukrainian delivery-unavailable copy.

Docs:
- Update spec.md and DEPLOYMENT.md.
- Document new flow: owner configures shipping settings in dashboard.
- Document that Railway no longer needs Nova Post API/sender env keys.

Run:
pnpm lint
pnpm typecheck
pnpm test:coverage
pnpm test:e2e
pnpm build

Commit message:
Use owner shipping settings
```

---

================================================================================
PROMPT ENV-04 - remove deprecated env keys and inactive Monobank integration
================================================================================

```text
Read AGENTS.md, spec.md, DEPLOYMENT.md, README.md, docs/adr/0001-architecture.md, and docs/audits/env-cleanup.md first.

Goal:
Remove deprecated environment variables and inactive payment/shipping integration references from code and tracked documentation.

Deprecated tracked env keys to remove from .env.example and active env validation:
- MONOBANK_TOKEN
- MONOBANK_API_URL
- MONOBANK_PUBLIC_KEY
- MONOBANK_WEBHOOK_SECRET_OR_PUBLIC_KEY
- NOVA_POSHTA_API_KEY
- NOVA_POSHTA_API_URL
- NOVA_POST_API_KEY
- NOVA_POST_API_URL
- NOVA_POST_AUTH_URL
- NOVA_POST_SENDER_COUNTRY_CODE
- NOVA_POST_SENDER_DIVISION_ID
- NOVA_POST_SENDER_NAME
- NOVA_POST_SENDER_PHONE
- NOVA_POST_SENDER_EMAIL
- NOVA_POST_SENDER_COMPANY_TIN
- NOVA_POST_SENDER_COMPANY_NAME
- NOVA_POST_PAYER_TYPE
- NOVA_POST_PAYER_CONTRACT_NUMBER
- NOVA_POST_DEFAULT_WIDTH_MM
- NOVA_POST_DEFAULT_LENGTH_MM
- NOVA_POST_DEFAULT_HEIGHT_MM
- NOVA_POST_DEFAULT_ACTUAL_WEIGHT_GRAMS
- NOVA_POST_DEFAULT_VOLUMETRIC_WEIGHT_GRAMS

Allowed env keys after cleanup should be close to:
- DATABASE_URL
- DATABASE_URL_TEST
- BETTER_AUTH_SECRET
- BETTER_AUTH_URL
- OWNER_SETUP_TOKEN
- APP_ENCRYPTION_KEY
- SHIPPING_LABEL_CREATION_MODE, only if retained as global kill switch
- AUTO_COMPLETE_AFTER_DELIVERED_HOURS
- NODE_ENV
- CI
- PLAYWRIGHT_E2E
- PLAYWRIGHT_BASE_URL
- RUN_AUTH_SMOKE
- E2E_AUTH_EMAIL
- E2E_AUTH_PASSWORD
- RUN_PROD_SMOKE
- E2E_PROD_EMAIL
- E2E_PROD_PASSWORD
- USE_MOCK_SHIPPING_CARRIERS, only if still used for local tests

Monobank cleanup:
1. Active customer flow is manual card transfer, not Monobank.
2. Remove active Monobank routes, provider factory, retry actions, webhook handler, tests, docs, and env validation.
3. If existing migrations or production enum values still include MONOBANK, do not break deployed databases.
   - Prefer a safe forward-only migration only if it can be done safely.
   - Otherwise keep a minimal historical DB enum value and historical label only.
   - Do not keep Monobank env docs or runtime configuration.
4. Ensure public UI never shows MonoPay/Monobank.
5. Ensure owner UI does not show Monobank retry actions.
6. Ensure payment flow only offers:
   - `Оплата картою онлайн`
   - `Післяплата`
7. Ensure manual card transfer still works and requires owner card requisites.

NOVA_POSHTA cleanup:
1. Remove `NOVA_POSHTA_*` env compatibility names.
2. Prefer application naming `NOVA_POST`.
3. If DB enum still has `NOVA_POSHTA`, either:
   - safely rename enum value to `NOVA_POST` with migration, or
   - keep it isolated as database compatibility only and do not expose it in docs/env/UI.
4. Final tracked docs should use `Nova Post` or `Нова пошта`, not `NOVA_POSHTA` env names.

Docs cleanup:
- .env.example must not contain deprecated keys.
- README.md must describe owner UI configuration.
- DEPLOYMENT.md must say Railway should not have deprecated variables.
- spec.md must reflect UI-based shipping settings and manual card payment.
- docs/audits/env-cleanup.md should mark deprecated keys as cleaned from tracked code/docs.
- If TASKS.md contains old prompts, either leave it as historical prompt archive or add a clear note that it is historical and not current runtime documentation.

Code search gate:
After cleanup, run searches:
- `MONOBANK`
- `Monobank`
- `MonoPay`
- `NOVA_POSHTA_API`
- `NOVA_POST_SENDER`
- `NOVA_POST_PAYER`
- `NOVA_POST_DEFAULT`
- `NOVA_POST_API_KEY`
- `NOVA_POST_API_URL`
Any remaining match must be either:
- old immutable migration history;
- a test explicitly asserting deprecated keys are not used;
- docs/audits historical note.
No active runtime file should depend on those env keys.

Tests:
- env validation does not accept/depend on deprecated keys;
- payment flow manual card transfer only;
- public UI has no MonoPay/Monobank text;
- shipping runtime uses owner settings only;
- docs/env example snapshot test if helpful.

Run:
pnpm lint
pnpm typecheck
pnpm test:coverage
pnpm test:e2e
pnpm build

Commit message:
Remove deprecated environment keys
```

---

================================================================================
PROMPT ENV-05 - clean local ignored env files and Railway service variables
================================================================================

```text
Read AGENTS.md, spec.md, DEPLOYMENT.md, README.md, docs/adr/0001-architecture.md, and docs/audits/env-cleanup.md first.

Goal:
Perform operational cleanup of deprecated env variables from local ignored env files and Railway variables after the code no longer needs them.

Important:
This prompt modifies non-tracked local files and Railway variables.
Do not commit local env files.
Do not print secret values.
Do not delete DATABASE_URL, auth secrets, setup token, encryption key, or other required runtime values.

Preconditions:
- Code has been updated so Nova Post API key, API URL, sender info, payer info, and parcel defaults are configured from owner UI.
- APP_ENCRYPTION_KEY exists in env validation.
- Monobank env keys are no longer required for startup or active payment flow.

Local ignored env cleanup:
1. Inspect these local files if present:
   - .env
   - .env.local
   - .env.test.local
   - .env.production
   - .env.production.local
2. Remove deprecated keys:
   - MONOBANK_TOKEN
   - MONOBANK_API_URL
   - MONOBANK_PUBLIC_KEY
   - MONOBANK_WEBHOOK_SECRET_OR_PUBLIC_KEY
   - NOVA_POSHTA_API_KEY
   - NOVA_POSHTA_API_URL
   - NOVA_POST_API_KEY
   - NOVA_POST_API_URL
   - NOVA_POST_AUTH_URL
   - NOVA_POST_SENDER_COUNTRY_CODE
   - NOVA_POST_SENDER_DIVISION_ID
   - NOVA_POST_SENDER_NAME
   - NOVA_POST_SENDER_PHONE
   - NOVA_POST_SENDER_EMAIL
   - NOVA_POST_SENDER_COMPANY_TIN
   - NOVA_POST_SENDER_COMPANY_NAME
   - NOVA_POST_PAYER_TYPE
   - NOVA_POST_PAYER_CONTRACT_NUMBER
   - NOVA_POST_DEFAULT_WIDTH_MM
   - NOVA_POST_DEFAULT_LENGTH_MM
   - NOVA_POST_DEFAULT_HEIGHT_MM
   - NOVA_POST_DEFAULT_ACTUAL_WEIGHT_GRAMS
   - NOVA_POST_DEFAULT_VOLUMETRIC_WEIGHT_GRAMS
3. Add APP_ENCRYPTION_KEY to local env files if missing.
   - Generate a safe development/test value if needed.
   - For production local file, use the same production value only if it is already securely available; otherwise leave a placeholder comment and do not invent production secrets.
4. Keep file permissions private:
   chmod 600 .env .env.local .env.test.local .env.production .env.production.local where files exist.
5. Update docs/audits/env-cleanup.md with redacted local cleanup status:
   - list file names only;
   - list removed key names only;
   - never include values.

Railway cleanup:
1. Use Railway MCP.
2. Inspect variables for:
   - web service
   - worker service
   - shared environment variables if Railway exposes them
3. Ensure required variables exist:
   - DATABASE_URL for web and worker
   - BETTER_AUTH_SECRET for web
   - BETTER_AUTH_URL for web
   - OWNER_SETUP_TOKEN for web only if setup still enabled
   - APP_ENCRYPTION_KEY for web and worker
   - AUTO_COMPLETE_AFTER_DELIVERED_HOURS for worker
   - SHIPPING_LABEL_CREATION_MODE if retained as global kill switch
4. Remove deprecated variables from web and worker:
   - all MONOBANK_* keys
   - all NOVA_POSHTA_* keys
   - all NOVA_POST_API_* keys
   - all NOVA_POST_AUTH_URL keys
   - all NOVA_POST_SENDER_* keys
   - all NOVA_POST_PAYER_* keys
   - all NOVA_POST_DEFAULT_* keys
5. If APP_ENCRYPTION_KEY is missing in Railway:
   - generate a secure value;
   - set it on web and worker;
   - do not print it.
6. Keep SHIPPING_LABEL_CREATION_MODE safe:
   - set to disabled until owner shipping settings are saved and verified, unless the user explicitly wants live immediately.
7. Redeploy web and worker if Railway variable changes require it.
8. Verify:
   - /api/health returns ok;
   - web starts without deprecated env keys;
   - worker starts;
   - dashboard settings shipping page opens;
   - app does not throw missing Nova Post env errors.

Docs:
- Update docs/audits/env-cleanup.md with redacted Railway cleanup status.
- Update DEPLOYMENT.md current Railway status.
- Update spec.md current status.

Run after code/doc updates:
pnpm lint
pnpm typecheck
pnpm test:coverage
pnpm test:e2e
pnpm build

Commit only tracked docs/code changes.
Do not commit local env files.

Commit message:
Clean deployment environment variables
```

---

================================================================================
PROMPT ENV-06 - seed or migrate existing owner shipping settings safely
================================================================================

```text
Read AGENTS.md, spec.md, DEPLOYMENT.md, README.md, docs/adr/0001-architecture.md, and docs/audits/env-cleanup.md first.

Goal:
If deprecated Nova Post env values existed before cleanup, provide a safe one-time way to move them into owner UI settings without committing secrets.

Important:
Do not print or commit secret values.
Do not run this against production unless the user explicitly approves.
Do not create settings for the wrong owner.

Tasks:
1. Add an optional one-time script:
   `pnpm settings:migrate-shipping-env`
2. The script should:
   - run only when explicitly invoked;
   - require an owner email or owner id argument;
   - read deprecated env vars from the local process only;
   - create or update that owner's shipping settings;
   - encrypt API key using APP_ENCRYPTION_KEY;
   - show only redacted key preview;
   - never print full API key;
   - refuse to run if owner not found;
   - refuse to run if APP_ENCRYPTION_KEY is missing;
   - refuse to overwrite existing owner settings unless `--force` is passed.
3. The script is mainly for test/staging migration. Production migration should be manual through UI unless explicitly approved.
4. Add tests for script parsing and use case behavior without real secrets.
5. Add docs:
   - how to use the script for local/test only;
   - how to configure production manually through UI;
   - why env keys are deprecated.
6. If the user does not need migration from old env values, still add the use case only if helpful; otherwise document manual UI setup instead.

Run:
pnpm lint
pnpm typecheck
pnpm test:coverage
pnpm build

Commit message:
Add shipping settings migration helper
```

---

================================================================================
PROMPT ENV-07 - final verification and production smoke
================================================================================

```text
Read AGENTS.md, spec.md, DEPLOYMENT.md, README.md, docs/adr/0001-architecture.md, and docs/audits/env-cleanup.md first.

Goal:
Final QA after moving shipping configuration to owner UI and cleaning deprecated env keys.

Verification checklist:

1. Code search:
   - No active runtime code reads MONOBANK_* env vars.
   - No active runtime code reads NOVA_POSHTA_* env vars.
   - No active runtime code reads NOVA_POST_API_KEY / NOVA_POST_API_URL / NOVA_POST_AUTH_URL env vars.
   - No active runtime code reads NOVA_POST_SENDER_* env vars.
   - No active runtime code reads NOVA_POST_PAYER_* env vars.
   - No active runtime code reads NOVA_POST_DEFAULT_* env vars.
   - Remaining matches are only historical migrations, explicit compatibility tests, or audit docs.

2. Docs:
   - .env.example lists only current env keys.
   - README.md describes owner shipping settings UI.
   - DEPLOYMENT.md says Railway must not contain deprecated shipping/payment env variables.
   - spec.md status updated.
   - docs/audits/env-cleanup.md complete.

3. UI:
   - Owner can open /dashboard/settings.
   - Owner can open /dashboard/settings/shipping.
   - Owner can select Nova Post API environment.
   - Default environment is test/stage.
   - Owner can enter API key and sender settings.
   - Saved API key is never displayed in full.
   - Owner can test connection.
   - Owner can enable/disable shipping creation.
   - Public delivery form uses the order owner's settings.

4. Payment:
   - Public flow shows manual online card payment and cash on delivery only.
   - No MonoPay/Monobank copy appears in active UI.
   - Owner payment requisites still work.

5. Railway:
   - Use Railway MCP to confirm deprecated variables are removed from web and worker.
   - Confirm APP_ENCRYPTION_KEY is present on web and worker.
   - Confirm health route works.
   - Confirm worker is running.
   - Confirm no startup logs mention missing Nova Post env keys.
   - Do not print secrets.

6. Production safe smoke:
   - Log in as owner using temporary credentials supplied only through local env vars.
   - Open shipping settings page.
   - Do not print saved API key.
   - If test Nova Post key is available, save it through UI and run connection test.
   - If key is not available, verify disabled/missing settings behavior is Ukrainian and safe.
   - Open public order delivery page and verify it does not offer unavailable carriers or expose settings errors.

Run:
pnpm lint
pnpm typecheck
pnpm test:coverage
pnpm test:e2e
pnpm build

If failures occur:
- Fix them.
- Re-run the failed check.
- Do not weaken tests.
- Do not reduce coverage thresholds.

Commit message:
Verify owner managed shipping settings

Final response must include:
- implemented changes;
- tests run;
- Railway cleanup status with variable names only;
- remaining manual steps for owner;
- confirmation that no secrets were printed or committed.
```

---

================================================================================
PROMPT ENV-08 - recovery prompt
================================================================================

```text
Read AGENTS.md, spec.md, DEPLOYMENT.md, README.md, docs/adr/0001-architecture.md, and docs/audits/env-cleanup.md first.

Goal:
Recover from failed env cleanup, shipping settings migration, or Railway variable update.

Instructions:
1. Do not panic-delete services, databases, migrations, or env files.
2. Identify the exact failure:
   - code compile/type error;
   - migration failure;
   - env validation failure;
   - missing APP_ENCRYPTION_KEY;
   - owner settings not found;
   - Railway variable update issue;
   - production startup issue;
   - worker startup issue;
   - public delivery lookup issue.
3. Preserve production data.
4. If a migration failed:
   - inspect the migration;
   - create a forward-only corrective migration;
   - do not manually edit production schema.
5. If Railway startup failed after removing variables:
   - verify code no longer depends on removed variables;
   - restore only required infrastructure variables;
   - do not restore deprecated sender/API keys unless needed for immediate emergency rollback.
6. If owner shipping settings are missing:
   - set SHIPPING_LABEL_CREATION_MODE=disabled temporarily;
   - show Ukrainian safe messaging;
   - guide owner to configure `/dashboard/settings/shipping`.
7. If APP_ENCRYPTION_KEY is missing:
   - add it to Railway web and worker;
   - do not print the value;
   - restart/redeploy affected services.
8. If encrypted API keys cannot decrypt:
   - do not show encrypted payloads;
   - ask owner to re-enter API key through settings UI;
   - document the recovery.
9. Run the narrowest failing test first, then full checks:
   pnpm lint
   pnpm typecheck
   pnpm test:coverage
   pnpm test:e2e
   pnpm build
10. Update docs/audits/env-cleanup.md with recovery summary.
11. Commit with an imperative sentence case message.

Commit message examples:
- Fix shipping settings migration
- Restore safe shipping startup
- Fix encrypted Nova Post settings
```
