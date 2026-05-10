# spec.md

## Product goal

Build a small commercial web app for jewelry sellers.

Owners can manage products, create custom order links, send those links to customers, collect delivery/payment information, create shipping labels, and track fulfillment.

## Language

All user-facing UI text must be Ukrainian.

This includes:
- dashboard pages;
- public order pages;
- forms;
- buttons;
- validation messages;
- loading, empty, error, and success states;
- status labels.

Code identifiers and commit messages can be English.

## Roles

Only these roles are allowed:

### owner

Authenticated seller/owner.

Can:
- access dashboard;
- manage products;
- create order links;
- view orders;
- update statuses and tags;
- view payments and shipments;
- retry shipment creation;
- manage owner-level settings if implemented.

### user

Regular user/customer role.

Notes:
- A public customer does not need to authenticate to open an order link.
- If the auth library requires a default role for newly created accounts, use `user`.
- Do not create or use `admin`.

## Current status

Status: owner authentication, first-owner setup hardening, product catalog, multi-step owner order builder, public order review, post-confirmation public status page, customer delivery confirmation, optional customer Instagram nickname capture, owner payment requisite settings, manual online card transfer customer flow, shipment worker automation, owner order management, UI polish, dashboard filter/action feedback polish, final responsive QA, Railway project/service deployment, Railway PostgreSQL provisioning, GitHub autodeploy configuration, runtime-aware environment validation, release-candidate hardening, final production-readiness audit, production PostgreSQL split, owner-based Nova Post settings, deprecated env cleanup, optional local/test shipping env migration helper, and ENV-07 final verification implemented

Repository audit on 2026-04-30:
- Next.js App Router, TypeScript strict mode, pnpm, Tailwind CSS, and shadcn/ui-compatible configuration are scaffolded.
- ESLint, Vitest coverage, Testing Library, MSW dependency, Playwright, Drizzle, Better Auth skeleton, and worker start script are configured.
- `/api/health` returns a no-store JSON health response.
- Runtime-aware environment validation is implemented in `src/shared/config/env.ts`.
- Starter UI copy is Ukrainian and covered by unit and E2E tests.
- Initial Drizzle migrations create users, products, product images, orders, order items, customers, payments, shipments, order tags, audit events, webhook events, and carrier directory cache tables.
- Roles are restricted to `owner` and `user`; the default user role is `user`.
- Domain tests cover order total calculation, quantity validation, order status transitions, product snapshots in order items, unsupported role rejection, image URL validation, and public order token generation.
- Application repository ports are defined at module boundaries; Drizzle repository implementations live under infrastructure modules.

Owner auth and catalog update on 2026-04-30:
- Better Auth is configured with the Drizzle adapter, UUID database IDs, and Next.js route handlers under `/api/auth/[...all]`.
- Better Auth tables are modeled in Drizzle as `accounts`, `sessions`, and `verifications`; `users` now includes `email_verified` and `image`.
- Dashboard routes live under `/dashboard` using an `(owner)` route group and require an authenticated `owner` role.
- `user` role sessions are denied dashboard access.
- Owner dashboard shell, product list, product creation, product editing, and active/inactive toggle are implemented.
- Product forms use React Hook Form and Zod with Ukrainian validation messages.
- Product images remain external image URLs only, with one or more validated URLs per product and a simple preview in the owner form.
- Product create/update/toggle behavior is implemented through application use cases and repository ports, not directly inside React components.
- Playwright e2e uses a test-only seeded owner session and in-memory catalog fallback when Railway/local PostgreSQL credentials are unavailable. This fallback is disabled in production.

Owner order builder and public order link update on 2026-04-30:
- `/dashboard/orders/new` lets an authenticated `owner` select active catalog products, set quantities, review totals, create an order link, and copy the generated public URL.
- Order creation is implemented through application use cases and repository ports. The created order is stored as `SENT_TO_CUSTOMER`, gets `sent_at`, a random URL-safe `public_token`, and a 14-day `public_token_expires_at`.
- Order items store product snapshots for name, SKU, unit price, line total, quantity, and image URLs, so public pages do not depend on later catalog changes.
- Order creation appends an `ORDER_CREATED` audit event with owner actor metadata and non-secret order summary payload.
- `/o/[token]` renders a public Ukrainian order review page using only the token URL. Missing, malformed, expired, and cancelled links render a safe Ukrainian unavailable page.
- `/o/[token]/delivery` originally existed as the next-step delivery/payment form placeholder.
- Playwright e2e covers owner product creation, owner order link creation, and public review of the selected product list.

Customer delivery confirmation update on 2026-04-30:
- `/o/[token]/delivery` now renders the full customer delivery and payment form with Ukrainian labels, placeholders, validation errors, loading states, empty states, and success/error states.
- The public customer form is mobile-first and split into four UI-only steps: `Контакти`, `Доставка`, `Оплата`, and `Перевірка`.
- The form collects full name, phone, delivery carrier, city/locality, branch/warehouse/post office, and payment method.
- React Hook Form and Zod validate the delivery form; server actions re-validate submitted data before calling application use cases.
- Customer confirmation is implemented through `confirmPublicOrderUseCase`, repository ports, and infrastructure adapters rather than business logic in React components.
- Valid confirmation creates a `customers` row, stores a pending `payments` row, stores a pending `shipments` row with internal carrier DTO data, links the order to the customer, sets `confirmed_at`, and changes order status to `CONFIRMED_BY_CUSTOMER`.
- `ShippingCarrier` application port defines `searchCities`, `searchWarehouses`, `createShipment`, and `getShipmentStatus`.
- Nova Post infrastructure adapters map external API shapes into internal city, warehouse, shipment, and status DTOs.
- A central shipping carrier registry marks Nova Post as the only active MVP carrier and keeps Ukrposhta as disabled legacy data for historical records.
- `/api/carriers/cities` and `/api/carriers/warehouses` are thin route handlers that call cached carrier search use cases and return internal DTOs only.
- City and warehouse lookups use `carrier_directory_cache`; Playwright and test runs use deterministic in-memory mocked carrier data and never call live carrier APIs.
- MSW contract tests cover Nova Post response mapping, status mapping, carrier error handling, and disabled-carrier guards.
- Playwright e2e covers a customer confirming delivery with mocked carrier lookup.

Manual card payment update on 2026-05-10:
- The active customer payment methods are `Оплата картою онлайн` and `Післяплата`.
- `Оплата картою онлайн` is a manual transfer flow backed by owner-managed requisites in `/dashboard/settings/payment`; the app does not process customer cards or require acquiring runtime credentials.
- Public order pages and the delivery/payment form do not show inactive acquiring copy or retry actions.
- Owner order details expose `Позначити оплату отриманою` for pending manual-card payments and do not show inactive acquiring retry actions.
- Existing database enum history and nullable provider invoice fields are retained for old rows, but active runtime code no longer creates invoices, handles acquiring webhooks, or reads acquiring env variables.
- Cash on delivery skips online payment and keeps the existing confirmation/shipment preparation path.

Shipment worker update on 2026-04-30:
- `pg-boss` is the selected Postgres-backed job queue; `pnpm worker:start` starts the shipment worker entrypoint.
- Worker jobs are registered for `create-shipment`, `sync-shipment-status`, and `auto-complete-delivered-order`.
- Confirmed cash-on-delivery orders enqueue `create-shipment` after the customer confirmation use case stores customer, payment, and shipment rows.
- Successful manual-card owner confirmation marks payment as paid, moves the order into shipment preparation, and enqueues `create-shipment`.
- `create-shipment` calls the selected `ShippingCarrier`, stores tracking number, carrier document id, and label URL/reference, marks the shipment created, moves the order to `SHIPMENT_CREATED`, and schedules status sync.
- Shipment creation failures mark the shipment `FAILED`, append a Ukrainian audit payload, and rethrow so pg-boss retry behavior can apply.
- `sync-shipment-status` calls carrier tracking, maps carrier status into internal shipment/order statuses, schedules another sync for active shipments, and schedules auto-completion for delivered shipments.
- `auto-complete-delivered-order` moves delivered orders to `COMPLETED` after `AUTO_COMPLETE_AFTER_DELIVERED_HOURS`.
- Owner retry action `retryShipmentCreationAction` re-enqueues failed shipment creation and returns Ukrainian dashboard-facing messages.
- Dashboard/status helper labels for shipment statuses and worker job names are Ukrainian and covered by tests.
- Public payment status copy remains focused on manual card transfer and cash-on-delivery; inactive acquiring retry/status copy is not shown.
- Tests cover job enqueueing, shipment creation success and failure, tracking status mapping, auto-completion rules, retry action copy, pg-boss retry options, and Ukrainian shipment status/job labels.

Owner order management update on 2026-04-30:
- `/dashboard/orders` lists owner orders with Ukrainian labels and filters for status, delivery carrier, payment method, tag, date range, order ID/display number, customer phone, tracking number, Instagram nickname, or customer full-name search.
- `/dashboard/orders/[orderId]` shows products, customer info, delivery info, payment info, shipment info, status history, and audit events.
- Owner order reads are implemented through application use cases and repository ports; React components and route files do not contain order management business rules.
- Order tag storage is implemented for Drizzle and in-memory fallback through `OrderTagRepository`.
- Owners can create tags, assign existing tags, remove tags, and filter the order list by tag.
- Manual status updates use the domain transition rules and append `ORDER_STATUS_UPDATED` audit events.
- Shipment retry is exposed on the owner details page and reuses the existing failed-shipment retry use case.
- All owner order management labels, filters, table headings, empty states, action messages, status text, and audit labels are Ukrainian.
- Unit and UI tests cover list orders, filters, tag assignment/removal, audit event creation, manual status update rules, owner order pages, Ukrainian labels, and order tag repositories.
- Playwright e2e covers owner order filtering, tag creation, manual status update, audit visibility, and the shipment retry entry point.

UI polish and accessibility verification update on 2026-04-30:
- Added a global Ukrainian skip link to the main content area and visible focus treatment for links, buttons, inputs, selects, and textareas.
- Product, delivery, order builder, owner status, tag, and retry forms now expose async updates through live regions where relevant; field-level errors are connected to controls with `aria-describedby` and invalid states on the customer/product forms.
- Loading copy uses Ukrainian text with proper ellipses, decorative icons are hidden from assistive technology, and product/order images include explicit dimensions.
- Public customer review and delivery pages were checked at a 390px mobile viewport with Playwright MCP; the public customer E2E test asserts no horizontal overflow on critical public screens.
- Playwright MCP inspected product creation, owner order builder, public order review, customer delivery/payment confirmation, owner orders list, and owner order details.
- MCP verification found and fixed a stale city lookup empty-state message that could appear after selecting a city.
- Playwright E2E now asserts the keyboard skip link, product validation error state, public mobile labels, and stable product creation waits before order-builder navigation.
- Code and test fixtures no longer contain an `admin` role string; unsupported-role tests use a neutral unsupported role.

Railway deployment readiness update on 2026-04-30:
- `/api/health` already exists and remains the Railway web health check endpoint.
- Added `pnpm start` as the production web start command for Railway.
- Added `railway.json` for the `web` service with Railpack build, `pnpm build`, `pnpm start`, `pnpm db:migrate` as the pre-deploy command, `/api/health` health check, and restart policy.
- Added `railway.worker.json` for the `worker` service with Railpack build and `pnpm worker:start`.
- Moved `tsx` to runtime dependencies because the worker service starts TypeScript through the `worker:start` script.
- Added `DEPLOYMENT.md` with Railway services, env vars, deployment flow, rollback notes, migration notes, manual external API verification, and the external-image-URL-only image strategy.
- Added a deployment configuration test to keep web and worker Railway commands aligned with the documented deployment plan.
- Railway MCP was attempted during Prompt 10, but live Railway configuration was initially blocked because the Railway CLI token was invalid or expired; this was later retried successfully after authentication was refreshed.

Release candidate hardening update on 2026-04-30:
- Production domain/application layer imports were audited; no production domain/application files import React, Next.js, Drizzle, infrastructure, or UI code.
- Dashboard catalog read paths now go through catalog application use cases for owner product listing and owner-scoped product lookup.
- Source, schema, and tests were audited for forbidden roles; only `owner` and `user` roles are present outside documentation describing the forbidden-role rule.
- User-facing UI copy was audited and remains Ukrainian, with brand names such as Dase and legacy external acquiring kept as proper names.
- Product image handling remains external URL only through `product_images`; no object storage service or upload path was added.
- Worker error logging now formats errors through a safe logger that redacts credentialed URLs and sensitive environment assignments before printing.
- Environment documentation now includes every app/tooling variable read by the repository, including `PLAYWRIGHT_BASE_URL`, `NODE_ENV`, and `CI`.
- External API adapters remain covered by MSW contract tests and fixture adapters; CI does not call live legacy external acquiring or Nova Post APIs.
- Public order routes expose only token-scoped public order review/payment status data and do not expose full internal order IDs.
- Owner dashboard routes continue to require an authenticated `owner`; `user` role sessions are redirected away from `/dashboard`.
- Railway MCP was attempted again during Prompt 11 with `check_railway_status`, but live Railway configuration was initially blocked by invalid or expired Railway authentication.

Production owner access and payment/shipment safety update on 2026-04-30, repaired on 2026-05-07:
- Added production Ukrainian auth UI at `/login`, `/logout`, and `/setup`.
- The home page CTA is a real link. It points to `/setup` while no `owner` exists and to `/login` after the first owner exists.
- `/setup` creates the first `owner` only while no owner exists; after an owner exists it shows the Ukrainian unavailable state.
- `/setup` no longer accepts or requires `OWNER_SETUP_TOKEN` in the URL. Production `/setup` renders a Ukrainian setup-token field inside the first-owner form and validates the submitted token only in the server action.
- Non-production setup allows first-owner creation without a setup token.
- `OWNER_SETUP_TOKEN` is validated only by the production `web` first-owner setup path while setup is available, documented in `.env.example` and `DEPLOYMENT.md`, and configured securely without committing the value.
- Login now signs in through a Better Auth-backed server action so the session cookie is set before redirecting to `/dashboard`.
- Dashboard access redirects unauthenticated visitors to `/login`; authenticated `user` role sessions remain denied dashboard access.
- Owner sessions persist across `/dashboard`, `/dashboard/products`, `/dashboard/orders`, `/dashboard/orders/new`, hard reloads, client-side navigation, and browser back/forward.
- Customer confirmation writes now support a customer-confirmation unit of work so customer, order, payment, shipment, and audit rows use transaction-scoped repositories in PostgreSQL.
- legacy external acquiring invoice creation now supports retry when a confirmed order has a legacy external acquiring payment without `providerInvoiceId`, or when a previous legacy external acquiring payment failed.
- Public order review and owner order details expose the Ukrainian `Повторити оплату` action when legacy external acquiring retry is available.
- Tests cover first owner setup, setup blocked after an owner exists, form-based setup-token handling, Ukrainian login labels, owner dashboard access, user dashboard denial, real setup/login persistence, transaction wiring, legacy external acquiring retry eligibility, and public/owner retry UI.

Railway live setup retry on 2026-04-30:
- Railway authentication was refreshed and Railway MCP `check_railway_status` passed.
- Created and linked Railway project `dase`: https://railway.com/project/42c716e7-674c-4ca6-bafc-2bc59fabb79a
- Provisioned Railway PostgreSQL as service `Postgres`; no S3/R2/Railway Storage Bucket was created.
- Created Railway services `web` and `worker`.
- Connected both `web` and `worker` to GitHub repository `psht13/dase` on branch `main` and verified autodeploy is enabled.
- Generated the web Railway domain: https://web-production-26609.up.railway.app
- Configured required runtime variables securely in Railway service variables, including `DATABASE_URL` references to `Postgres`, `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`, `NODE_ENV=production`, and `AUTO_COMPLETE_AFTER_DELIVERED_HOURS=24`.
- Verified `web` deploys from `/railway.json` with Railpack, `pnpm build`, `pnpm db:migrate` pre-deploy, `pnpm start`, `/api/health`, and restart-on-failure policy.
- Verified `worker` deploys from `/railway.worker.json` with Railpack, `pnpm build`, `pnpm worker:start`, and restart-on-failure policy.
- Verified the Railway web deployment succeeded and `/api/health` returns `status: ok`.
- Verified the Railway worker deployment succeeded and logs `Shipment worker is ready.`
- Verified Railway PostgreSQL connectivity through the Railway public database proxy with a read-only query; `publicTableCount` was 16 after migration.
- External production credentials for legacy external acquiring and Nova Post still require manual configuration in Railway before live payment/shipping verification. Future carriers must be documented and enabled through the carrier registry before production use.

Nova Post API replacement update on 2026-05-07:
- Removed the legacy Nova Poshta JSON adapter and replaced it with `NovaPostShippingCarrier` plus `NovaPostJwtProvider`.
- The adapter uses official Nova Post API v.1.0 endpoints: production `https://api.novapost.com/v.1.0/`, stage/test `https://api-stage.novapost.pl/v.1.0/`, authorization `GET /clients/authorization?apiKey=...`, directory lookup through `GET /divisions`, shipment creation through `POST /shipments`, tracking through `GET /shipments/tracking/history`, and label references through `GET /shipments/print`.
- `Nova Post owner API key` is exchanged server-side for a JWT token; the JWT is cached for less than one hour and refreshed before expiration. API keys and JWTs are not logged or included in safe application errors.
- Nova Post v.1.0 requests send the generated JWT as the raw `Authorization` header value. Nova Post rejects a `Bearer `-prefixed JWT for directory requests.
- Public carrier directory route handlers still return internal DTOs only and map provider failures to safe Ukrainian messages.
- Shipment creation validates required sender config before calling Nova Post. Missing sender country, sender division, sender name, or sender phone fails safely, stores a Ukrainian audit reason, and leaves the owner retry path available.
- New preferred env names are `Nova Post owner API key`, `Nova Post owner API URL`, and optional `Nova Post owner auth URL`; `legacy Nova Poshta API key env` and `legacy Nova Poshta API URL env` are temporarily accepted as deprecated compatibility names.
- Public customer delivery now exposes `Нова пошта` as the only active carrier. The database/internal enum value remains `NOVA_POSHTA` for compatibility with existing rows and worker code.
- MSW tests cover JWT generation, JWT caching, JWT refresh, city/warehouse mapping, shipment creation mapping, tracking status mapping, safe provider errors, no credential logging, and missing sender config blocking live shipment calls.

Shipping label safety update on 2026-05-07:
- Added explicit `SHIPPING_LABEL_CREATION_MODE=disabled|mock|live`.
- Production defaults to `disabled` unless Railway variables explicitly set `SHIPPING_LABEL_CREATION_MODE=live`; production rejects `mock`.
- `mock` mode is local/e2e-only and uses deterministic fixture shipment creation instead of Nova Post live label creation.
- `disabled` mode stops create-shipment jobs before any carrier adapter is called, marks the shipment failed without a tracking number, appends a Ukrainian audit event, and shows owners the Ukrainian disabled-shipping notice.
- `live` mode requires complete Nova Post API, sender, payer, and parcel defaults before the app can validate production env. The worker also validates live shipment readiness before resolving the carrier adapter.
- Nova Post sender/counterparty data is modeled around the official v.1.0 sender/recipient payload shape. Sender settings are env-backed for now; recipient counterparty data comes from each confirmed customer delivery form.
- Ukrposhta remains disabled legacy data and was not reintroduced.
- Tests cover disabled mode provider avoidance, missing live config provider avoidance, deterministic mock mode, disabled retry safety, disabled owner copy, and production env validation.

Owner Nova Post settings model update on 2026-05-10:
- Added owner-scoped `owner_shipping_settings` with `owner_id` uniqueness, `NOVA_POST` owner-settings carrier, API environment selector, API base URL, optional auth URL, encrypted API key, safe API key preview, sender identity, sender branch/division, payer settings, default parcel dimensions/weights, per-owner shipping creation flag, and timestamps.
- Added dedicated database enums `owner_shipping_carrier`, `nova_post_api_environment`, and `nova_post_payer_type`. The existing `shipment_carrier` enum still contains `NOVA_POSHTA` for historical shipment rows and current worker/runtime code; renaming it is deferred until the later carrier switchover can verify production data safely.
- Added an application encryption service port and a Node.js AES-256-GCM implementation. `APP_ENCRYPTION_KEY` must be base64 or hex encoded with at least 32 decoded bytes and must not reuse `BETTER_AUTH_SECRET`.
- Owner Nova Post API keys are no longer documented in tracked env templates. They are owner settings saved through the application model, encrypted in the database, and exposed to read models only as `apiKeyConfigured` plus a masked preview such as `****7890`; decrypted keys are not returned to UI read models.
- Validation covers the official endpoint selector values: stage/test `https://api-stage.novapost.pl/v.1.0/`, production global `https://api.novapost.com/v.1.0/`, production Ukraine `https://api.novaposhta.ua/v.1.0/`, and custom HTTPS URLs. Sender, payer, contract-number, and parcel-default validation lives in the shipping application layer rather than UI components.
- Added application use cases plus Drizzle and in-memory repositories for saving, updating, finding, and listing owner shipping settings. The ENV-03 runtime switchover now uses these settings for active Nova Post lookup and worker calls.
- Official Nova Post references used for this model:
  - https://api-portal.novapost.com/en/about-api/general/
  - https://api-portal.novapost.com/en/api-nova-post/start/api-keys/
  - https://api-portal.novapost.com/en/api-nova-post/start/endpoints/
  - https://api-portal.novapost.com/en/api-nova-post/start/token-usage/
- Focused tests cover encryption/decryption, invalid encryption keys when saving API keys, API key preview/read-model safety, endpoint/custom URL validation, sender/parcel/payer validation, and repository save/update/list behavior.

Owner Nova Post settings UI update on 2026-05-10:
- Added `/dashboard/settings` as the settings landing page with Ukrainian cards for `Реквізити для оплати` and `Доставка`; dashboard navigation now points to `/dashboard/settings` instead of payment-only settings.
- Added `/dashboard/settings/shipping` for authenticated `owner` users. The page renders a responsive Ukrainian multi-step form: `API доступ`, `Відправник`, `Параметри посилки`, and `Перевірка`.
- New owners default to `Тестове середовище` with `https://api-stage.novapost.pl/v.1.0/`. The UI supports `Виробниче середовище global`, `Виробниче середовище Україна`, and `Власний URL`, shows the resolved URL preview, and validates custom URLs through the application settings schema.
- Existing API keys are never sent back to the form. The owner sees `API ключ збережено` plus a masked preview and must opt in before replacing the key.
- The form stores sender identity, branch/division ID, optional company data, payer type/contract number, default parcel dimensions/weights, and `Створення відправлень увімкнено`.
- Added a thin owner server action for `Перевірити підключення`. It resolves saved encrypted settings server-side, decrypts only inside server code, exchanges the API key for a Nova Post JWT, and performs a harmless small directory lookup without creating a shipment or logging the key. Playwright/mock mode uses a fixture tester.
- The UI and actions use shipping application use cases and infrastructure repositories; encryption logic remains outside React components.
- README and DEPLOYMENT now document dashboard-based Nova Post configuration. ENV-03 completed public lookup token scoping and worker/carrier runtime switchover; ENV-04 still owns tracked deprecated env cleanup and Railway/local variable removal.
- Tests cover Ukrainian form labels, stage endpoint default, custom HTTPS URL handling, masked saved key display, key replacement, enabled state, connection-test action behavior, owner/user access, and the requested Playwright save-and-return flow.

Owner Nova Post runtime switchover update on 2026-05-10:
- Public delivery city and warehouse lookups now include the public order token. `/api/carriers/cities` and `/api/carriers/warehouses` resolve the order server-side by token, use `order.ownerId`, and ignore any raw `ownerId` query parameter.
- Active Nova Post carrier construction no longer reads Nova Post API, auth URL, sender, payer, parcel default, or legacy `NOVA_POSHTA_*` values from env. The infrastructure factory receives owner settings, decrypts the API key server-side, and passes an explicit runtime config into `NovaPostShippingCarrier`.
- Missing, disabled, or API-key-incomplete owner shipping settings return the public-safe Ukrainian message `Доставка тимчасово недоступна. Зверніться до продавця.` for customer lookup and do not reveal which setting is missing.
- `createShipmentJobUseCase` loads the order, resolves Nova Post by `order.ownerId`, and fails shipment creation before provider calls when owner shipping settings are unavailable. The audit payload uses `Налаштування доставки не завершено. Відправлення не створено.` without secret values.
- `SHIPPING_LABEL_CREATION_MODE` remains only a global label-creation kill switch: `disabled` blocks shipment creation before resolving a carrier, `live` uses owner settings, and `mock` remains rejected in production.
- Carrier directory cache keys now include an owner settings scope so changing owner settings does not reuse stale directory results across owners/settings.
- ENV-04 still owns removing deprecated env names from tracked templates/docs, optional env parsing, Railway variables, and ignored local env files. No Railway or local env cleanup was performed in ENV-03.
- Tests cover token-to-order-to-owner lookup, rejection of arbitrary public `ownerId`, public-safe missing-settings copy, worker owner-setting resolution, disabled settings avoiding provider calls, the global disabled kill switch, server-side API-key decryption, and a code-search guard for deprecated Nova Post env keys in active shipping code.

Runtime-aware environment validation update on 2026-05-07:
- `src/shared/config/env.ts` now exposes `getWebEnv()`, `getWorkerEnv()`, and `getTestEnv()` alongside a documented safe `getServerEnv()` base parser for shared infrastructure.
- Production `web` validation requires `DATABASE_URL`, `BETTER_AUTH_SECRET`, and `BETTER_AUTH_URL`. It requires `OWNER_SETUP_TOKEN` only when the first-owner setup path is enabled and does not force worker-only settings.
- Production `worker` validation requires `DATABASE_URL` and an explicit `AUTO_COMPLETE_AFTER_DELIVERED_HOURS`; it does not require `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`, or `OWNER_SETUP_TOKEN`.
- `SHIPPING_LABEL_CREATION_MODE=live` now relies on encrypted owner Nova Post settings instead of Nova Post env keys, `mock` remains rejected in production, and disabled production shipping mode does not require Nova Post credentials.
- Missing environment errors report variable names and runtime context only; they do not include secret values.
- Tests cover web production validation, worker production validation, live and disabled shipping modes, dev/test fallback behavior, and the worker config path proving owner setup tokens are not required by the worker.

Mobile dashboard shell update on 2026-05-08:
- The owner dashboard shell is now mobile-first at 360 px with a compact sticky Ukrainian top header, visible current-section label, four tap-friendly mobile navigation links, and the persistent sidebar deferred to `lg` desktop widths.
- Dashboard navigation now marks the active section with `aria-current="page"` and keeps desktop sidebar spacing/current states consistent with the mobile route state.
- Logout remains a POST form action to `/logout`; no `/logout` client-side navigation link was introduced, preserving the production redirect contract to `/login?logout=1`.
- Shared page layout primitives (`PageShell`, `PageHeader`, and `ActionBar`) now keep public/auth page containers mobile-safe with `min-w-0`, responsive typography, and at least 44 px primary touch targets where practical.
- Public pages `/`, `/login`, `/setup`, `/o/[token]`, and `/o/[token]/delivery` were tightened for mobile width through shared containers, smaller mobile headings, wrapping-safe content, and 44 px form/button controls.
- Playwright coverage now includes a 360 px dashboard shell/logout check and a 360 px no-horizontal-overflow check for the public/auth/order pages.
- Local Playwright E2E runs use one browser worker because the E2E-safe fallback repositories are process-global in the dev server; this keeps seeded owner/order flows deterministic.

Responsive product and order list update on 2026-05-08:
- `/dashboard/products` now renders mobile product cards below `lg` and a simplified desktop table at `lg` and wider.
- Product cards show image, product name, SKU, active/inactive badge, price, stock, edit action, and active toggle action with comfortable mobile targets.
- The desktop product table now groups image, name, and SKU into one primary product column, groups price and stock into one secondary column, and keeps status/action columns compact.
- `/dashboard/orders` now renders mobile order cards below `lg` and a simplified desktop table at `lg` and wider.
- Order cards show the same display order number as the public page, status badge, total, customer name, Instagram nickname when present, phone, date, compact tags, and the details action without horizontal table scrolling.
- The desktop order table now keeps each row to a summary column and compact action column: order number, status, and total first; customer, Instagram, and date second; compact tags after that, while preserving existing filters and owner-only access.
- Product/order reads still go through existing application use cases and repositories; no business logic, filters, roles, database schema, object storage, or external API behavior changed.
- Component tests cover the compact desktop hierarchy and mobile card rendering for both lists. Playwright coverage checks `/dashboard/products` and `/dashboard/orders` at desktop and 390 px, plus no page-level horizontal overflow at phone widths.

Owner order details layout update on 2026-05-08:
- `/dashboard/orders/[orderId]` now uses clear Ukrainian sections: `Огляд`, `Товари`, `Клієнт`, `Доставка`, `Оплата`, `Теги`, `Історія статусів`, and `Аудит`.
- The mobile layout uses open collapsible section cards instead of wide product and audit tables. Products render as item cards, status history renders as compact event cards, and audit events render as a compact readable list.
- Desktop widths use a two-column layout at wide breakpoints: products, status history, and audit stay in the main column, while overview, customer, delivery, payment, and tags stay in the side column.
- Existing server actions and application use cases are unchanged. legacy external acquiring retry, shipment retry, manual status update, and tag assignment/removal remain available through the same owner actions.
- Delivery and shipment details are grouped under `Доставка`; payment details and legacy external acquiring retry are grouped under `Оплата`.
- Focused component tests cover the Ukrainian section headings, collapsible stacked sections, legacy external acquiring retry eligibility, shipment retry availability, manual status update submission, and compact audit visibility.
- Playwright E2E covers the owner order details page at 390 px and checks the same page at 360 px for no horizontal overflow.

Dashboard filter, empty-state, and feedback polish update on 2026-05-08:
- `/dashboard/orders` filters now render as a responsive Ukrainian panel with a mobile-collapsed default, active-filter summary chips, accessible controls, and a clear-filters action. The same URL-backed GET parameters and application filtering behavior are unchanged.
- Empty states now distinguish no orders from no filtered results and include useful Ukrainian next actions. Product catalog and order-builder empty states also point owners to create or enable products without changing product or order business rules.
- `/dashboard/orders/[orderId]` now has clearer Ukrainian empty states for no items, no tags, no status history, no audit events, and missing payment/shipment records.
- Tag updates, manual status updates, legacy external acquiring retry, and shipment retry now share live-region feedback for pending, successful, and failed action states where applicable.
- Component tests cover mobile filter panel behavior, active summaries, clear filters, Ukrainian empty states, and action feedback messages. Playwright E2E now exercises the owner order filter panel and active-summary behavior after filtering.

Owner order view declutter update on 2026-05-08:
- `/dashboard/orders` now uses a compact desktop table with one primary row action and explicit summary columns for order number/status, customer/Instagram, payment method/status, delivery status/tracking, total, and date.
- Mobile order cards now show only the required scan fields: order number, status, customer/Instagram, payment summary, delivery summary, total, and the details action. Secondary phone and tag details stay on the order details page or behind filters.
- `/dashboard/products` now uses a cleaner desktop table with separate `Товар`, `Ціна`, `Залишок`, `Стан`, and compact action columns. Mobile product cards keep name, SKU, price, stock, active badge, and edit/toggle actions without showing image URLs or image previews in list rows.
- `/dashboard/orders/[orderId]` keeps collapsible Ukrainian detail sections and now exposes testable primary/sidebar desktop columns. Products, status history, and audit remain in the wider primary column, while overview, customer, delivery, payment, and tags stay in compact side panels.
- The manual card transfer action `Позначити оплату отриманою` now appears first inside the payment section when a pending manual-card payment exists, before lower-priority payment metadata.
- Focused UI tests cover simplified owner order list labels, product list columns/cards, and order details with and without customer data. Playwright E2E covers owner search by short order number, opening details, mobile no-overflow details, and desktop primary/sidebar panel balance.

Final responsive QA update on 2026-05-08:
- Playwright MCP inspected the critical product, order-builder, public review, customer delivery, order list, and order-details flows against the local E2E-safe dev server. No page-level horizontal overflow was found in that walkthrough across 390x844 plus the final matrix checks for 360x740, 430x932, 768x1024, 1024x768, and 1440x900 on representative owner and public pages.
- Added shared Playwright E2E helpers in `tests/e2e/helpers.ts`, including `expectNoHorizontalOverflow(...)` with page-level overflow diagnostics and the final viewport matrix.
- Added `tests/e2e/final-responsive-qa.spec.ts` to cover all critical routes requested for final QA: `/`, `/login`, `/setup`, `/dashboard`, `/dashboard/products`, `/dashboard/products/new`, `/dashboard/products/[productId]/edit`, `/dashboard/orders/new`, `/dashboard/orders`, `/dashboard/orders/[orderId]`, `/o/[token]`, and `/o/[token]/delivery`.
- The final Playwright QA coverage verifies mobile public order review, mobile customer delivery steps, mobile product creation steps, mobile owner order-builder steps, mobile product/order list card views, mobile order details sections, and desktop dashboard navigation.
- Keyboard basics are covered for the global Ukrainian skip link, mobile dashboard nav, product/order stepper controls, order filters, and product action links. Focusable controls keep visible focus styles and accessible Ukrainian labels.
- Delivery loading, empty, and post-submit states are covered with mocked carrier responses: `Пошук міст…`, `Місто не знайдено`, `Пошук відділень…`, and the public status page after successful cash-on-delivery confirmation.
- Added a small local SVG app icon and metadata link so browser QA no longer produces a missing favicon request during normal page loads.
- No business logic, database schema, role model, product image strategy, payment behavior, shipping behavior, or object storage behavior changed in the final responsive QA milestone.
- Focused verification passed with `pnpm test:e2e tests/e2e/final-responsive-qa.spec.ts`.

Prompt 09 final order/payment QA on 2026-05-08:
- Full local release gate passed: `pnpm lint`, `pnpm typecheck`, `pnpm test:coverage`, `PORT=3100 PLAYWRIGHT_BASE_URL=http://127.0.0.1:3100 pnpm test:e2e`, and `pnpm build`.
- Coverage from the final run was 88.99% statements, 81.44% branches, 89.76% functions, and 88.99% lines across the configured coverage scope.
- Full Playwright E2E passed with Chromium: 22 tests passed and the opt-in authenticated production smoke spec skipped by default.
- Playwright MCP inspected product create, order builder, public delivery, public post-confirmation status, owner order list, owner order details, and payment settings against local E2E-safe data at 390x844, 768x1024, and 1440x900.
- The active public customer flow was rechecked with a seeded manual-card order: pre-confirmation review showed products and total; the delivery/payment step collected full name, phone, Instagram nickname, Nova Post delivery, and payment method; `Оплата картою онлайн` showed active owner requisites and the Instagram receipt instruction; reopening the public link showed the status page instead of a duplicate form.
- The active customer UI check passed for the public review, delivery/payment step, and manual-card public status page: `Оплата картою онлайн` and `Після оплати надішліть квитанцію продавцю в Instagram чат` were present where expected, while `legacy external acquiring` and `legacy external acquiring` were absent.
- Owner QA verified search by displayed short order id, visible Instagram nickname, manual card payment status, marking the payment as received, and the resulting `Оплату картою підтверджено` audit event.
- Cash on delivery remains covered by the full Playwright E2E customer-delivery flow.
- Production `/api/health` returned `status: ok` on 2026-05-08. The authenticated production smoke test was not run because `E2E_PROD_EMAIL` and `E2E_PROD_PASSWORD` were not set in the local shell; keep those credentials temporary and local-only when running `pnpm test:e2e:prod`.
- Automated tests continue to use fixtures, MSW, or in-memory adapters for legacy external acquiring and Nova Post; no live external APIs are called in CI or local automated checks.

## Order, payment, and responsive UI audit on 2026-05-08

Audit scope: public order pages under `/o/[token]`, the customer delivery/payment form, owner product form, owner order builder, owner orders list, owner order details, dashboard shell, payment modules, legacy external acquiring provider/webhook code, shipping enqueue/job flow, and migrations through `drizzle/0003_kind_deathstrike.sql`.

Current active behavior:
- Public order lookup distinguishes unavailable links, review state, and post-confirmation status state. `/o/[token]` renders the delivery CTA only while the order is `SENT_TO_CUSTOMER`; confirmed, payment, shipment, completed, returned, and failed-payment states render a Ukrainian status page.
- `/o/[token]/delivery` renders the delivery form only for `SENT_TO_CUSTOMER`. After confirmation it renders the same public status state, so customers cannot resubmit delivery data or create duplicate customer, payment, or shipment rows through the UI. The submit use case still rejects duplicate confirmation because it only accepts `SENT_TO_CUSTOMER`.
- The public status page shows a stable customer-facing display number using the first 8 characters of the order UUID, for example `#55e143f7`; it does not expose the full internal UUID. It also shows Ukrainian status labels, processing/payment guidance, seller-chat instruction, selected products, and total.
- Customer contact data collects and persists full name, phone, and an optional Instagram nickname. `customers.email` exists but the public form does not use it.
- Customer payment defaults to `MANUAL_CARD_TRANSFER` when the owner has active payment requisites, otherwise to `CASH_ON_DELIVERY`. The active customer choices are `Оплата картою онлайн` and `Післяплата`.
- Payment method values are persisted in `payments.provider`, backed by the PostgreSQL enum `payment_provider` and TypeScript `PaymentProviderCode`. Current values are `LEGACY_EXTERNAL_ACQUIRING`, `MANUAL_CARD_TRANSFER`, and `CASH_ON_DELIVERY`; `provider_invoice_id` and `provider_modified_at` remain legacy external acquiring-specific but nullable.
- legacy external acquiring is no longer active in the customer delivery/payment form. legacy external acquiring provider, webhook, and retry code remains for historical records and explicit retry paths through `LEGACY_EXTERNAL_ACQUIRING_*` variables and `/api/webhooks/legacy-acquiring`.
- Owner order search is URL-backed through `/dashboard/orders?search=...`. `matchesSearch(...)` matches full order UUIDs, the displayed short order number, customer phone digits, optional Instagram nickname with or without leading `@`, customer full names, and shipment tracking numbers.
- Shipping enqueueing treats cash on delivery as shipment-ready immediately after confirmation, historical legacy external acquiring orders wait for a paid webhook, and manual card transfer orders wait for the owner to mark the transfer received.
- Owner dashboard settings exist under `/dashboard/settings/payment` for public payment card/requisite records.

Completed functional changes from this audit:
- Replaced the active customer legacy external acquiring choice with `Оплата картою онлайн`. This is a manual card transfer flow: after customer confirmation, owner-configured active card/requisite records are visible and the customer is told in Ukrainian to send the receipt in the Instagram chat.
- Kept legacy external acquiring adapter, webhook, and historical payment records readable for existing data, while removing legacy external acquiring from the active customer flow and default form value. legacy external acquiring retry no longer appears for new manual-card customer flows.
- Instagram nickname capture is complete for the public contact step, server validation, confirmation use case input, customer persistence, owner order list/detail read models, and UI tests with Ukrainian labels.
- Extended the public status page with owner-configured manual-card requisites.
- Add owner order search matching for full order UUID, the displayed short order ID, customer full name, Instagram with or without leading `@`, phone, and tracking in `matchesSearch(...)`; update the filter placeholder to `ID, Instagram, телефон або ТТН`.
- Added owner payment settings under the dashboard, with Ukrainian labels for creating, editing, ordering, enabling, and disabling visible card/requisite records.

Migration plan:
- Added `MANUAL_CARD_TRANSFER` to `payment_provider`; updated `src/shared/db/schema.ts`, `PaymentProviderCode`, validation, fixtures, labels, filters, tests, and Drizzle migration metadata.
- Added nullable `instagram_username` to `customers` in `drizzle/0004_cute_veda.sql`. Backfill is not needed for existing customers; owner UI shows `Не вказано` when absent in details and omits the nickname from lists when absent.
- Added owner-scoped `payment_requisites` with `owner_id`, display title, recipient name, card/account/requisite text, optional note, `is_active`, `sort_order`, and timestamps. It stores only owner-entered public requisites needed for the buyer-visible manual transfer flow; no object storage or receipt uploads were added.
- Consider adding a dedicated customer-safe `orders.short_id` or `orders.display_number` if exposing `shortOrderId(order.id)` publicly is not acceptable. Owner search can match the current UUID prefix without a migration, but a stable display number needs one.

UI refactor plan:
- Preserve the mobile-first stepper and card work, but rebalance desktop layouts so forms and detail pages do not feel sparse at `lg`/`xl`: constrain overly wide text, give form content a stronger primary column, and use two-column desktop layouts only where the side content has enough weight.
- Standardize action rows across product forms, order builder, delivery form, details panels, tables, and public pages: stable button height, predictable primary/secondary alignment, full-width buttons only on mobile, and consistent widths for table row actions.
- Keep desktop product/order tables compact and scannable while adding the new Instagram and payment-provider information selectively. Avoid stuffing every field into list rows; put full details on the order details page.
- Add focused component and Playwright coverage for manual-card payment copy, owner settings form, Instagram labels, order search, and desktop button/table alignment.

Public order status page update on 2026-05-08:
- Added `formatOrderDisplayNumber(orderId)` for stable customer-facing order numbers such as `#55e143f7`, backed by unit tests.
- Public order lookup now returns `review` only for `SENT_TO_CUSTOMER` and `status` for valid post-confirmation/payment/shipment/completion states. Cancelled, expired, malformed, and missing links remain unavailable.
- `/o/[token]` shows the pre-confirmation review CTA only before confirmation. After confirmation it shows `Замовлення #...`, the Ukrainian status label, status guidance such as `Ваше замовлення обробляється` or `Очікуємо оплату картою`, the seller-chat instruction, selected products, and total.
- `/o/[token]/delivery` no longer renders the form after confirmation; it renders the same status state and leaves duplicate confirmation blocked in `confirmPublicOrderUseCase`.
- Successful manual-card and cash-on-delivery confirmations return the customer to `/o/[token]`. Historical legacy external acquiring retry still redirects to the existing provider URL and returns to the same public status page.
- Tests cover display-number formatting, public lookup review/status/unavailable states, duplicate-confirmation rejection without extra customer/payment/shipment writes, Ukrainian status UI copy, delivery-page status rendering, and the Playwright revisit contract.

Customer Instagram nickname update on 2026-05-08:
- `/o/[token]/delivery` contact step now asks for optional `Instagram нікнейм` with placeholder `@username або username` and helper text `Допоможе продавцю швидше знайти вашу переписку.`
- Instagram usernames are normalized in the application layer before persistence: surrounding whitespace is trimmed, duplicate leading `@` characters are removed, internal spaces and unsafe symbols are rejected, and the stored value does not include a leading `@`.
- Owner order list/cards show the formatted Instagram nickname when present, owner order details show `Instagram нікнейм` in the customer section, and owner search matches the nickname with or without a leading `@`.
- `drizzle/0004_cute_veda.sql` adds nullable `customers.instagram_username` without destructive changes or backfill requirements.
- Focused tests cover accepted usernames (`username`, `@username`, `user.name_123`), invalid usernames, normalized persistence, owner list/detail rendering, and the Playwright customer-to-owner flow with an Instagram nickname.

Manual card payment requisite settings update on 2026-05-08:
- Added owner dashboard navigation item `Налаштування` and route `/dashboard/settings/payment` with Ukrainian `Реквізити для оплати` copy.
- Owners can create, edit, activate/deactivate, sort, view, and copy public payment requisites. Owner lists show masked card-like values such as `•••• 3333`; public customer views show the full owner-provided display value so the buyer can copy it.
- Added `payment_requisites` with owner-scoped records: label, optional recipient and bank names, display value, optional note, active flag, sort order, and timestamps. Only active records are returned by the public read model.
- Added active customer payment method `Оплата картою онлайн` backed by `MANUAL_CARD_TRANSFER`. This is a manual transfer flow only; the app does not collect customer card number, expiry, CVV, or process cards.
- The public payment step and post-confirmation status page show the instruction `Переказ можна зробити на одну з карток нижче. Після оплати надішліть квитанцію продавцю в Instagram чат.` and only active owner requisites.
- Manual card transfer confirmations move the order to `PAYMENT_PENDING`, keep payment status `PENDING`, and do not enqueue shipment creation before payment is handled by the owner workflow.
- Owner dashboard shows a Ukrainian warning when no active payment requisites exist, and the public delivery form falls back to `Післяплата` without showing the online-card option in that state.
- Owner order details expose `Позначити оплату отриманою` for pending `MANUAL_CARD_TRANSFER` payments. The action marks the payment `PAID`, transitions the order through `PAID`, appends `MANUAL_PAYMENT_MARKED_PAID`, and only then asks the shipment enqueue use case to prepare shipment creation.
- Legacy external acquiring remains implemented for historical records, webhook handling, and retry support, but it is no longer an active option in the customer delivery/payment form.
- Focused tests cover validation, repository save/list/update/toggle, owner access, user denial through E2E, public active-only read model behavior, Ukrainian UI labels, owner requisite creation, and public manual-card display.
- Verification for this milestone passed with `pnpm db:generate`, `pnpm lint`, `pnpm typecheck`, `pnpm test:coverage`, `PORT=3100 PLAYWRIGHT_BASE_URL=http://127.0.0.1:3100 pnpm test:e2e`, and `pnpm build`. A plain `pnpm test:e2e` first reused an unrelated local Next app already answering on port 3000 (`/api/health` returned `401 no_refresh_token`), so the clean Dase run used isolated port 3100 and passed 19 tests with the production smoke skipped.

Owner order search and summary update on 2026-05-08:
- Owner order search now reuses `formatOrderDisplayNumber(order.id)` and matches full UUIDs, the displayed short number such as `#55e143f7` or `55e143f7`, customer full names, customer phone digits, shipment tracking numbers, and Instagram nicknames case-insensitively with or without a leading `@`.
- The owner order filter placeholder is `ID, Instagram, телефон або ТТН`, and search-empty results show `За цим пошуком замовлень не знайдено`.
- Owner order list rows and mobile cards now use the same display number as the public order page, with a lighter summary hierarchy: order number, status, and total first; customer, Instagram, and date metadata second; compact tags and the details action after that. Mobile cards also keep the customer phone visible for quick contact.
- Owner order details headers now show `Замовлення #...`, the Ukrainian status label, the customer name or `Клієнт ще не вказаний`, and the formatted Instagram nickname when present.
- Focused tests cover search by full id, short id, Instagram with and without `@`, phone, tracking number, and customer full name, plus the Ukrainian placeholder, search-empty state, lighter list/card summaries, and details header summary.

Risks:
- PostgreSQL enum migrations must be forward-compatible and tested against Railway PostgreSQL before production promotion.
- Removing legacy external acquiring from the active customer flow while keeping historical legacy external acquiring webhooks/read models requires clear filtering so existing orders still render safely.
- Manual card transfer now depends on owner confirmation before shipment enqueueing. A future receipt-upload flow would need separate storage and moderation decisions; object storage remains out of scope.
- Publicly showing an order number needs a product decision on whether the current UUID prefix is acceptable or whether a dedicated display number is required.
- Owner-entered card/requisite data is buyer-visible financial information; avoid logging it unnecessarily and do not treat it like secret environment credentials.

Ukrposhta active-MVP removal update on 2026-05-07:
- Added a central shipping carrier registry at `src/modules/shipping/application/shipping-carrier-registry.ts`.
- The active customer-facing carrier list contains only Nova Post with the Ukrainian label `Нова пошта`.
- Ukrposhta remains a known historical carrier only. Owner views label existing records as `Укрпошта (вимкнено)` and do not expose retry/live shipment actions for disabled-carrier shipments.
- `/api/carriers/cities` and `/api/carriers/warehouses` reject unknown or disabled carriers with Ukrainian 400 responses before resolving a carrier adapter.
- Delivery validation rejects `UKRPOSHTA`, and the public delivery form renders active carriers from the registry.
- Shipment enqueueing, manual retry, create-shipment jobs, and tracking sync avoid disabled carriers before any live adapter is called.
- Production wiring no longer imports or constructs the Ukrposhta adapter in the shipping carrier factory.
- `UKRPOSHTA` database enum values are intentionally retained for historical rows; no migration was required.

## Repair audit on 2026-05-07

Audit scope: `AGENTS.md`, this specification, `DEPLOYMENT.md`, ADR 0001, package/env configuration, home/login/setup pages, user auth/setup modules, shipping modules, delivery form validation/UI, environment validation, and database schema were inspected before any functional change.

Repair order checklist:

1. Auth, setup, and dashboard navigation:
   - Change the home CTA `Перейти до налаштування` from a non-navigating button into a real Ukrainian-labeled link or button-link to `/setup`.
   - Replace the production setup-token URL-query flow with a safer form-based setup-token flow: `/setup` renders the setup-token field while setup is available, submits setup data through the server action, and never requires or documents the secret in the URL.
   - Keep first-owner creation available only while no `owner` exists, preserve the `owner`/`user` role boundary, and require `OWNER_SETUP_TOKEN` only for the production web setup path while setup is available.
   - Stabilize login-to-dashboard and dashboard route navigation by verifying Better Auth cookie persistence, callback handling, `router.replace("/dashboard")`, `router.refresh()`, and `requireOwnerSession()` behavior so normal owner navigation cannot intermittently redirect to `/login`.
   - Add or update unit and Playwright coverage for Ukrainian home CTA navigation, form-based setup token validation, first-owner creation, invalid token handling, owner dashboard access, and `user` dashboard denial.

2. Nova Post API replacement:
   - Replace the legacy Nova Poshta JSON endpoint and adapter request shape with the current Nova Post API required for MVP city search, warehouse search, shipment creation, tracking, and label/reference retrieval.
   - Update Nova Post API URL documentation and examples without committing credentials.
   - Keep all external API tests on MSW/fixtures and do not call live Nova Post APIs in CI.

3. Remove Ukrposhta from the active MVP:
   - Completed through the central carrier registry: active customer choices, owner filters, carrier route validation, shipment factory selection, production env docs, deployment checklists, and MVP smoke tests now expose Nova Post only.
   - The `ShippingCarrier` port/interface is preserved so a future carrier can be reintroduced without changing order or shipment application use cases.
   - Existing `UKRPOSHTA` enum values remain for historical rows; UI labels them as disabled legacy records.

4. Shipping production configuration and failure handling:
   - Document and implement the exact Nova Post production variables needed for shipment creation, including sender/counterparty data, sender address/warehouse, contact phone, payer/payment method, cargo dimensions/weight defaults, and label retrieval behavior.
   - Make shipment creation failures produce clear Ukrainian owner-facing status/audit messages while preserving safe internal logs and pg-boss retry behavior.
   - Ensure missing or incomplete production shipping configuration fails before a live carrier request is attempted and gives owners an actionable retry path.

5. Regression tests and documentation:
   - After each behavior or environment-variable change, update `spec.md`, `.env.example`, `DEPLOYMENT.md`, and tests in the same milestone.
   - Run at minimum `pnpm lint`, `pnpm typecheck`, focused unit/MSW tests, and Playwright navigation checks during each repair; run the full required gate before release.
   - Keep all user-facing UI text Ukrainian, keep product images external URL-only, do not add object storage, do not commit secrets, and use English imperative sentence-case commit messages without prefixes.

## Final production-readiness audit on 2026-05-07

Audit scope: `AGENTS.md`, this specification, `DEPLOYMENT.md`, ADR 0001, `README.md`, package/env configuration, Railway MCP service status, auth/setup/login/logout flow, owner dashboard access, Nova Post shipping integration, disabled Ukrposhta handling, legacy external acquiring retry/webhook handling, migrations, transactional customer confirmation, CI/e2e setup, and user-facing UI copy.

Audit result:
- Auth remains protected against redirect loops: unauthenticated dashboard access redirects to `/login`, authenticated `owner` sessions persist across dashboard navigation, reload, browser history, and logout, and authenticated `user` sessions are denied dashboard access.
- `/setup` remains available only before the first `owner` exists. Production setup tokens are submitted through the Ukrainian setup form and are not accepted from URLs.
- The home CTA is a real link and the Playwright home test now clicks it, verifying navigation into `/setup` or `/login`.
- Nova Post is the only active customer-facing carrier. Ukrposhta remains disabled historical data only; carrier lookup APIs, delivery validation, shipment enqueueing, retry, create-shipment jobs, tracking sync, and production carrier factory wiring avoid disabled carriers.
- No live Ukrposhta production adapter is wired, and no legacy Nova Poshta `v2.0/json` production adapter remains.
- `SHIPPING_LABEL_CREATION_MODE` prevents accidental live labels: production defaults to `disabled`, production rejects `mock`, and `live` requires complete Nova Post API, sender, payer, and parcel settings before a provider call can be made.
- Nova Post API keys and JWTs are not logged. Provider errors expose safe messages and tests assert credential logging is avoided.
- legacy external acquiring retry remains available for confirmed orders missing a provider invoice id and for failed legacy external acquiring payments. Webhook processing verifies signatures, stores events idempotently, ignores stale provider modified dates, and stores sanitized payloads without card data.
- Database migrations are forward-only schema/data migrations with no production destructive scripts. Customer confirmation writes use `CustomerConfirmationUnitOfWork` and Drizzle transactions when PostgreSQL is configured.
- User-facing application copy remains Ukrainian, with product/brand names such as Dase, legacy external acquiring, legacy external acquiring, and Nova Post kept as proper names.
- Public pages are covered by mobile Playwright checks with no horizontal overflow, and dashboard navigation remains covered by owner e2e flows.
- `README.md`, `.env.example`, this specification, `DEPLOYMENT.md`, Railway config files, and CI workflow are aligned with the current web, worker, postgres, env var, no-object-storage, and mocked-external-API requirements.
- CI and local tests use MSW, fixtures, or in-memory adapters for legacy external acquiring and Nova Post; live external APIs are not called in automated tests.

## Production logout origin repair on 2026-05-07

- Railway production returned `/logout` redirects with an internal `https://localhost:8080/login?logout=1` origin because the route handler built its redirect from `request.url`.
- Railway `web` was verified on 2026-05-07 as deployed from GitHub `main` commit `fb1cb285fa0ba61a7865032b6bd8061597c50d9c`, and Railway `web` variables were verified without exposing secret values: `BETTER_AUTH_URL` is the public origin `https://web-production-26609.up.railway.app`, `NODE_ENV=production`, `DATABASE_URL` is present, `BETTER_AUTH_SECRET` is present and at least 32 characters, and `OWNER_SETUP_TOKEN` is present for the first-owner setup path.
- `/logout` now builds the redirect from configured valid production `BETTER_AUTH_URL` first, then forwarded request headers, then request-host fallback only outside production.
- Dashboard logout no longer uses a Next `<Link>` to `/logout`; the owner shell submits a POST logout button with Ukrainian copy, while `GET /logout` remains supported for direct smoke checks.
- Production environment validation rejects `BETTER_AUTH_URL` values that point to localhost, loopback, an internal Railway domain, non-HTTPS origins, or path/query/fragment URLs. Error messages include variable names only and do not print secret values.
- Better Auth is configured with explicit trusted origins derived from the validated public auth origin and production trusted proxy-header support for Railway.
- Login now completes the Better Auth server action, waits for the action response, then hard-navigates with `window.location.assign("/dashboard")` so the next server-rendered dashboard request sees the session cookie.
- Added an opt-in Playwright production auth smoke test guarded by `RUN_PROD_SMOKE=1` and temporary local `E2E_PROD_EMAIL` / `E2E_PROD_PASSWORD` variables. The smoke test is not part of default CI or local E2E runs.
- Regression coverage simulates Railway's internal request URL and verifies the public deployed web URL is used for the Ukrainian logout success page.

## Nova Post live directory regression on 2026-05-08

- Official Nova Post docs were checked for the active v.1.0 endpoints, JWT generation, raw token usage, branch directory lookup, branch identifiers, and local shipment fields.
- Railway production variables were verified without exposing secret values. The `web` service has `Nova Post owner API key` and `Nova Post owner API URL` configured for the Nova Post stage endpoint. `SHIPPING_LABEL_CREATION_MODE`, Nova Post sender, payer, and parcel defaults are not configured on `web`.
- The `worker` service has `DATABASE_URL` and `AUTO_COMPLETE_AFTER_DELIVERED_HOURS`, but Nova Post API, sender, payer, parcel defaults, and `SHIPPING_LABEL_CREATION_MODE` are not configured there.
- Before the adapter repair, production `/api/carriers/cities?carrier=NOVA_POSHTA&query=Київ` returned the safe Ukrainian `502` message because Nova Post rejected `Authorization: Bearer <jwt>` with `401 Unauthorized`.
- After the adapter repair, a Railway-env local probe using the production `web` variables returned one Київ city record and five warehouse records from Nova Post stage data.
- Live shipment creation remains intentionally blocked until `worker` is configured with `SHIPPING_LABEL_CREATION_MODE=live` and the complete Nova Post API, sender, payer, and parcel variables. Production still defaults to disabled label creation when the mode is omitted.

## Mobile UI audit and refactor plan on 2026-05-08

- Added `docs/ui/mobile-form-table-guidelines.md` as the concrete mobile-first refactor plan for forms, dashboard navigation, table-to-card rules, spacing, typography, accessibility, exact page targets, and the Playwright viewport checklist.
- Audited `/`, `/login`, `/setup`, `/dashboard`, `/dashboard/products`, `/dashboard/products/new`, `/dashboard/products/[productId]/edit`, `/dashboard/orders/new`, `/dashboard/orders`, `/dashboard/orders/[orderId]`, `/o/[token]`, and `/o/[token]/delivery`.
- Playwright MCP inspected the audited pages at 360x740, 390x844, 430x932, 768x1024, and 1440x900 using local E2E-safe owner/product/order data.
- Public and auth pages avoid page-level horizontal scrolling, but common controls are currently 40-42 px tall and should move to at least 44 px for touch targets.
- Dashboard mobile navigation is visually heavy because the full owner nav and account header appear before page content on phone widths; tablet portrait also starts the persistent sidebar at `md`, leaving data pages cramped.
- Owner product/order tables currently depend on horizontal scrolling with fixed table minimum widths between 720 px and 980 px; `/dashboard/orders/new`, `/dashboard/orders`, and `/dashboard/orders/[orderId]` also showed page-level overflow at some audited widths.
- Product create/edit forms and owner order details are the highest-risk mobile surfaces because they are long single-screen flows; they should move to stepper/card patterns without changing business logic, database schema, or application/domain boundaries.
- No UI implementation, business logic, database schema, role model, object storage, or image upload behavior changed in this planning milestone.

## Reusable multi-step form foundation on 2026-05-08

- Added shared multi-step form UI primitives in `src/shared/ui/multi-step-form.tsx`: `Stepper`, `StepIndicator`, `StepActions`, `StepCard`, and `FormSummaryCard`.
- Added `useMultiStepForm` for React Hook Form flows. It keeps step index as local UI state, validates only the current step through RHF `trigger`, preserves values between steps, prevents early form submits from sending partial data, moves final-submit failures to the first invalid step, and focuses either the revealed step heading or invalid field.
- The foundation is generic UI code only. It does not change domain/application rules, server actions, database schema, roles, product image handling, payment, or shipping behavior.
- Product, owner order-builder, and public delivery refactors keep their existing submit paths while using the foundation for UI-only step state. Later form refactors should keep the existing Zod schema and complete server-action validation as the source of truth.
- `docs/ui/mobile-form-table-guidelines.md` now documents how feature forms should adopt the shared stepper and keep all user-facing text Ukrainian.
- Focused component tests cover Ukrainian progress/actions, `aria-current`, current-step validation, live-region step errors, focus movement, state preservation, early-submit handling, full-submit gating, and the optional `Перевірити` review action.

## Product form stepper adoption on 2026-05-08

- `/dashboard/products/new` and `/dashboard/products/[productId]/edit` now use the shared multi-step form foundation while preserving the existing React Hook Form state, Zod product schema, FormData conversion, and create/update server actions.
- The product form steps are Ukrainian and mobile-first: `Основне` for name, SKU, description, and active status; `Ціна та залишок` for price and stock; `Зображення` for one or more external image URLs with previews; and `Перевірка` for a compact final summary before saving.
- `Далі` validates only the fields for the current step. Server-side validation still validates the full payload, and server field errors reveal the step that owns the invalid field.
- Product images remain external URLs stored in `product_images`; no file upload, binary storage, object storage, database schema change, or product business-rule change was introduced.
- The shared step actions now keep `Далі` and final submit buttons as distinct React elements and prevent next-step clicks from submitting the form during the button swap into the review step.
- Unit tests cover step navigation, per-step validation, preserved values, final summary data, create-action submission, edit default values, server-error step reveal, image preview, large image-delete target, and Ukrainian labels.
- Playwright E2E product creation now follows the multi-step flow. Mobile E2E checks cover product create and edit forms at 360 px with no page-level horizontal overflow, including the image preview step.
- Playwright MCP inspected `/dashboard/products/new` and `/dashboard/products/[productId]/edit` at a 360x740 viewport with E2E-safe owner data.

## Owner order builder stepper adoption on 2026-05-08

- `/dashboard/orders/new` now uses a four-step owner flow: `Вибір товарів`, `Кількість`, `Перевірка`, and `Посилання`.
- The product selection step is searchable, shows active products as mobile-friendly selectable cards, and no longer depends on a wide order-builder table.
- The quantity step shows only selected products, touch-sized plus/minus buttons, clear numeric inputs, inline Ukrainian validation messages, and line totals.
- The review step shows a compact summary with selected products, quantities, line totals, and total amount before the existing create-link submit runs.
- The link step shows the generated token-based public URL, copy action, and quick open action. Internal order ids are still not exposed in public URLs.
- The order creation server action, `createOrderDraftUseCase`, form-data contract, product snapshots, public token generation, and public order review behavior remain unchanged.
- Unit tests cover product selection/search, quantity validation, summary review, generated-link display, and Ukrainian labels. Playwright owner order-link creation now creates a multi-product link at 390 px and asserts no page-level horizontal overflow through the owner builder steps.

## Public delivery stepper adoption on 2026-05-08

- `/o/[token]/delivery` now uses the shared multi-step form foundation with four Ukrainian steps: `Контакти`, `Доставка`, `Оплата`, and `Перевірка`.
- The contact step validates full name and phone before exposing delivery fields.
- The delivery step keeps carrier, city, and warehouse lookup through `/api/carriers/cities` and `/api/carriers/warehouses`; it does not call Nova Post directly from UI and still renders Nova Post as the only active MVP carrier.
- City and warehouse results render as full-width mobile-friendly result cards with loading, empty, and error states in Ukrainian. Selected city and warehouse states are shown clearly with `Змінити місто` and `Змінити відділення` reset actions.
- The payment step uses explicit Ukrainian radio-card options: `Оплата картою онлайн` when the owner has active payment requisites, and `Післяплата` with a payment-on-receipt explanation.
- The review step shows separate contact, delivery, and payment summaries before `confirmDeliveryAction` submits and returns the status page URL.
- Final submit is guarded against accidental double submit. Manual card transfer and cash on delivery both navigate back to `/o/[token]` to show the public status page.
- Focused UI tests cover step navigation, contact validation, city/warehouse selection, payment selection, final review, manual-card and cash-on-delivery status navigation, and Ukrainian labels. Playwright customer delivery E2E now follows the step flow, checks mobile overflow during the public delivery path, revisits the public link, and verifies the delivery form is no longer shown after confirmation.

## Desktop wizard layout update on 2026-05-08

- Shared wizard UI now exposes `WizardPageLayout`, `WizardStepper`, `WizardStepCard`, and `WizardActions` on top of the existing multi-step form state helper. Progress labels use the consistent Ukrainian form `Крок 1 із 4`.
- Product create/edit forms use a balanced desktop layout with a compact left stepper rail, a wider form container, a two-column `Основне` step on desktop, and a single consistent action footer for `Назад`, `Далі`, `Скасувати`, `Зберегти`, and `Створити`.
- The owner order builder uses the same compact wizard shell and action footer. Product selection and review lists switch to balanced two-column grids on desktop while staying one-column and overflow-safe on mobile.
- The public delivery/payment form uses a compact top stepper inside a wider public page shell, keeps mobile controls compact, and moves the order-back link into the wizard action footer.
- The active step is indicated through `aria-current="step"` and light visual emphasis rather than oversized cards. Mobile action buttons stay full-width with the primary action first; desktop footers align actions to the right inside the form container.
- No business logic, database schema, roles, payment/shipping behavior, product image strategy, object storage, or external API behavior changed in this UI milestone.
- Focused component coverage checks the wizard current state and action buttons. Playwright `tests/e2e/wizard-layout-responsive.spec.ts` verifies product form, order builder, and public delivery at 390x844, 768x1024, and 1440x900 with important Ukrainian labels visible and no horizontal overflow.
- Focused verification passed with `pnpm test src/shared/ui/multi-step-form.test.tsx src/modules/catalog/ui/product-form.test.tsx src/modules/orders/ui/order-builder-form.test.tsx src/modules/orders/ui/delivery-form.test.tsx 'src/app/o/[token]/delivery/page.test.tsx'` and `PORT=3100 PLAYWRIGHT_BASE_URL=http://127.0.0.1:3100 pnpm test:e2e tests/e2e/wizard-layout-responsive.spec.ts`.

## Standardized action buttons update on 2026-05-08

- Shared `ActionBar` and `FormActions` primitives now centralize action placement, full-width mobile stacking, desktop right alignment, sensible desktop minimum widths, compact action groups, and optional sticky action support.
- Button variants now include restrained destructive styles and a more readable disabled state. Loading labels are kept inside action groups with reserved desktop width so pending states do not collapse the button layout.
- Home, setup/login forms, product create/edit wizard, owner order builder, public delivery/payment wizard, owner order details actions, owner payment requisite settings, owner list filters/actions, and public order review/status actions use the shared responsive action patterns where appropriate.
- Product and public delivery first-step wizards no longer show an inactive generic `Назад` button beside a real cancel/back link. Public delivery keeps a single `Назад до замовлення` link on the initial screen.
- The home CTA remains a real link: `/setup` while first-owner setup is available, otherwise `/login`.
- Focused tests cover `ActionBar`/`FormActions` responsive class behavior, wizard action rendering, product/delivery/payment/order detail button placement, and the home CTA link target. Playwright `tests/e2e/action-buttons.spec.ts` verifies desktop product-form alignment, mobile delivery full-width ordering, owner order-detail action overflow, and no duplicate public back links.

## Core flows

### Product management

1. Owner logs in.
2. Owner opens dashboard catalog.
3. Owner creates product with name, SKU, description, price, stock quantity, and image URLs.
4. Product becomes available for order creation.

### Owner order creation

1. Owner opens the searchable `Вибір товарів` step and selects active products.
2. Owner opens `Кількість`, sets quantities for selected products, and reviews line totals.
3. Owner opens `Перевірка` and reviews the compact order summary and total.
4. Owner creates the order link through the existing server action.
5. App creates a secure public token and shows the token-based public URL on `Посилання`.
6. Owner copies or opens the public link and sends it to the customer.

### Owner order management

1. Owner opens the orders list.
2. Owner filters orders by status, delivery carrier, payment method, tag, date range, customer phone, or tracking number.
3. Owner opens order details to review products, customer data, delivery, payment, shipment, status history, and audit events.
4. Owner creates or assigns order tags and removes tags when they no longer apply.
5. Owner manually updates order status only through allowed domain transitions; every change writes an audit event.
6. Owner retries failed shipment creation from the order details page.

### Customer confirmation

1. Customer opens public order link.
2. Customer reviews product list and totals.
3. Customer opens the `Контакти` step and fills full name and phone.
4. Customer opens the `Доставка` step and chooses delivery carrier:
   - Нова пошта
5. Customer selects city and branch/office from official carrier data.
6. Customer opens the `Оплата` step and chooses payment:
   - online card transfer using owner requisites
   - cash on delivery
7. Customer opens `Перевірка`, reviews contact, delivery, and payment summaries, and submits the form.
8. App saves confirmation data, sets the order to `CONFIRMED_BY_CUSTOMER`, and prepares pending payment/shipment records.
9. Customer lands on the public status page for the same token. Reopening `/o/[token]` or `/o/[token]/delivery` shows the status summary instead of the delivery form.

### Payment

For online card transfer:

1. Owner creates active public payment requisites under `/dashboard/settings/payment`.
2. Customer chooses `Оплата картою онлайн`.
3. Public UI shows only active owner requisites and the Instagram receipt instruction.
4. App saves a pending `MANUAL_CARD_TRANSFER` payment and moves the order to `PAYMENT_PENDING`.
5. Owner marks the transfer received from order details after checking the receipt.
6. App marks the payment `PAID`, transitions through `PAID`, writes `MANUAL_PAYMENT_MARKED_PAID`, and then enqueues shipment creation when a shipment is present and eligible.

For cash on delivery:

1. App skips online payment.
2. App moves order to shipment creation.

### Shipment

1. App creates shipment job.
2. Worker calls selected carrier API.
3. App stores tracking number and label/reference.
4. Worker periodically syncs shipment status.
5. App auto-completes order when delivered according to configured rules.
6. Owner can manually retry failed shipment creation from a server action that re-enqueues the job.

## Order statuses

- DRAFT
- SENT_TO_CUSTOMER
- CONFIRMED_BY_CUSTOMER
- PAYMENT_PENDING
- PAID
- PAYMENT_FAILED
- SHIPMENT_PENDING
- SHIPMENT_CREATED
- IN_TRANSIT
- DELIVERED
- COMPLETED
- RETURN_REQUESTED
- RETURNED
- CANCELLED

## Image strategy

Initial strategy:

- Do not create S3/R2/Railway Storage Bucket.
- Do not implement binary image uploads at the start.
- Store one or more image URLs per product in `product_images`.
- Validate image URLs.
- Keep future storage strategy open.

Rationale:

The expected catalog size is small, around up to 100 products, so object storage is unnecessary for the first version.

Important caveat:

Do not store uploaded image files on ephemeral service storage. If uploads become necessary later, choose either Railway Volume for small single-service storage or an S3-compatible object storage service.

## Data model

Implemented foundation migrations:
- users
- accounts
- sessions
- verifications
- products
- product_images
- orders
- order_items
- customers
- payments
- payment_requisites
- shipments
- order_tags
- order_tag_links
- audit_events
- webhook_events
- carrier_directory_cache

Migration files:
- `drizzle/0000_spotty_golden_guardian.sql`
- `drizzle/0001_secret_the_fallen.sql`
- `drizzle/0002_romantic_sway.sql`
- `drizzle/0003_kind_deathstrike.sql`
- `drizzle/0004_cute_veda.sql`
- `drizzle/0005_wonderful_preak.sql`

Money values are stored in integer minor units. The historical product price column is `products.price_cents`; new order and payment amount columns use `_minor` naming.

Order item product snapshots are stored in:
- `product_name_snapshot`
- `product_sku_snapshot`
- `unit_price_minor`
- `product_image_urls_snapshot`

Public order links use a random URL-safe `orders.public_token` with a unique database constraint and `orders.public_token_expires_at`.

Confirmed customer delivery data is stored through existing tables:
- `orders.customer_id`
- `orders.confirmed_at`
- `orders.status`
- `customers.full_name`
- `customers.phone`
- `payments.provider`
- `payments.status`
- `shipments.carrier`
- `shipments.city_ref`
- `shipments.city_name`
- `shipments.carrier_office_id`
- `shipments.address_text`
- `shipments.carrier_payload`

No new migration was required for the customer delivery form milestone because the foundation schema already included these columns and `carrier_directory_cache`.

The legacy external acquiring payment milestone also required no new migration because the foundation schema already included:
- `payments.provider_invoice_id`
- `payments.provider_modified_at`
- `webhook_events.external_event_id`
- `webhook_events.provider_modified_at`
- the unique idempotency index on `webhook_events(provider, external_event_id)`

The shipment worker milestone required no new app-table migration because the foundation schema already included:
- `shipments.carrier_shipment_id`
- `shipments.tracking_number`
- `shipments.label_url`
- `shipments.status`
- `shipments.delivered_at`

`pg-boss` manages its own queue schema inside PostgreSQL when the worker connects with `DATABASE_URL`.

The owner order management milestone required no new migration because the foundation schema already included:
- `order_tags`
- `order_tag_links`
- `audit_events`
- order/customer/payment/shipment foreign keys and indexes used by the owner read models.

## Quality requirements

- TypeScript strict mode.
- 80%+ test coverage for lines, statements, branches, and functions.
- Clean architecture.
- No business logic in UI components.
- No direct external API calls from domain/application tests.
- CI must run lint, typecheck, coverage, e2e, and build.
- UI must be Ukrainian.
- No `admin` role.
- Automated tests must use pure domain tests, fake adapters, or `DATABASE_URL_TEST`; they must not reset or mutate production data.

Latest local quality status on 2026-04-30 after the owner order management milestone:
- `pnpm lint` passed.
- `pnpm typecheck` passed.
- `pnpm test:coverage` passed with 90.85% statements, 80.02% branches, 93% functions, and 90.85% lines across the configured coverage scope.
- `pnpm test:e2e` passed with Chromium, including owner order management for filtering, tag creation, manual status update, audit visibility, and shipment retry entry point.
- `pnpm build` passed.
- `pnpm db:generate` passed and created `drizzle/0003_kind_deathstrike.sql`.

Latest local quality status on 2026-04-30 after the UI polish milestone:
- `pnpm lint` passed.
- `pnpm typecheck` passed.
- `pnpm test:coverage` passed with 90.84% statements, 80.17% branches, 93% functions, and 90.84% lines across the configured coverage scope.
- `pnpm test:e2e` passed with Chromium, including the updated keyboard, mobile public customer, product creation, order builder, delivery/payment, legacy external acquiring, and owner order management checks.
- `pnpm build` passed.

Latest local quality status on 2026-04-30 after the Railway deployment readiness milestone:
- `pnpm lint` passed.
- `pnpm typecheck` passed.
- `pnpm test:coverage` passed with 90.84% statements, 80.15% branches, 93% functions, and 90.84% lines across the configured coverage scope.
- `pnpm test:e2e` passed with Chromium, including health, Ukrainian home UI, owner product/order flows, mocked customer delivery, mocked legacy external acquiring, owner order management, and owner-role access checks.
- `pnpm build` passed.
- Railway live deployment, PostgreSQL provisioning, GitHub autodeploy configuration, secure variable configuration, web health check verification, worker runtime verification, and Railway migration/database verification passed after Railway authentication was refreshed.

Latest local quality status on 2026-04-30 after the release candidate hardening milestone:
- `pnpm lint` passed.
- `pnpm typecheck` passed.
- `pnpm test:coverage` passed with 90.88% statements, 80.17% branches, 93.06% functions, and 90.88% lines across the configured coverage scope.
- `pnpm test:e2e` passed with Chromium: 8 tests covering health, Ukrainian home UI, owner product/order flows, mocked customer delivery, mocked legacy external acquiring, owner order management, and `user` role dashboard denial.
- `pnpm build` passed.
- Railway live deployment, PostgreSQL provisioning, GitHub autodeploy configuration, secure variable configuration, web health check verification, worker runtime verification, and Railway migration/database verification passed after Railway authentication was refreshed.

Latest local quality status on 2026-04-30 after the Railway live setup retry:
- `pnpm lint` passed.
- `pnpm typecheck` passed.
- `pnpm test:coverage` passed with 90.88% statements, 80.18% branches, 93.06% functions, and 90.88% lines across the configured coverage scope.
- `pnpm test:e2e` passed with Chromium: 8 tests covering health, Ukrainian home UI, owner product/order flows, mocked customer delivery, mocked legacy external acquiring, owner order management, and `user` role dashboard denial. The first run was blocked by local sandbox port binding permissions and passed after rerunning with elevated local server permission.
- `pnpm build` passed.
- Railway MCP/CLI live verification passed for project creation, service creation, PostgreSQL provisioning, GitHub autodeploy, secure variable configuration, web health, worker startup, and read-only database connectivity/schema verification.

Latest local quality status on 2026-04-30 after production owner access and payment/shipment safety:
- `pnpm lint` passed.
- `pnpm typecheck` passed.
- `pnpm test:coverage` passed with 87.24% statements, 80.35% branches, 91.5% functions, and 87.24% lines across the configured coverage scope.
- `pnpm test:e2e` passed with Chromium: 10 tests covering health, Ukrainian home UI, Ukrainian login UI, owner dashboard access, `user` dashboard denial, owner product/order flows, mocked customer delivery, mocked legacy external acquiring, and owner order management.
- `pnpm build` passed.
- Railway CLI verification passed for adding `OWNER_SETUP_TOKEN` securely with deploy triggering skipped; current validation requires it only for the production `web` first-owner setup path.

Latest local quality status on 2026-05-07 after owner setup and login persistence repair:
- `pnpm lint` passed.
- `pnpm typecheck` passed.
- `pnpm test:coverage` passed with 88.38% statements, 80.39% branches, 90.57% functions, and 88.38% lines across the configured coverage scope.
- `pnpm test:e2e` passed with Chromium: 11 tests covering health, Ukrainian home/login UI, owner and `user` dashboard access behavior, owner product/order flows, mocked customer delivery, mocked legacy external acquiring, owner order management, and the real `/setup` plus `/login` persistence path across dashboard navigation, hard reload, browser back/forward, and logout.
- `pnpm build` passed.

Latest local quality status on 2026-05-07 after Nova Post API replacement:
- `pnpm lint` passed.
- `pnpm typecheck` passed.
- `pnpm test:coverage` passed with 88.53% statements, 80.04% branches, 90.84% functions, and 88.53% lines across the configured coverage scope.
- `pnpm test:e2e` passed with Chromium: 11 tests covering health, Ukrainian home/login UI, owner and `user` dashboard access behavior, owner product/order flows, mocked customer delivery with Nova Post as the only public carrier, mocked legacy external acquiring, owner order management, and real setup/login persistence.
- `pnpm build` passed.

Latest local quality status on 2026-05-07 after Ukrposhta active-MVP removal:
- `pnpm lint` passed.
- `pnpm typecheck` passed.
- `pnpm test:coverage` passed with 88.48% statements, 80.29% branches, 90.64% functions, and 88.48% lines across the configured coverage scope.
- `pnpm test:e2e` passed with Chromium: 11 tests covering health, Ukrainian home/login UI, owner and `user` dashboard access behavior, owner product/order flows, mocked customer delivery with Nova Post as the only public carrier and no Ukrposhta option, mocked legacy external acquiring, owner order management, and real setup/login persistence.
- `pnpm build` passed.

Latest local quality status on 2026-05-07 after runtime-aware environment validation:
- `pnpm lint` passed.
- `pnpm typecheck` passed.
- `pnpm test:coverage` passed with 88.51% statements, 80.01% branches, 90.68% functions, and 88.51% lines across the configured coverage scope.
- `pnpm test:e2e` passed with Chromium: 11 tests covering health, Ukrainian home/login UI, owner and `user` dashboard access behavior, owner product/order flows, mocked customer delivery with Nova Post as the only public carrier and no Ukrposhta option, mocked legacy external acquiring, owner order management, and real setup/login persistence.
- `pnpm build` passed.

Latest local quality status on 2026-05-07 after final production-readiness audit:
- `pnpm lint` passed.
- `pnpm typecheck` passed.
- `pnpm test:coverage` passed with 88.51% statements, 80.01% branches, 90.68% functions, and 88.51% lines across the configured coverage scope.
- `pnpm test:e2e` passed with Chromium: 11 tests covering health, clickable Ukrainian home CTA navigation, Ukrainian login UI, owner and `user` dashboard access behavior, owner product/order flows, mocked customer delivery with Nova Post as the only public carrier and no Ukrposhta option, mocked legacy external acquiring, owner order management, and real setup/login/logout persistence.
- `pnpm build` passed.

Latest local quality status on 2026-05-07 after production auth redirect hardening:
- `pnpm lint` passed.
- `pnpm typecheck` passed.
- `pnpm test:coverage` passed with 88.42% statements, 80% branches, 90.66% functions, and 88.42% lines across the configured coverage scope.
- `pnpm test:e2e` passed with Chromium: 11 tests passed and the opt-in production auth smoke spec skipped by default.
- `pnpm build` passed.

Latest local quality status on 2026-05-08 after Nova Post authorization header repair:
- `pnpm lint` passed.
- `pnpm typecheck` passed.
- `pnpm test:coverage` passed with 88.42% statements, 80.01% branches, 90.66% functions, and 88.42% lines across the configured coverage scope.
- `pnpm test:e2e` passed with Chromium: 11 tests passed and the opt-in production auth smoke spec skipped by default.
- `pnpm build` passed.

Latest local quality status on 2026-05-08 after the mobile UI audit and refactor plan:
- `pnpm lint` passed.
- `pnpm typecheck` passed.
- `pnpm test:coverage` passed with 88.42% statements, 80.01% branches, 90.66% functions, and 88.42% lines across the configured coverage scope.
- `pnpm test:e2e` passed with Chromium: 11 tests passed and the opt-in production auth smoke spec skipped by default.
- `pnpm build` passed.

Latest local quality status on 2026-05-08 after the reusable multi-step form foundation:
- `pnpm lint` passed.
- `pnpm typecheck` passed.
- `pnpm test:coverage` passed with 88.76% statements, 80.23% branches, 91.01% functions, and 88.76% lines across the configured coverage scope.
- `pnpm test:e2e` passed with Chromium: 13 tests passed and the opt-in production auth smoke spec skipped by default.
- `pnpm build` passed.

Latest local quality status on 2026-05-08 after the product form stepper adoption:
- `pnpm lint` passed.
- `pnpm typecheck` passed.
- `pnpm test:coverage` passed with 88.97% statements, 80.37% branches, 91.1% functions, and 88.97% lines across the configured coverage scope.
- `pnpm test:e2e` passed with Chromium: 14 tests passed and the opt-in production auth smoke spec skipped by default.
- `pnpm build` passed.

Latest local quality status on 2026-05-08 after the owner order builder stepper adoption:
- `pnpm lint` passed.
- `pnpm typecheck` passed.
- `pnpm test:coverage` passed with 89.19% statements, 80.48% branches, 90.73% functions, and 89.19% lines across the configured coverage scope.
- `pnpm test:e2e` passed with Chromium: 14 tests passed and the opt-in production auth smoke spec skipped by default.
- `pnpm build` passed.
- Playwright MCP inspected `/dashboard/orders/new` at 390x844 and 1440x900 with E2E-safe owner/product data. The only console error was the existing missing `/favicon.ico` dev request.

Latest local quality status on 2026-05-08 after the public delivery stepper adoption:
- `pnpm lint` passed.
- `pnpm typecheck` passed.
- `pnpm test:coverage` passed with 89% statements, 80.58% branches, 90.14% functions, and 89% lines across the configured coverage scope.
- `pnpm test:e2e` passed with Chromium: 14 tests passed and the opt-in production auth smoke spec skipped by default.
- `pnpm build` passed.
- Playwright MCP inspected `/o/[token]/delivery` at 360x740 and 390x844 with E2E-safe public order data. The only console error was the existing missing `/favicon.ico` dev request.

Latest local quality status on 2026-05-08 after final responsive QA:
- `pnpm lint` passed.
- `pnpm typecheck` passed.
- `pnpm test:coverage` passed with 90.01% statements, 81.69% branches, 91.1% functions, and 90.01% lines across the configured coverage scope.
- `pnpm test:e2e tests/e2e/final-responsive-qa.spec.ts` passed with Chromium: 3 tests covering the final viewport matrix, keyboard navigation, and delivery loading/empty/success states.
- `pnpm test:e2e` passed with Chromium: 19 tests passed and the opt-in production auth smoke spec skipped by default.
- `pnpm build` passed.

Latest local quality status on 2026-05-08 after Prompt 09 final QA:
- `pnpm lint` passed.
- `pnpm typecheck` passed.
- `pnpm test:coverage` passed with 88.99% statements, 81.44% branches, 89.76% functions, and 88.99% lines across the configured coverage scope.
- `PORT=3100 PLAYWRIGHT_BASE_URL=http://127.0.0.1:3100 pnpm test:e2e` passed with Chromium: 22 tests passed and the opt-in production auth smoke spec skipped by default.
- `pnpm build` passed.
- A local browser customer-flow check confirmed the active manual-card UI contains `Оплата картою онлайн` and `Після оплати надішліть квитанцію продавцю в Instagram чат`, and does not contain `legacy external acquiring` or `legacy external acquiring`.
- Production unauthenticated health smoke passed against `https://web-production-26609.up.railway.app/api/health`; authenticated production smoke remains gated by temporary local `E2E_PROD_EMAIL` and `E2E_PROD_PASSWORD`.

Prompt 10 recovery on 2026-05-08:
- Plain `pnpm test:e2e` initially failed because an unrelated local Next.js app was already responding on `127.0.0.1:3000`. This repo's `next dev` process fell back to port 3001, while Playwright still used port 3000 and rendered the other app's generic 404 page.
- Playwright local E2E now defaults to `http://127.0.0.1:3100`, starts this repo's dev server with the matching explicit host and port, and does not reuse arbitrary existing local servers. Set `PLAYWRIGHT_BASE_URL` to another loopback URL when port 3100 is unavailable.
- E2E seeded-auth cookie defaults and environment documentation were aligned to the 3100 default.
- Recovery verification passed with `pnpm lint`, `pnpm typecheck`, `pnpm test:coverage` at 88.99% statements, 81.44% branches, 89.76% functions, and 88.99% lines, `pnpm test:e2e` with 22 passed and the production smoke skipped, and `pnpm build`.

## DB-00 аудит розділення баз даних на 2026-05-09

Мета наступного етапу: відокремити нову production PostgreSQL від поточної Railway PostgreSQL без руйнівних дій. У цьому кроці бази даних не створювалися, змінні Railway не перемикалися, сервіси не перейменовувалися, а секретні значення не записувалися в репозиторій.

Поточний Railway стан:
- Проєкт Railway: `dase`, середовище: `production`.
- Сервіси: `web`, `worker`, `Postgres`.
- Поточний PostgreSQL: сервіс `Postgres` (`aff7...cb4d`), позначка: `test/staging candidate`.
- `web` (`663c...998f`) і `worker` (`9335...e9b1`) зараз використовують `DATABASE_URL`, який резолвиться до приватного Railway хоста поточного `Postgres`.
- Останні успішні деплої `web` і `worker` створені з GitHub `main` коміта `2f252b83a32c755f390f5a9a72ee8f8fa7b04809` (`Add tasks for railway DB split`).
- `web` використовує `/railway.json` з `pnpm db:migrate` перед стартом `pnpm start`.
- `worker` використовує `/railway.worker.json` і стартує через `pnpm worker:start` без окремої pre-deploy міграції.
- Поточний `Postgres` має volume `postgres-volume` на `/var/lib/postgresql/data`. Railway підтримує backup/snapshot для volume-сервісів, але доступні MCP/CLI команди під час цього аудиту показали volume і не повернули список наявних backup-записів або розкладів.
- Для локального підключення до поточної/test бази можна використати `DATABASE_PUBLIC_URL` із сервісу `Postgres`; повний URL треба зберігати тільки в локальних `.env` файлах, які ігноруються Git. Приватний `DATABASE_URL` із `postgres.railway.internal` підходить для Railway runtime, але напряму з локальної машини не резолвиться без Railway CLI/proxy.
- У робочій копії немає локальних `.env`, `.env.production.local` або `.env.production`; `.gitignore` ігнорує `.env` та `.env.*`, але залишає `.env.example` відстежуваним.

План розділення:
1. Створити новий Railway PostgreSQL сервіс для production і не перейменовувати поточний `Postgres`, доки всі посилання `DATABASE_URL` не будуть перевірені.
2. Перед перемиканням створити manual backup/snapshot або інший безпечний export поточного `Postgres`; якщо список backup-записів недоступний через CLI/MCP, перевірити вкладку Backups у Railway UI перед змінами.
3. Перенести production `web` `DATABASE_URL` на нову production PostgreSQL змінну або Railway reference, залишивши поточний `Postgres` як `test/staging candidate`.
4. Запустити міграції проти нової production PostgreSQL через `web` pre-deploy (`pnpm db:migrate`) і переконатися, що міграції завершилися успішно до старту `worker`.
5. Лише після успішного `web` deploy і міграцій перемкнути production `worker` `DATABASE_URL` на нову production PostgreSQL.
6. Додати поточну/test базу в локальний `.env` через `DATABASE_PUBLIC_URL` із `Postgres`, а production значення тримати в локальному `.env.production.local` або `.env.production`; ці файли не комітити.
7. Після запуску нової production бази відкрити `/setup`, ввести `OWNER_SETUP_TOKEN` у форму українською мовою, створити першого `owner`, після цього перевірити `/login`, `/dashboard` і недоступність `/setup`.

## DB-01 production database split on 2026-05-09

Railway MCP confirmed the production project services before changes. The current `web` (`663c...998f`) and `worker` (`9335...e9b1`) `DATABASE_URL` values matched the old `Postgres` (`aff7...cb4d`) database endpoint before the switch, without printing credentials.

Backup status:
- The current `Postgres` volume `postgres-volume` (`c4f...a598`) remains attached at `/var/lib/postgresql/data`.
- The available Railway MCP/CLI commands can list volumes but do not expose backup creation or backup schedules.
- Before deleting, mutating, or repurposing the old/current DB, create a manual Railway backup in the dashboard: project `dase` -> environment `production` -> service `Postgres` -> `Backups` tab -> create a manual backup for `postgres-volume` and verify its timestamp.
- DB-01 did not delete, mutate, or repurpose the old/current DB.

Production DB result:
- Created new Railway PostgreSQL service `Postgres-1P5k` (`f7fd...3271`) for production. Railway generated the name; available MCP/CLI commands do not expose service renaming.
- Retained `Postgres` (`aff7...cb4d`) as the test/staging database service.
- Set production `web` `DATABASE_URL` to the new `Postgres-1P5k` Railway reference first, leaving `worker` on the old DB until web verification passed.
- Redeployed `web`; deployment `5265...5bcd` succeeded, Drizzle migrations reported success, `/api/health` returned `status: ok`, and a read-only schema check returned 17 public tables with all 16 expected app tables present.
- The new production DB had zero owners after migration, so the first `owner` must be created through `/setup` with `OWNER_SETUP_TOKEN`.
- After web migration and health verification, set production `worker` `DATABASE_URL` to the same `Postgres-1P5k` Railway reference.
- Redeployed `worker`; deployment `a0be...3271` succeeded and logs include `Shipment worker is ready.`
- Final redacted variable comparison confirmed production `web` and `worker` resolve to the new production DB and no longer resolve to the old `Postgres` service.
- No object storage service was created.
- Local verification after the documentation update passed: `pnpm lint`, `pnpm typecheck`, `pnpm test:coverage` with 88.99% statements/lines, 81.44% branches, and 89.76% functions, `pnpm test:e2e` with 22 passed and the opt-in production smoke skipped, and `pnpm build`.

## DB-02 local environment switching on 2026-05-09

Local secret env files were created on the trusted local machine and remain untracked:
- `.env` for local development and test checks against the old/current Railway `Postgres` test/staging database through its public proxy.
- `.env.test.local` for restoring the same test/staging values.
- `.env.production.local` for emergency local production checks against the new production `Postgres-1P5k` database through its public proxy.

Secret handling:
- `.gitignore` was verified to ignore `.env`, `.env.*`, `.env.local`, `.env.test.local`, `.env.production`, and `.env.production.local`, while keeping `.env.example` tracked.
- The local env files were set to mode `600`.
- Railway variables were inspected only for presence, shape, and redacted host summaries in tracked documentation. Full secret values are not stored in the repository.
- The test/staging database uses a public proxy host on `switchyard.proxy.rlwy.net`; the production database uses a public proxy host on `monorail.proxy.rlwy.net`.
- `.env.production.local` uses production web auth values from Railway, production `BETTER_AUTH_URL=https://web-production-26609.up.railway.app`, and `SHIPPING_LABEL_CREATION_MODE=disabled`.
- Production payment and shipping API secrets were not copied into local env files.
- Playwright local E2E now explicitly blanks `DATABASE_URL` and `DATABASE_URL_TEST` for the dev server while `PLAYWRIGHT_E2E=1`, so browser tests keep using isolated in-memory repositories even when local ignored env files contain Railway database URLs.

Shipping creation update on 2026-05-09, superseded by ENV-05 on 2026-05-10:
- Local ignored env files previously carried env-backed Nova Post stage/test API and sender/default values for live validation.
- ENV-05 removed those owner-managed Nova Post key names from `.env`, `.env.test.local`, and `.env.production.local` after runtime switched to encrypted owner settings.
- `.env` and `.env.test.local` now carry local development/test `APP_ENCRYPTION_KEY` values; `.env.production.local` contains only a placeholder comment for the production encryption key.
- Playwright local E2E still overrides the dev server to `SHIPPING_LABEL_CREATION_MODE=disabled`, so automated browser tests do not call Nova Post.

Documentation:
- `.env.example` contains only non-secret placeholders and local-safe defaults.
- `DEPLOYMENT.md` documents in Ukrainian how to use `.env` for local/test, temporarily copy `.env.production.local` to `.env`, restore `.env` back to test/staging, and avoid committing secrets.

Verification passed after the E2E harness isolation update:
- `git status --ignored` showed `.env`, `.env.test.local`, and `.env.production.local` under ignored files.
- `pnpm lint`
- `pnpm typecheck`
- `pnpm test:coverage` with 404 tests passed and 88.99% statements/lines, 81.44% branches, and 89.76% functions.
- `pnpm test:e2e` with 22 passed and the opt-in production smoke skipped.
- `pnpm build`

## DB-03 перевірка production setup першого owner на 2026-05-09

Виконано без створення production `owner`, бо цей запуск не мав явного дозволу створити реального першого власника.

Поточний production стан:
- Railway MCP підтвердив сервіси `web`, `worker`, `Postgres-1P5k` і `Postgres` у production-проєкті.
- Останні production деплої `web` (`5265...5bcd`) і `worker` (`a0be...3271`) мають статус `SUCCESS`.
- Перевірка змінних Railway з редагуванням секретних значень підтвердила, що production `web` `DATABASE_URL` вказує на `Postgres-1P5k`, `BETTER_AUTH_URL=https://web-production-26609.up.railway.app`, `BETTER_AUTH_SECRET`, `OWNER_SETUP_TOKEN` і `NODE_ENV=production` присутні. Значення секретів не друкувалися.
- Запит тільки для читання проти `Postgres-1P5k` через публічний proxy повернув 17 `public` таблиць і `owner_count=0`.
- Сторінка `/setup` у production відкриває українську форму `Створення першого власника` з полями токена, імені, email, пароля і кнопкою відправлення.
- Недійсний токен налаштування показує українську помилку і не створює `owner`; повторний запит тільки для читання після спроби з недійсним токеном повернув `owner_count=0`.
- Створення через дійсний токен, `/login`, `/dashboard` і недоступна `/setup` після створення owner залишаються ручними кроками для користувача, доки він не дозволить створити production `owner`.

Ручну інструкцію додано до `README.md` і `DEPLOYMENT.md` у розділі `Створення першого owner у production`: відкрити `https://web-production-26609.up.railway.app/setup` або `/setup` на власному домені, ввести `OWNER_SETUP_TOKEN`, якщо форма просить токен, створити `owner` з ім’ям/email/паролем, увійти після перенаправлення на `/login`, відкрити `/dashboard`, перевірити недоступність `/setup`, потім змінити або видалити `OWNER_SETUP_TOKEN`, якщо він більше не потрібен.

## DB-04 database split recovery audit on 2026-05-09

Recovery review found no active broken deployment after the production/test database split. No database service was deleted, no destructive migration was run, no production data was mutated, and no Railway variable correction or redeploy was required.

Railway production state:
- Services present: `web`, `worker`, `Postgres-1P5k`, and `Postgres`.
- `Postgres-1P5k` remains the production database service. `Postgres` remains retained as the test/staging database service.
- Latest successful `web` deployment is `5265...5bcd`, created from GitHub `main` commit `2f252b83a32c755f390f5a9a72ee8f8fa7b04809` with `/railway.json`, `pnpm db:migrate`, and `pnpm start`.
- Latest successful `worker` deployment is `a0be...3271`, created from the same commit with `/railway.worker.json` and `pnpm worker:start`.
- Production `web` and `worker` `DATABASE_URL` values resolve to the new production database host `postgres-1p5k.railway.internal:5432/<db>`, while the retained test/staging database resolves to `postgres.railway.internal:5432/<db>`.

Recovery checks:
- `web` deploy logs show `pnpm db:migrate` completed with `migrations applied successfully`; no migration failure, auth environment validation failure, `DATABASE_URL` error, or owner setup error was found in filtered deploy logs.
- `worker` deploy logs show `Shipment worker is ready.`; no `DATABASE_URL`, pg-boss startup, migration, missing-table, or relation error was found in filtered deploy logs.
- Read-only production database verification through the Railway public proxy returned 17 `public` tables, no missing expected app tables, `owner_count=0`, and 7 pg-boss tables.
- Production `/api/health` returned `status: ok`.
- Production `/logout` returned a `307` redirect to `https://web-production-26609.up.railway.app/login?logout=1`; the response used secure Better Auth cookies and did not redirect to localhost.
- Production `/setup` returned the Ukrainian first-owner setup form, so setup is available because the new production database still has no `owner`.
- Production `BETTER_AUTH_URL` is the public Railway web origin and `BETTER_AUTH_SECRET` is present. No localhost cookie configuration was found in the production response.

Resolution:
- The intended DB split is intact: `web` migrated and serves the production database first, then `worker` runs against the same production database.
- Because the active deployment and database checks passed, no rollback, variable change, manual migration command, or worker stop/redeploy was needed.
- The remaining owner setup status is unchanged from DB-03: the first production `owner` still needs to be created through `/setup` with `OWNER_SETUP_TOKEN`.
- Local verification after the DB-04 documentation update passed: `pnpm lint`, `pnpm typecheck`, `pnpm test:coverage` with 404 tests passed and 88.99% statements/lines, 81.44% branches, and 89.76% functions, `pnpm test:e2e` with 22 passed and the opt-in production smoke skipped, and `pnpm build`.

## ENV-00 environment cleanup audit on 2026-05-10

Completed a docs-only audit before moving shipping/payment configuration out of environment variables. The detailed audit is in `docs/audits/env-cleanup.md`.

Current findings:
- legacy external acquiring/legacy external acquiring env names are still documented and parsed for historical webhook/retry code, but legacy external acquiring is not part of the active customer payment flow.
- Nova Post API, auth URL, sender, payer, and parcel defaults are still parsed from env and used by the current Nova Post carrier factory.
- `NOVA_POSHTA_*` compatibility env names are still accepted by code and tracked docs.
- `SHIPPING_LABEL_CREATION_MODE` is still a global runtime switch and should be kept only as a global kill switch if retained after owner settings are implemented.
- Railway `web` and `worker` currently have Nova Post env-backed configuration names that should be deleted only after code reads owner settings from the database.
- Ignored local `.env`, `.env.test.local`, and `.env.production.local` contain Nova Post env-backed configuration names that should be removed only after code support lands.

Planned direction:
- Add owner-scoped encrypted Nova Post settings backed by a new `APP_ENCRYPTION_KEY`.
- Add owner shipping settings UI alongside the existing payment settings pattern.
- Refactor public carrier lookups and worker shipment creation to resolve Nova Post settings by owner/order context.
- Remove deprecated legacy external acquiring and Nova Post env validation/docs in a later cleanup step after runtime code no longer depends on those names.

## ENV-04 deprecated environment cleanup on 2026-05-10

Implemented tracked code and documentation cleanup for deprecated payment and owner-managed shipping configuration.

Current state:
- Active environment validation accepts infrastructure/runtime keys only and strips deprecated payment and owner-managed Nova Post keys when present.
- `.env.example` documents database/auth, `APP_ENCRYPTION_KEY`, `SHIPPING_LABEL_CREATION_MODE`, worker timing, and test/smoke variables only.
- Active payment runtime is manual owner card transfer plus cash on delivery. Invoice creation, acquiring webhook handling, payment retry actions, and runtime acquiring configuration were removed from active code.
- Public customer UI offers only `Оплата картою онлайн` when active owner requisites exist and `Післяплата`.
- Owner UI does not show inactive acquiring retry actions. Historical payment rows remain readable through a generic historical payment label.
- Active Nova Post runtime uses encrypted owner settings from `/dashboard/settings/shipping`; the existing database carrier enum value remains for historical shipment rows and current carrier compatibility.
- `SHIPPING_LABEL_CREATION_MODE` remains as a global kill switch: `disabled`, `mock`, or `live`.
- No Railway variables, ignored local env files, production data, or unsafe DB enum history were deleted in this milestone.

## ENV-05 operational environment cleanup on 2026-05-10

Completed operational cleanup of deprecated ignored local env files and Railway production variables after ENV-04 removed the active runtime dependency on those names.

Local ignored env result:
- Checked `.env`, `.env.local`, `.env.test.local`, `.env.production`, and `.env.production.local`.
- Edited only existing ignored files: `.env`, `.env.test.local`, and `.env.production.local`.
- Removed deprecated owner-managed Nova Post key names from the existing ignored files. No `MONOBANK_*`, `NOVA_POSHTA_*`, or `NOVA_POST_AUTH_URL` key names were present locally during ENV-05.
- Added generated local development/test `APP_ENCRYPTION_KEY` values to `.env` and `.env.test.local`.
- Left `.env.production.local` with a placeholder comment for `APP_ENCRYPTION_KEY`; a production secret was not invented or copied into the file.
- Existing ignored env files were set to mode `600` and were not committed.

Railway result:
- Railway MCP authentication passed before cleanup, and Railway production services `web` and `worker` were inspected without printing secret values.
- Removed deprecated owner-managed Nova Post key names from both `web` and `worker`.
- Verified no deprecated `MONOBANK_*`, `NOVA_POSHTA_*`, `NOVA_POST_API_*`, `NOVA_POST_AUTH_URL`, `NOVA_POST_SENDER_*`, `NOVA_POST_PAYER_*`, or `NOVA_POST_DEFAULT_*` names remain on the app services.
- Generated one production `APP_ENCRYPTION_KEY`, set it on `web` and `worker`, and verified it is not reused from `BETTER_AUTH_SECRET`.
- Verified required variables are present by name: `DATABASE_URL`, `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`, `OWNER_SETUP_TOKEN`, `APP_ENCRYPTION_KEY`, and `SHIPPING_LABEL_CREATION_MODE` for `web`; `DATABASE_URL`, `AUTO_COMPLETE_AFTER_DELIVERED_HOURS`, `APP_ENCRYPTION_KEY`, and `SHIPPING_LABEL_CREATION_MODE` for `worker`.
- Set `SHIPPING_LABEL_CREATION_MODE=disabled` on `web` and `worker` until owner shipping settings are saved and verified for a deliberate live shipment cutover.
- Latest ENV-05 Railway deploys succeeded from GitHub commit `74e82b487e7d0182df4f0179d005890034ab959d`: `web` deployment `b6dd81bd-8c5e-4a12-9e37-fa5905ddd18e` and `worker` deployment `3eaa4437-f2ac-49f9-b458-4ffbac9eadec`.
- `/api/health` returned `status: ok`; web deploy logs showed migrations applied successfully and the Next.js server ready; worker deploy logs included `Shipment worker is ready.`
- Filtered app logs did not show missing Nova Post env errors after cleanup.
- Authenticated final production smoke remains intentionally out of ENV-05 scope. Local Playwright coverage verifies `/dashboard/settings/shipping` for a seeded owner and denies `user` role access.

## ENV-06 optional shipping env migration helper on 2026-05-10

Added an opt-in helper for local/test or staging recovery when deprecated Nova Post env values still exist in the current shell:

```bash
pnpm settings:migrate-shipping-env -- --owner-email owner@example.com
```

Behavior:
- Requires exactly one explicit owner selector: `--owner-email` or `--owner-id`.
- Reads deprecated Nova Post key names only from the current process env; it does not read ignored env files itself and does not call live Nova Post APIs.
- Resolves the selected account and refuses missing or non-`owner` users, so settings are not created for a `user` account.
- Requires `DATABASE_URL` and `APP_ENCRYPTION_KEY` in the current shell before writing settings.
- Encrypts the migrated API key through the existing application encryption service and returns only `apiKeyConfigured` plus the masked preview.
- Refuses to overwrite existing owner shipping settings unless `--force` is passed.
- Refuses `NODE_ENV=production` unless `--allow-production` is passed after explicit approval. The normal production path remains manual setup through `/dashboard/settings/shipping`.

Deprecated env keys remain deprecated because they are process-global, not owner-scoped, and cannot safely represent multiple sellers. Runtime public lookup and worker shipment creation continue to resolve encrypted owner settings from order context.

## ENV-07 final owner-managed shipping verification on 2026-05-10

Completed the final QA pass after moving Nova Post configuration to owner settings and cleaning deprecated env keys.

Verification result:
- Code search found no active runtime reads of deprecated `MONOBANK_*`, `NOVA_POSHTA_*`, `NOVA_POST_API_*`, `NOVA_POST_AUTH_URL`, `NOVA_POST_SENDER_*`, `NOVA_POST_PAYER_*`, or `NOVA_POST_DEFAULT_*` env names. Remaining matches are historical schema/migration compatibility, explicit env-stripping tests, audit/task docs, or the one-time local/test migration helper.
- `.env.example` lists only current infrastructure/runtime, test, and smoke variables. Nova Post API keys, sender data, payer data, and parcel defaults remain owner-managed through `/dashboard/settings/shipping`.
- README and DEPLOYMENT describe owner shipping settings UI, masked API-key display, encrypted storage, and the requirement that Railway app services must not keep deprecated shipping/payment variable names.
- Railway MCP confirmed production services `web`, `worker`, `Postgres`, and `Postgres-1P5k`; current `web` and `worker` deployments are successful from GitHub commit `74e82b487e7d0182df4f0179d005890034ab959d`.
- Key-only Railway variable inspection confirmed deprecated payment/shipping env names are absent from both `web` and `worker`, while `APP_ENCRYPTION_KEY` and the expected runtime keys are present by name. Secret values were not printed.
- Production `/api/health` returned `status: ok`; filtered startup logs did not mention missing Nova Post env keys; worker deploy logs included `Shipment worker is ready.`
- Authenticated production UI smoke was not completed because no temporary `E2E_PROD_EMAIL` and `E2E_PROD_PASSWORD` were present in the local shell. Production Nova Post test-key smoke was also not run because no test key was present in local env.
- Local Playwright coverage continues to verify `/dashboard/settings`, `/dashboard/settings/shipping`, default stage/test environment, API-key masking, sender settings, connection-test action behavior, shipping creation toggle, public delivery lookup through the order owner's settings, safe missing-settings Ukrainian copy, manual online card payment, cash on delivery, and absence of active MonoPay/Monobank UI copy.

Manual owner steps that remain:
- Create the first production `owner` through `/setup` if the production database is still empty.
- Sign in as that owner, open `/dashboard/settings/payment`, and add active public payment requisites if online manual card transfer should be available to customers.
- Open `/dashboard/settings/shipping`, save a Nova Post stage/test API key and sender settings, confirm only the masked preview is shown, and run `Перевірити підключення`.
- Keep `SHIPPING_LABEL_CREATION_MODE=disabled` until a deliberate low-risk live-shipping cutover is approved; switch to `live` only after owner settings are verified.
- Create a low-risk public order and verify the delivery page offers only available carriers and does not expose settings details.

## Commands

Configured commands:

```bash
pnpm start
pnpm lint
pnpm typecheck
pnpm test
pnpm test:coverage
pnpm test:e2e
pnpm test:e2e:prod
pnpm build
pnpm db:generate
pnpm db:migrate
pnpm settings:migrate-shipping-env
pnpm worker:start
```

Current command status:
- `package.json`, `pnpm-lock.yaml`, and `pnpm-workspace.yaml` are present.
- `pnpm start` runs `next start` for Railway web deployments.
- `pnpm db:generate` was verified and generated Drizzle migrations through `drizzle/0003_kind_deathstrike.sql`.
- `pnpm db:migrate` requires a secure `DATABASE_URL`; Railway web deployments run it as the pre-deploy command against Railway PostgreSQL.
- `pnpm worker:start` requires a secure `DATABASE_URL` and explicit `AUTO_COMPLETE_AFTER_DELIVERED_HOURS` in production; the Railway worker service starts successfully with the Railway PostgreSQL reference configured.
- `pnpm test:e2e:auth` is an opt-in DB-backed auth smoke wrapper for `RUN_AUTH_SMOKE=1`, credentials loaded from ignored `.env.test.local`, and a local/test `PLAYWRIGHT_BASE_URL`.
- `pnpm test:e2e:prod` is an opt-in production auth smoke wrapper for `RUN_PROD_SMOKE=1`, `PLAYWRIGHT_BASE_URL=https://web-production-26609.up.railway.app`, and temporary local `E2E_PROD_EMAIL` / `E2E_PROD_PASSWORD` credentials.
- Required local checks are available through pnpm scripts.

## Environment variables

```txt
DATABASE_URL=
DATABASE_URL_TEST=

BETTER_AUTH_SECRET= # production web
BETTER_AUTH_URL= # production web
OWNER_SETUP_TOKEN= # production web setup path only while first-owner setup is available
APP_ENCRYPTION_KEY= # required to save/decrypt owner Nova Post settings

SHIPPING_LABEL_CREATION_MODE=disabled

# Nova Post API key, endpoint, sender, payer, and parcel defaults are owner
# settings saved from /dashboard/settings/shipping, not runtime env vars.

AUTO_COMPLETE_AFTER_DELIVERED_HOURS=24 # production worker

NODE_ENV=development
CI=

PLAYWRIGHT_E2E=
PLAYWRIGHT_BASE_URL=http://127.0.0.1:3100
USE_MOCK_SHIPPING_CARRIERS=

RUN_AUTH_SMOKE=
E2E_AUTH_EMAIL=
E2E_AUTH_PASSWORD=

# Local shell only for authenticated production smoke tests. Do not configure
# these in Railway runtime variables and do not commit credential values.
RUN_PROD_SMOKE=
E2E_PROD_EMAIL=
E2E_PROD_PASSWORD=
```

No S3/storage bucket env vars are required for the initial version.

`NODE_ENV` is normally managed by Next.js/Railway and `CI` by GitHub Actions; they are documented here because local tooling reads them.

Never commit `.env` files or secret values.

## Railway PostgreSQL

Railway MCP should be used immediately to provision PostgreSQL.

Expected result:
- Railway project exists or is connected.
- PostgreSQL service exists.
- `DATABASE_URL` is configured securely.
- Migrations can run against Railway PostgreSQL.
- Repository/use case integration checks can use the configured test/development database safely.

Current Railway status on 2026-04-30:
- Railway MCP tools are available.
- `list_projects` failed during Prompt 02 and Prompt 03 because the Railway token is invalid or expired.
- `list_services` failed during Prompt 04 because the Railway token is invalid or expired.
- `list_projects` failed again during Prompt 05 because the Railway token is invalid or expired.
- `list_services` failed again during Prompt 06 because the Railway token is invalid or expired.
- `list_projects` failed again during Prompt 07 because the Railway token is invalid or expired.
- `list_projects` and `list_services` failed again during Prompt 08 because the Railway token is invalid or expired.
- `list_projects` and `list_services` failed again during Prompt 09 because the Railway token is invalid or expired.
- `check_railway_status`, `list_services`, and `list_variables` failed again during Prompt 10 because the Railway token is invalid or expired.
- `check_railway_status` failed again during Prompt 11 because the Railway token is invalid or expired.
- After Railway authentication was refreshed, `check_railway_status` passed.
- Railway project `dase` was created and linked.
- Services `web`, `worker`, and `Postgres` exist in the `production` environment.
- PostgreSQL was provisioned through Railway MCP template deployment.
- `DATABASE_URL` is configured securely for `web` and `worker` through Railway service variables as a reference to the `Postgres` service.
- `OWNER_SETUP_TOKEN` is configured securely for the production first-owner setup path; current validation requires it only from the `web` setup flow, not from the `worker`. The value is intentionally not documented or committed.
- `web` is connected to `psht13/dase` on `main`, autodeploy is enabled, and the latest deployment succeeded from `/railway.json`.
- `worker` is connected to `psht13/dase` on `main`, autodeploy is enabled, and the latest deployment succeeded from `/railway.worker.json`.
- Web health check verification passed at https://web-production-26609.up.railway.app/api/health.
- Railway PostgreSQL connectivity and migrations were verified with a read-only table count check through the Railway public database proxy.

Fallback for local development:
- Use a local or disposable PostgreSQL database for development tests.
- Keep integration tests isolated from production data.
- Do not commit local connection strings.

## Deployment

Target: Railway

Services:
- web
- worker
- postgres

Deployment:
- GitHub autodeploy from protected `main`.
- Run migrations before web deployment.
- Worker runs separately from web process.

Current deployment status:
- GitHub Actions CI is configured in `.github/workflows/ci.yml` to run install, lint, typecheck, coverage, e2e, and build.
- Repository-side Railway config is present for the `web` service in `railway.json`.
- Repository-side Railway config is present for the `worker` service in `railway.worker.json`; the Railway worker service uses `/railway.worker.json` as its custom config file path and `pnpm worker:start` as the start command.
- `DEPLOYMENT.md` documents expected Railway services, env vars, GitHub autodeploy from protected `main`, migration flow, rollback notes, manual external API verification, and the external-image-URL image strategy.
- Live Railway service creation, GitHub repository linking, PostgreSQL provisioning, secure variable configuration, autodeploy setup, web deployment, worker deployment, health check verification, and migration/database verification were completed after Railway authentication was refreshed.

## Implementation plan

### Milestone 1 - Application scaffold and quality gates

Status: completed on 2026-04-30.

- Scaffolded Next.js App Router with TypeScript strict mode and pnpm.
- Added lint, typecheck, unit coverage, e2e, and build scripts.
- Added CI workflow for required checks.
- Added baseline Ukrainian UI shell.
- Added environment validation without committing secrets.
- Added `/api/health` and tests.

### Milestone 2 - Database and domain foundation

Status: completed on 2026-04-30; Railway migration verification passed after Railway authentication was refreshed.

- Add Drizzle PostgreSQL setup and migrations.
- Model users, products, product images, orders, order items, customers, payments, shipments, tags, audit events, webhook events, and carrier cache.
- Add domain/application tests for product and order invariants.
- Verify migrations against Railway PostgreSQL when credentials are available, otherwise a local disposable database.

### Milestone 3 - Owner catalog and order draft flow

Status: completed on 2026-04-30; Railway deployment and migration verification passed after Railway authentication was refreshed.

- Implement owner authentication and dashboard access for `owner` role only.
- Implement product catalog CRUD with external image URLs.
- Implement order draft creation from selected products and quantities.
- Generate secure public order tokens.

### Milestone 4 - Public customer confirmation

Status: completed on 2026-04-30; Railway deployment and migration verification passed after Railway authentication was refreshed.

- Implement public order page.
- Add Ukrainian delivery and payment form validation.
- Integrate carrier directory adapters through ports with mocked tests.
- Persist customer confirmation data.
- Cache city and warehouse directory lookups.
- Add Playwright e2e for customer confirmation with mocked carriers.

### Milestone 5 - Payments, shipments, and worker

Status: payment module and shipment worker automation completed on 2026-04-30, then updated on 2026-05-10 so active payments use manual card transfer and cash on delivery only. Railway migration/database verification and worker startup verification passed after Railway authentication was refreshed.

- Implement manual card transfer and cash-on-delivery payment handling. Active acquiring invoice creation, webhook handling, retry actions, and runtime env configuration are removed.
- Implement Nova Post shipment creation/tracking adapters. Nova Post now uses API v.1.0 with JWT authorization; Ukrposhta is disabled in the active carrier registry and is not wired into production factory selection.
- Add worker jobs for shipment creation, tracking sync, and auto-completion. Completed locally with pg-boss queue adapter and in-memory test queue.
- Add shipment audit events. Completed locally for worker enqueue/create/failure/sync/auto-complete events.
- Owner status/tag views moved to the owner order management milestone.

### Milestone 6 - Owner order management

Status: completed on 2026-04-30. Railway PostgreSQL verification passed after Railway authentication was refreshed.

- Implement owner order list and filters for status, delivery carrier, payment method, tag, date range, phone, and tracking number. Completed locally.
- Implement owner order details with products, customer, delivery, payment, shipment, status history, and audit events. Completed locally.
- Implement owner tags, tag assignment/removal, manual status updates with audit events, and failed shipment retry entry point. Completed locally.
- Add unit, UI, and Playwright e2e coverage for owner order management and Ukrainian labels. Completed locally.

### Milestone 7 - Deployment readiness

Status: completed on 2026-04-30; live Railway configuration and migration verification passed after Railway authentication was refreshed.

- Configure Railway web, worker, and postgres services. Completed in Railway project `dase`.
- Configure GitHub autodeploy from protected `main`. Completed for `web` and `worker` on repository `psht13/dase`.
- Add deployment documentation. Completed in `DEPLOYMENT.md`.
- Run full required checks and Railway migration verification. Local checks passed during the release candidate milestone; Railway migration/database verification passed after authentication was refreshed.

### Milestone 8 - Dase brand UI refinement

Status: completed on 2026-04-30.

- Refined shared visual tokens to match the Dase logo direction with ivory, blush, black, and restrained gold accents.
- Added a reusable Dase wordmark treatment for owner and customer-facing surfaces while keeping user-facing copy Ukrainian.
- Reworked the owner dashboard shell so the sidebar is flush with the viewport edge and sticky on desktop.
- Refined owner dashboard headings, cards, product image controls, public order review, and delivery form surfaces.
- Enlarged the product image delete action to a 48 px touch target with a larger icon.
- Added focused regression tests for the dashboard shell alignment and product image delete control.
- Verified the visual fixes in Chromium with screenshots under ignored `output/playwright/` artifacts.

### Milestone 9 - Responsive order/payment UI refactor

Status: completed on 2026-05-08 with final Prompt 09 QA.

- Owner dashboard shell uses compact mobile/tablet navigation and preserves the desktop sidebar only for wide layouts.
- Product and order lists use card-first mobile layouts with readable compact desktop tables for wide screens.
- Product create/edit, owner order builder, and public delivery/payment flows use stepper/card patterns without moving business logic into UI components.
- `src/shared/ui/multi-step-form.tsx` provides the shared RHF/Zod stepper, focus, validation, progress, and Back/Next primitives used by the long forms.
- Owner order details use mobile-friendly sections and a balanced desktop primary/sidebar layout.
- Action buttons use stable 44 px touch targets where practical, full-width mobile placement where appropriate, and consistent desktop alignment.
- All new user-facing copy remains Ukrainian, roles remain limited to `owner` and `user`, product images remain external URLs only, and no object storage was added.
- Focused unit tests, full Playwright E2E, MCP inspection, and the final viewport matrix cover the changed pages.

## Commit message format

Use English imperative sentence case without prefixes.

Examples:
- `Add project specification`
- `Create product catalog schema`
- `Add order confirmation form`
- `Fix shipment status mapping`

Do not use Conventional Commits prefixes like `feat:`, `fix:`, `docs:`, or `chore:`.

## Open questions

- Production `web` and `worker` no longer keep deprecated owner-managed shipping variables after ENV-05 cleanup.
- Production shipping label creation is currently disabled through `SHIPPING_LABEL_CREATION_MODE=disabled`; enable `live` only after saving complete owner Nova Post settings and planning a deliberate production shipping cutover.
- Future Ukrposhta reintroduction requires practical test/production API access, sender/client/address workflow confirmation, shipment/package details, payer settings, label decisions, and enabling the carrier through the central registry.
- Whether to reserve stock when order link is created or only after customer confirms.
- Cash on delivery now enqueues shipment creation after customer confirmation.
- Whether image uploads are needed later or external URLs are enough.

## Known limitations

- Authenticated production smoke testing requires temporary local `E2E_PROD_EMAIL` and `E2E_PROD_PASSWORD` values. They were not present during Prompt 09 final QA, so only unauthenticated production health was verified live on 2026-05-08.
- Production external API credentials and Nova Post sender settings are not present in the repository. Nova Post API keys must be saved as encrypted owner settings; `APP_ENCRYPTION_KEY` is configured in Railway but its value is never stored in tracked files.
- Automated tests use MSW, fixtures, and in-memory adapters for external integrations; live Nova Post behavior still needs a low-risk production smoke test after owner settings are configured.
- Product images are external image URLs only. Binary uploads and object storage are intentionally out of scope for this release candidate.
- Stock reservation timing is still an open product decision.

## Manual production verification checklist

After external production variables are configured:

1. Confirm Railway services `web`, `worker`, and `postgres` exist; do not create object storage.
2. Confirm `DATABASE_URL` is provided to `web` and `worker` through Railway secure variables or references.
3. Run `pnpm db:migrate` against a safe Railway development/staging PostgreSQL database before production promotion.
4. Verify `/api/health` returns a healthy no-store response on the deployed web URL.
5. Before the first owner exists, open `/setup`, enter `OWNER_SETUP_TOKEN` in the Ukrainian setup-token field, and create the owner; after that confirm `/setup` shows the Ukrainian unavailable state. Do not put `OWNER_SETUP_TOKEN` in the URL.
6. Sign in as an `owner` at `/login` and confirm `/dashboard` loads; confirm `/logout` ends the session and a `user` role cannot access dashboard routes.
7. Create a product using external image URLs only, then create an order link and open the `/o/[token]` public page.
8. Confirm an invalid, expired, or cancelled public token shows the Ukrainian unavailable state and does not reveal other order data.
9. Complete a customer delivery confirmation with Nova Post lookup and `Оплата картою онлайн`; confirm the public status page shows `Очікуємо оплату`, active requisites, and the Instagram receipt instruction.
10. Confirm Ukrposhta is not shown in the public customer delivery form unless it is deliberately re-enabled later.
11. From owner order details, mark the manual card transfer received and confirm payment status becomes paid, `MANUAL_PAYMENT_MARKED_PAID` appears in audit history, and shipment preparation is queued only after this owner action.
12. Confirm the owner Nova Post settings save with only a masked API-key preview, then confirm the worker creates shipments, syncs tracking, and auto-completes delivered orders according to `AUTO_COMPLETE_AFTER_DELIVERED_HOURS`.
13. Confirm owner order filters, tags, status updates, audit history, manual payment confirmation, and shipment retry work with Ukrainian labels in production.
