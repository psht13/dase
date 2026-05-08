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

Status: owner authentication, first-owner setup hardening, product catalog, multi-step owner order builder, public order review, post-confirmation public status page, customer delivery confirmation, MonoPay / Monobank payment flow and retry, shipment worker automation, owner order management, UI polish, dashboard filter/action feedback polish, final responsive QA, Railway project/service deployment, Railway PostgreSQL provisioning, GitHub autodeploy configuration, runtime-aware environment validation, release-candidate hardening, and final production-readiness audit implemented

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

MonoPay / Monobank payment update on 2026-04-30:
- `PaymentProvider` application port defines `createInvoice`, `getInvoiceStatus`, and `verifyWebhook`.
- Monobank infrastructure provider creates invoices through the acquiring API shape, reads invoice status, verifies webhook `X-Sign` signatures with the configured public key, and sanitizes webhook payloads so card data is not stored.
- Customer confirmation now creates a MonoPay invoice when payment method is `MONOBANK`, stores the provider invoice id, moves the order to `PAYMENT_PENDING`, and returns a payment redirect URL.
- Cash on delivery skips online invoice creation and keeps the existing confirmation/shipment preparation path.
- `/api/webhooks/monobank` accepts raw signed webhook bodies, verifies the signature, stores webhook events idempotently, ignores stale events by comparing Monobank `modifiedDate`, and safely updates payment/order statuses.
- Payment status copy shown to customers is Ukrainian: pending confirmation, successful MonoPay payment, and failed MonoPay payment states are covered by tests.
- MSW contract tests cover Monobank invoice creation/status mapping and webhook signature verification without calling live Monobank APIs.
- Playwright e2e covers customer MonoPay confirmation, mocked invoice redirect, mocked successful webhook, and Ukrainian paid status copy.

Shipment worker update on 2026-04-30:
- `pg-boss` is the selected Postgres-backed job queue; `pnpm worker:start` starts the shipment worker entrypoint.
- Worker jobs are registered for `create-shipment`, `sync-shipment-status`, and `auto-complete-delivered-order`.
- Confirmed cash-on-delivery orders enqueue `create-shipment` after the customer confirmation use case stores customer, payment, and shipment rows.
- Successful MonoPay webhooks mark payment as paid, move the order into shipment preparation, and enqueue `create-shipment`.
- `create-shipment` calls the selected `ShippingCarrier`, stores tracking number, carrier document id, and label URL/reference, marks the shipment created, moves the order to `SHIPMENT_CREATED`, and schedules status sync.
- Shipment creation failures mark the shipment `FAILED`, append a Ukrainian audit payload, and rethrow so pg-boss retry behavior can apply.
- `sync-shipment-status` calls carrier tracking, maps carrier status into internal shipment/order statuses, schedules another sync for active shipments, and schedules auto-completion for delivered shipments.
- `auto-complete-delivered-order` moves delivered orders to `COMPLETED` after `AUTO_COMPLETE_AFTER_DELIVERED_HOURS`.
- Owner retry action `retryShipmentCreationAction` re-enqueues failed shipment creation and returns Ukrainian dashboard-facing messages.
- Dashboard/status helper labels for shipment statuses and worker job names are Ukrainian and covered by tests.
- Public payment status copy remains payment-aware: MonoPay paid orders continue to show Ukrainian paid copy after moving into shipment statuses, while cash-on-delivery shipment statuses do not show MonoPay copy.
- Tests cover job enqueueing, shipment creation success and failure, tracking status mapping, auto-completion rules, retry action copy, pg-boss retry options, and Ukrainian shipment status/job labels.

Owner order management update on 2026-04-30:
- `/dashboard/orders` lists owner orders with Ukrainian labels and filters for status, delivery carrier, payment method, tag, date range, and customer phone or tracking number search.
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
- User-facing UI copy was audited and remains Ukrainian, with brand names such as Dase and MonoPay kept as proper names.
- Product image handling remains external URL only through `product_images`; no object storage service or upload path was added.
- Worker error logging now formats errors through a safe logger that redacts credentialed URLs and sensitive environment assignments before printing.
- Environment documentation now includes every app/tooling variable read by the repository, including `PLAYWRIGHT_BASE_URL`, `NODE_ENV`, and `CI`.
- External API adapters remain covered by MSW contract tests and fixture adapters; CI does not call live Monobank or Nova Post APIs.
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
- MonoPay invoice creation now supports retry when a confirmed order has a MonoPay payment without `providerInvoiceId`, or when a previous MonoPay payment failed.
- Public order review and owner order details expose the Ukrainian `Повторити оплату` action when MonoPay retry is available.
- Tests cover first owner setup, setup blocked after an owner exists, form-based setup-token handling, Ukrainian login labels, owner dashboard access, user dashboard denial, real setup/login persistence, transaction wiring, MonoPay retry eligibility, and public/owner retry UI.

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
- External production credentials for Monobank and Nova Post still require manual configuration in Railway before live payment/shipping verification. Future carriers must be documented and enabled through the carrier registry before production use.

Nova Post API replacement update on 2026-05-07:
- Removed the legacy Nova Poshta JSON adapter and replaced it with `NovaPostShippingCarrier` plus `NovaPostJwtProvider`.
- The adapter uses official Nova Post API v.1.0 endpoints: production `https://api.novapost.com/v.1.0/`, stage/test `https://api-stage.novapost.pl/v.1.0/`, authorization `GET /clients/authorization?apiKey=...`, directory lookup through `GET /divisions`, shipment creation through `POST /shipments`, tracking through `GET /shipments/tracking/history`, and label references through `GET /shipments/print`.
- `NOVA_POST_API_KEY` is exchanged server-side for a JWT token; the JWT is cached for less than one hour and refreshed before expiration. API keys and JWTs are not logged or included in safe application errors.
- Nova Post v.1.0 requests send the generated JWT as the raw `Authorization` header value. Nova Post rejects a `Bearer `-prefixed JWT for directory requests.
- Public carrier directory route handlers still return internal DTOs only and map provider failures to safe Ukrainian messages.
- Shipment creation validates required sender config before calling Nova Post. Missing sender country, sender division, sender name, or sender phone fails safely, stores a Ukrainian audit reason, and leaves the owner retry path available.
- New preferred env names are `NOVA_POST_API_KEY`, `NOVA_POST_API_URL`, and optional `NOVA_POST_AUTH_URL`; `NOVA_POSHTA_API_KEY` and `NOVA_POSHTA_API_URL` are temporarily accepted as deprecated compatibility names.
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

Runtime-aware environment validation update on 2026-05-07:
- `src/shared/config/env.ts` now exposes `getWebEnv()`, `getWorkerEnv()`, and `getTestEnv()` alongside a documented safe `getServerEnv()` base parser for shared infrastructure.
- Production `web` validation requires `DATABASE_URL`, `BETTER_AUTH_SECRET`, and `BETTER_AUTH_URL`. It requires `OWNER_SETUP_TOKEN` only when the first-owner setup path is enabled and does not force worker-only settings.
- Production `worker` validation requires `DATABASE_URL` and an explicit `AUTO_COMPLETE_AFTER_DELIVERED_HOURS`; it does not require `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`, or `OWNER_SETUP_TOKEN`.
- `SHIPPING_LABEL_CREATION_MODE=live` continues to require complete Nova Post live shipment settings, `mock` remains rejected in production, and disabled production shipping mode does not require Nova Post credentials.
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
- Order cards show short order id, status badge, customer name/phone, total, date, delivery, payment, key tags, and the details action without horizontal table scrolling.
- The desktop order table now groups date under the order id, phone under the customer, delivery/payment under status, and tags under the amount column while preserving existing filters and owner-only access.
- Product/order reads still go through existing application use cases and repositories; no business logic, filters, roles, database schema, object storage, or external API behavior changed.
- Component tests cover the compact desktop hierarchy and mobile card rendering for both lists. Playwright coverage checks `/dashboard/products` and `/dashboard/orders` at desktop and 390 px, plus no page-level horizontal overflow at phone widths.

Owner order details layout update on 2026-05-08:
- `/dashboard/orders/[orderId]` now uses clear Ukrainian sections: `Огляд`, `Товари`, `Клієнт`, `Доставка`, `Оплата`, `Теги`, `Історія статусів`, and `Аудит`.
- The mobile layout uses open collapsible section cards instead of wide product and audit tables. Products render as item cards, status history renders as compact event cards, and audit events render as a compact readable list.
- Desktop widths use a two-column layout at wide breakpoints: products, status history, and audit stay in the main column, while overview, customer, delivery, payment, and tags stay in the side column.
- Existing server actions and application use cases are unchanged. MonoPay retry, shipment retry, manual status update, and tag assignment/removal remain available through the same owner actions.
- Delivery and shipment details are grouped under `Доставка`; payment details and MonoPay retry are grouped under `Оплата`.
- Focused component tests cover the Ukrainian section headings, collapsible stacked sections, MonoPay retry eligibility, shipment retry availability, manual status update submission, and compact audit visibility.
- Playwright E2E covers the owner order details page at 390 px and checks the same page at 360 px for no horizontal overflow.

Dashboard filter, empty-state, and feedback polish update on 2026-05-08:
- `/dashboard/orders` filters now render as a responsive Ukrainian panel with a mobile-collapsed default, active-filter summary chips, accessible controls, and a clear-filters action. The same URL-backed GET parameters and application filtering behavior are unchanged.
- Empty states now distinguish no orders from no filtered results and include useful Ukrainian next actions. Product catalog and order-builder empty states also point owners to create or enable products without changing product or order business rules.
- `/dashboard/orders/[orderId]` now has clearer Ukrainian empty states for no items, no tags, no status history, no audit events, and missing payment/shipment records.
- Tag updates, manual status updates, MonoPay retry, and shipment retry now share live-region feedback for pending, successful, and failed action states where applicable.
- Component tests cover mobile filter panel behavior, active summaries, clear filters, Ukrainian empty states, and action feedback messages. Playwright E2E now exercises the owner order filter panel and active-summary behavior after filtering.

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

## Order, payment, and responsive UI audit on 2026-05-08

Audit scope: public order pages under `/o/[token]`, the customer delivery/payment form, owner product form, owner order builder, owner orders list, owner order details, dashboard shell, payment modules, Monobank provider/webhook code, shipping enqueue/job flow, and migrations through `drizzle/0003_kind_deathstrike.sql`.

Current active behavior:
- Public order lookup distinguishes unavailable links, review state, and post-confirmation status state. `/o/[token]` renders the delivery CTA only while the order is `SENT_TO_CUSTOMER`; confirmed, payment, shipment, completed, returned, and failed-payment states render a Ukrainian status page.
- `/o/[token]/delivery` renders the delivery form only for `SENT_TO_CUSTOMER`. After confirmation it renders the same public status state, so customers cannot resubmit delivery data or create duplicate customer, payment, or shipment rows through the UI. The submit use case still rejects duplicate confirmation because it only accepts `SENT_TO_CUSTOMER`.
- The public status page shows a stable customer-facing display number using the first 8 characters of the order UUID, for example `#55e143f7`; it does not expose the full internal UUID. It also shows Ukrainian status labels, processing/payment guidance, seller-chat instruction, selected products, and total.
- Customer contact data currently collects and persists only full name and phone. `customers.email` exists but the public form does not use it. There is no Instagram nickname field in `DeliveryFormValues`, `ConfirmPublicOrderInput`, `CustomerRecord`, or `customers`.
- Customer payment defaults to `MONOBANK`. The active payment choices are MonoPay and `Післяплата`; choosing MonoPay creates a Monobank invoice in `confirmDeliveryAction`, redirects to the provider page, and keeps public/owner retry actions active.
- Payment method values are persisted in `payments.provider`, backed by the PostgreSQL enum `payment_provider` and TypeScript `PaymentProviderCode`. Current values are `MONOBANK` and `CASH_ON_DELIVERY`; `provider_invoice_id` and `provider_modified_at` are Monobank-specific but nullable.
- MonoPay is still active in customer UI, public and owner retry UI, payment use cases, webhook route, tests, `.env.example`, `DEPLOYMENT.md`, and production verification checklists through `MONOBANK_*` variables and `/api/webhooks/monobank`.
- Owner order search is URL-backed through `/dashboard/orders?search=...`. `matchesSearch(...)` currently matches customer phone digits and shipment tracking numbers only. Owner list/detail headings display `shortOrderId(order.id)`, but search does not match full UUIDs or short IDs.
- Shipping enqueueing treats cash on delivery as shipment-ready immediately after confirmation, while MonoPay orders wait for a paid webhook before shipment creation. Manual card transfer must not accidentally enqueue shipment before the owner confirms payment.
- Owner dashboard settings do not exist yet. There is no owner UI or table for public payment card/requisite records.

Planned functional changes:
- Replace the active customer MonoPay choice with `Оплата картою онлайн`. This should be a manual card transfer flow: after customer confirmation, show owner-configured visible card/requisite records and tell the customer in Ukrainian to send the receipt in the Instagram chat.
- Keep Monobank adapter, webhook, and historical payment records readable for existing data, but remove MonoPay from the active customer flow and default form value. MonoPay retry should stop appearing for new manual-card customer flows.
- Add Instagram nickname to the public contact step, server validation, confirmation use case input, customer persistence, owner order list/detail read models, and UI tests with Ukrainian labels.
- Extend the new public status page with owner-configured manual-card requisites once the manual-card payment provider and owner settings are implemented.
- Add owner order search matching for full order UUID and the displayed short order ID in `matchesSearch(...)`; update the filter placeholder from `Телефон або ТТН` to include order number.
- Add owner payment settings under the dashboard, with Ukrainian labels for creating, editing, ordering, enabling, and disabling visible card/requisite records.

Migration plan:
- Add a new payment provider enum value such as `MANUAL_CARD_TRANSFER` to `payment_provider`; update `src/shared/db/schema.ts`, `PaymentProviderCode`, validation, fixtures, labels, filters, tests, and Drizzle migration metadata.
- Add nullable `instagram_username` to `customers`. Backfill is not needed for existing customers; owner UI should show `Не вказано` when absent.
- Add an owner-scoped payment requisites table, for example `owner_payment_requisites`, with `owner_id`, Ukrainian display title, recipient name, card/account/requisite text, optional note, `is_active`, `sort_order`, and timestamps. Store only the owner-entered public requisites needed for the buyer-visible manual transfer flow; do not add object storage or receipt uploads.
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
- Successful cash-on-delivery confirmation returns the customer to `/o/[token]`. MonoPay confirmation still redirects to the existing provider URL and returns to the same public status page.
- Tests cover display-number formatting, public lookup review/status/unavailable states, duplicate-confirmation rejection without extra customer/payment/shipment writes, Ukrainian status UI copy, delivery-page status rendering, and the Playwright revisit contract.

Risks:
- PostgreSQL enum migrations must be forward-compatible and tested against Railway PostgreSQL before production promotion.
- Removing MonoPay from the active customer flow while keeping historical Monobank webhooks/read models requires clear filtering so existing orders still render safely.
- Manual card transfer introduces a payment-confirmation gap: shipment creation should wait for an explicit owner payment action or a clearly allowed manual status transition that also updates payment state.
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

Audit scope: `AGENTS.md`, this specification, `DEPLOYMENT.md`, ADR 0001, `README.md`, package/env configuration, Railway MCP service status, auth/setup/login/logout flow, owner dashboard access, Nova Post shipping integration, disabled Ukrposhta handling, MonoPay retry/webhook handling, migrations, transactional customer confirmation, CI/e2e setup, and user-facing UI copy.

Audit result:
- Auth remains protected against redirect loops: unauthenticated dashboard access redirects to `/login`, authenticated `owner` sessions persist across dashboard navigation, reload, browser history, and logout, and authenticated `user` sessions are denied dashboard access.
- `/setup` remains available only before the first `owner` exists. Production setup tokens are submitted through the Ukrainian setup form and are not accepted from URLs.
- The home CTA is a real link and the Playwright home test now clicks it, verifying navigation into `/setup` or `/login`.
- Nova Post is the only active customer-facing carrier. Ukrposhta remains disabled historical data only; carrier lookup APIs, delivery validation, shipment enqueueing, retry, create-shipment jobs, tracking sync, and production carrier factory wiring avoid disabled carriers.
- No live Ukrposhta production adapter is wired, and no legacy Nova Poshta `v2.0/json` production adapter remains.
- `SHIPPING_LABEL_CREATION_MODE` prevents accidental live labels: production defaults to `disabled`, production rejects `mock`, and `live` requires complete Nova Post API, sender, payer, and parcel settings before a provider call can be made.
- Nova Post API keys and JWTs are not logged. Provider errors expose safe messages and tests assert credential logging is avoided.
- MonoPay retry remains available for confirmed orders missing a provider invoice id and for failed MonoPay payments. Webhook processing verifies signatures, stores events idempotently, ignores stale provider modified dates, and stores sanitized payloads without card data.
- Database migrations are forward-only schema/data migrations with no production destructive scripts. Customer confirmation writes use `CustomerConfirmationUnitOfWork` and Drizzle transactions when PostgreSQL is configured.
- User-facing application copy remains Ukrainian, with product/brand names such as Dase, MonoPay, Monobank, and Nova Post kept as proper names.
- Public pages are covered by mobile Playwright checks with no horizontal overflow, and dashboard navigation remains covered by owner e2e flows.
- `README.md`, `.env.example`, this specification, `DEPLOYMENT.md`, Railway config files, and CI workflow are aligned with the current web, worker, postgres, env var, no-object-storage, and mocked-external-API requirements.
- CI and local tests use MSW, fixtures, or in-memory adapters for Monobank and Nova Post; live external APIs are not called in automated tests.

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
- Railway production variables were verified without exposing secret values. The `web` service has `NOVA_POST_API_KEY` and `NOVA_POST_API_URL` configured for the Nova Post stage endpoint. `SHIPPING_LABEL_CREATION_MODE`, Nova Post sender, payer, and parcel defaults are not configured on `web`.
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
- The payment step uses two explicit Ukrainian radio-card options: MonoPay with an online redirect explanation and `Післяплата` with a payment-on-receipt explanation.
- The review step shows separate contact, delivery, and payment summaries before `confirmDeliveryAction` submits and returns the status page URL.
- Final submit is guarded against accidental double submit. MonoPay still redirects when the existing action returns `paymentRedirectUrl`; cash on delivery now navigates back to `/o/[token]` to show the public status page.
- Focused UI tests cover step navigation, contact validation, city/warehouse selection, payment selection, final review, MonoPay redirect wiring, cash-on-delivery status navigation, and Ukrainian labels. Playwright customer delivery E2E now follows the step flow, checks mobile overflow during the public delivery path, revisits the public link, and verifies the delivery form is no longer shown after confirmation.

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
   - MonoPay
   - cash on delivery
7. Customer opens `Перевірка`, reviews contact, delivery, and payment summaries, and submits the form.
8. App saves confirmation data, sets the order to `CONFIRMED_BY_CUSTOMER`, and prepares pending payment/shipment records.
9. Customer lands on the public status page for the same token. Reopening `/o/[token]` or `/o/[token]/delivery` shows the status summary instead of the delivery form.

### Payment

For MonoPay:

1. App creates payment invoice after customer confirmation.
2. App stores the provider invoice id and marks the order `PAYMENT_PENDING`.
3. Customer is redirected to payment.
4. Monobank sends webhook.
5. App verifies signature.
6. App stores event idempotently.
7. App ignores stale events by provider `modifiedDate`.
8. App updates payment and order status.
9. If the confirmed order has no provider invoice id or the previous MonoPay payment failed, the customer or owner can use `Повторити оплату` to create a new invoice and move the payment/order back to pending.

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

The MonoPay payment milestone also required no new migration because the foundation schema already included:
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
- `pnpm test:e2e` passed with Chromium, including the updated keyboard, mobile public customer, product creation, order builder, delivery/payment, MonoPay, and owner order management checks.
- `pnpm build` passed.

Latest local quality status on 2026-04-30 after the Railway deployment readiness milestone:
- `pnpm lint` passed.
- `pnpm typecheck` passed.
- `pnpm test:coverage` passed with 90.84% statements, 80.15% branches, 93% functions, and 90.84% lines across the configured coverage scope.
- `pnpm test:e2e` passed with Chromium, including health, Ukrainian home UI, owner product/order flows, mocked customer delivery, mocked MonoPay, owner order management, and owner-role access checks.
- `pnpm build` passed.
- Railway live deployment, PostgreSQL provisioning, GitHub autodeploy configuration, secure variable configuration, web health check verification, worker runtime verification, and Railway migration/database verification passed after Railway authentication was refreshed.

Latest local quality status on 2026-04-30 after the release candidate hardening milestone:
- `pnpm lint` passed.
- `pnpm typecheck` passed.
- `pnpm test:coverage` passed with 90.88% statements, 80.17% branches, 93.06% functions, and 90.88% lines across the configured coverage scope.
- `pnpm test:e2e` passed with Chromium: 8 tests covering health, Ukrainian home UI, owner product/order flows, mocked customer delivery, mocked MonoPay, owner order management, and `user` role dashboard denial.
- `pnpm build` passed.
- Railway live deployment, PostgreSQL provisioning, GitHub autodeploy configuration, secure variable configuration, web health check verification, worker runtime verification, and Railway migration/database verification passed after Railway authentication was refreshed.

Latest local quality status on 2026-04-30 after the Railway live setup retry:
- `pnpm lint` passed.
- `pnpm typecheck` passed.
- `pnpm test:coverage` passed with 90.88% statements, 80.18% branches, 93.06% functions, and 90.88% lines across the configured coverage scope.
- `pnpm test:e2e` passed with Chromium: 8 tests covering health, Ukrainian home UI, owner product/order flows, mocked customer delivery, mocked MonoPay, owner order management, and `user` role dashboard denial. The first run was blocked by local sandbox port binding permissions and passed after rerunning with elevated local server permission.
- `pnpm build` passed.
- Railway MCP/CLI live verification passed for project creation, service creation, PostgreSQL provisioning, GitHub autodeploy, secure variable configuration, web health, worker startup, and read-only database connectivity/schema verification.

Latest local quality status on 2026-04-30 after production owner access and payment/shipment safety:
- `pnpm lint` passed.
- `pnpm typecheck` passed.
- `pnpm test:coverage` passed with 87.24% statements, 80.35% branches, 91.5% functions, and 87.24% lines across the configured coverage scope.
- `pnpm test:e2e` passed with Chromium: 10 tests covering health, Ukrainian home UI, Ukrainian login UI, owner dashboard access, `user` dashboard denial, owner product/order flows, mocked customer delivery, mocked MonoPay, and owner order management.
- `pnpm build` passed.
- Railway CLI verification passed for adding `OWNER_SETUP_TOKEN` securely with deploy triggering skipped; current validation requires it only for the production `web` first-owner setup path.

Latest local quality status on 2026-05-07 after owner setup and login persistence repair:
- `pnpm lint` passed.
- `pnpm typecheck` passed.
- `pnpm test:coverage` passed with 88.38% statements, 80.39% branches, 90.57% functions, and 88.38% lines across the configured coverage scope.
- `pnpm test:e2e` passed with Chromium: 11 tests covering health, Ukrainian home/login UI, owner and `user` dashboard access behavior, owner product/order flows, mocked customer delivery, mocked MonoPay, owner order management, and the real `/setup` plus `/login` persistence path across dashboard navigation, hard reload, browser back/forward, and logout.
- `pnpm build` passed.

Latest local quality status on 2026-05-07 after Nova Post API replacement:
- `pnpm lint` passed.
- `pnpm typecheck` passed.
- `pnpm test:coverage` passed with 88.53% statements, 80.04% branches, 90.84% functions, and 88.53% lines across the configured coverage scope.
- `pnpm test:e2e` passed with Chromium: 11 tests covering health, Ukrainian home/login UI, owner and `user` dashboard access behavior, owner product/order flows, mocked customer delivery with Nova Post as the only public carrier, mocked MonoPay, owner order management, and real setup/login persistence.
- `pnpm build` passed.

Latest local quality status on 2026-05-07 after Ukrposhta active-MVP removal:
- `pnpm lint` passed.
- `pnpm typecheck` passed.
- `pnpm test:coverage` passed with 88.48% statements, 80.29% branches, 90.64% functions, and 88.48% lines across the configured coverage scope.
- `pnpm test:e2e` passed with Chromium: 11 tests covering health, Ukrainian home/login UI, owner and `user` dashboard access behavior, owner product/order flows, mocked customer delivery with Nova Post as the only public carrier and no Ukrposhta option, mocked MonoPay, owner order management, and real setup/login persistence.
- `pnpm build` passed.

Latest local quality status on 2026-05-07 after runtime-aware environment validation:
- `pnpm lint` passed.
- `pnpm typecheck` passed.
- `pnpm test:coverage` passed with 88.51% statements, 80.01% branches, 90.68% functions, and 88.51% lines across the configured coverage scope.
- `pnpm test:e2e` passed with Chromium: 11 tests covering health, Ukrainian home/login UI, owner and `user` dashboard access behavior, owner product/order flows, mocked customer delivery with Nova Post as the only public carrier and no Ukrposhta option, mocked MonoPay, owner order management, and real setup/login persistence.
- `pnpm build` passed.

Latest local quality status on 2026-05-07 after final production-readiness audit:
- `pnpm lint` passed.
- `pnpm typecheck` passed.
- `pnpm test:coverage` passed with 88.51% statements, 80.01% branches, 90.68% functions, and 88.51% lines across the configured coverage scope.
- `pnpm test:e2e` passed with Chromium: 11 tests covering health, clickable Ukrainian home CTA navigation, Ukrainian login UI, owner and `user` dashboard access behavior, owner product/order flows, mocked customer delivery with Nova Post as the only public carrier and no Ukrposhta option, mocked MonoPay, owner order management, and real setup/login/logout persistence.
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
pnpm worker:start
```

Current command status:
- `package.json`, `pnpm-lock.yaml`, and `pnpm-workspace.yaml` are present.
- `pnpm start` runs `next start` for Railway web deployments.
- `pnpm db:generate` was verified and generated Drizzle migrations through `drizzle/0003_kind_deathstrike.sql`.
- `pnpm db:migrate` requires a secure `DATABASE_URL`; Railway web deployments run it as the pre-deploy command against Railway PostgreSQL.
- `pnpm worker:start` requires a secure `DATABASE_URL` and explicit `AUTO_COMPLETE_AFTER_DELIVERED_HOURS` in production; the Railway worker service starts successfully with the Railway PostgreSQL reference configured.
- `pnpm test:e2e:prod` is an opt-in production auth smoke wrapper for `RUN_PROD_SMOKE=1`, `PLAYWRIGHT_BASE_URL=https://web-production-26609.up.railway.app`, and temporary local `E2E_PROD_EMAIL` / `E2E_PROD_PASSWORD` credentials.
- Required local checks are available through pnpm scripts.

## Environment variables

```txt
DATABASE_URL=
DATABASE_URL_TEST=

BETTER_AUTH_SECRET= # production web
BETTER_AUTH_URL= # production web
OWNER_SETUP_TOKEN= # production web setup path only while first-owner setup is available

MONOBANK_TOKEN=
MONOBANK_API_URL=
MONOBANK_PUBLIC_KEY=
MONOBANK_WEBHOOK_SECRET_OR_PUBLIC_KEY=

SHIPPING_LABEL_CREATION_MODE=mock

NOVA_POST_API_KEY=
NOVA_POST_API_URL=https://api.novapost.com/v.1.0/
NOVA_POST_AUTH_URL=
NOVA_POST_SENDER_COUNTRY_CODE=UA
NOVA_POST_SENDER_DIVISION_ID=
NOVA_POST_SENDER_NAME=
NOVA_POST_SENDER_PHONE=
NOVA_POST_SENDER_EMAIL=
NOVA_POST_SENDER_COMPANY_TIN=
NOVA_POST_SENDER_COMPANY_NAME=
NOVA_POST_PAYER_TYPE=Recipient
NOVA_POST_PAYER_CONTRACT_NUMBER=
NOVA_POST_DEFAULT_WIDTH_MM=200
NOVA_POST_DEFAULT_LENGTH_MM=300
NOVA_POST_DEFAULT_HEIGHT_MM=100
NOVA_POST_DEFAULT_ACTUAL_WEIGHT_GRAMS=500
NOVA_POST_DEFAULT_VOLUMETRIC_WEIGHT_GRAMS=500

NOVA_POSHTA_API_KEY= # deprecated compatibility name
NOVA_POSHTA_API_URL= # deprecated compatibility name

AUTO_COMPLETE_AFTER_DELIVERED_HOURS=24 # production worker

NODE_ENV=development
CI=

PLAYWRIGHT_E2E=
PLAYWRIGHT_BASE_URL=http://127.0.0.1:3000
USE_MOCK_SHIPPING_CARRIERS=

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

Status: payment module and shipment worker automation completed on 2026-04-30. Railway migration/database verification and worker startup verification passed after Railway authentication was refreshed.

- Implement MonoPay invoice creation and webhook handling. Completed locally with mocked/contract-tested Monobank adapters.
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

### Milestone 9 - Mobile owner UI refactor

Status: in progress; audit and refactor plan documented, dashboard shell baseline implemented, reusable multi-step form foundation added, and product create/edit, owner order builder, and public delivery forms converted to stepper flows on 2026-05-08.

- Refactor the owner dashboard shell so phone and tablet portrait layouts use compact mobile navigation instead of the full stacked/persistent sidebar.
- Replace mobile product/order/order-builder tables with card-first layouts while keeping desktop tables for wide screens.
- Convert long product, order-builder, and public delivery flows to stepper/card patterns without moving business logic into UI components. Product create/edit, owner order builder, and public delivery are completed.
- Use `src/shared/ui/multi-step-form.tsx` for future long-form conversions so RHF/Zod validation, focus behavior, progress, and Back/Next controls stay consistent. Product create/edit and public delivery now use this foundation; owner order builder uses the shared stepper UI primitives.
- Improve owner order details by converting mobile product/audit tables into cards or timelines and reducing the single-page visual weight.
- Raise touch targets to at least 44 px for mobile controls and action buttons.
- Keep all new user-facing copy Ukrainian, keep roles limited to `owner` and `user`, keep product images as external URLs only, and avoid database schema changes unless a later UI requirement proves one is necessary.
- Add focused UI and Playwright coverage for the changed pages using the documented viewport matrix. Product create/edit, owner order builder, and public delivery now have focused unit and Playwright mobile regressions.

## Commit message format

Use English imperative sentence case without prefixes.

Examples:
- `Add project specification`
- `Create product catalog schema`
- `Add order confirmation form`
- `Fix shipment status mapping`

Do not use Conventional Commits prefixes like `feat:`, `fix:`, `docs:`, or `chore:`.

## Open questions

- Production MonoPay credentials, public key, and final callback domain.
- Nova Post stage directory lookup variables are present on the production `web` service, but live shipment values must still be supplied to the production `worker` before live shipment smoke tests: API key and URL, sender division id, sender name/phone, optional company fields, payer settings, and parcel dimension/weight defaults. Missing required sender config now blocks shipment creation before a live provider call.
- Production shipping label creation remains disabled by default through `SHIPPING_LABEL_CREATION_MODE=disabled`; switch to `live` only after Nova Post sender, payer, and parcel settings are configured securely.
- Future Ukrposhta reintroduction requires practical test/production API access, sender/client/address workflow confirmation, shipment/package details, payer settings, label decisions, and enabling the carrier through the central registry.
- Whether to reserve stock when order link is created or only after customer confirms.
- Cash on delivery now enqueues shipment creation after customer confirmation.
- Whether image uploads are needed later or external URLs are enough.

## Known limitations

- Owner dashboard mobile responsiveness is partially implemented. The shared multi-step foundation now exists and product create/edit, owner order builder, and public delivery forms use stepper/card patterns, but product/order tables still depend on horizontal scroll on small screens and long owner order details surfaces still need to be converted to cards or timelines.
- Real Monobank production credentials are not yet configured in Railway, so live payment smoke tests remain manual. Nova Post stage directory lookup is configured on `web`, but Nova Post label creation stays disabled until `SHIPPING_LABEL_CREATION_MODE=live` is explicitly configured on `worker` with complete API, sender, payer, and parcel settings.
- Production external API credentials and Nova Post sender settings are not present in the repository and must be configured only as Railway variables.
- Automated tests use MSW, fixtures, and in-memory adapters for external integrations; live Monobank and Nova Post behavior still needs a low-risk production smoke test after variables are configured.
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
9. Complete a customer delivery confirmation with Nova Post lookup and shipment creation on a low-risk test order.
10. Confirm Ukrposhta is not shown in the public customer delivery form unless it is deliberately re-enabled later.
11. Create a MonoPay invoice, complete payment, verify signed Monobank webhook processing, duplicate webhook idempotency, and stale event handling.
12. Confirm `Повторити оплату` creates a new MonoPay invoice when a confirmed order is missing a provider invoice id or the previous payment failed.
13. Confirm the worker creates shipments, syncs tracking, and auto-completes delivered orders according to `AUTO_COMPLETE_AFTER_DELIVERED_HOURS`.
14. Confirm owner order filters, tags, status updates, audit history, payment retry, and shipment retry work with Ukrainian labels in production.
