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

Status: owner authentication, product catalog, owner order builder, public order review, customer delivery confirmation, MonoPay / Monobank payment flow, and shipment worker automation implemented locally

Repository audit on 2026-04-30:
- Next.js App Router, TypeScript strict mode, pnpm, Tailwind CSS, and shadcn/ui-compatible configuration are scaffolded.
- ESLint, Vitest coverage, Testing Library, MSW dependency, Playwright, Drizzle, Better Auth skeleton, and worker start script are configured.
- `/api/health` returns a no-store JSON health response.
- Environment validation is implemented in `src/shared/config/env.ts`.
- Starter UI copy is Ukrainian and covered by unit and E2E tests.
- Initial Drizzle migrations create users, products, product images, orders, order items, customers, payments, shipments, order tags, audit events, webhook events, and carrier directory cache tables.
- Roles are restricted to `owner` and `user`; the default user role is `user`.
- Domain tests cover order total calculation, quantity validation, order status transitions, product snapshots in order items, role rejection for `admin`, image URL validation, and public order token generation.
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
- The form collects full name, phone, delivery carrier, city/locality, branch/warehouse/post office, and payment method.
- React Hook Form and Zod validate the delivery form; server actions re-validate submitted data before calling application use cases.
- Customer confirmation is implemented through `confirmPublicOrderUseCase`, repository ports, and infrastructure adapters rather than business logic in React components.
- Valid confirmation creates a `customers` row, stores a pending `payments` row, stores a pending `shipments` row with internal carrier DTO data, links the order to the customer, sets `confirmed_at`, and changes order status to `CONFIRMED_BY_CUSTOMER`.
- `ShippingCarrier` application port defines `searchCities`, `searchWarehouses`, `createShipment`, and `getShipmentStatus`.
- Nova Poshta and Ukrposhta infrastructure adapters map external API shapes into internal city, warehouse, shipment, and status DTOs.
- `/api/carriers/cities` and `/api/carriers/warehouses` are thin route handlers that call cached carrier search use cases and return internal DTOs only.
- City and warehouse lookups use `carrier_directory_cache`; Playwright and test runs use deterministic in-memory mocked carrier data and never call live carrier APIs.
- MSW contract tests cover Nova Poshta and Ukrposhta adapter response mapping, status mapping, and carrier error handling.
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

## Core flows

### Product management

1. Owner logs in.
2. Owner opens dashboard catalog.
3. Owner creates product with name, SKU, description, price, stock quantity, and image URLs.
4. Product becomes available for order creation.

### Owner order creation

1. Owner selects products and quantities.
2. App calculates total.
3. Owner creates order draft.
4. App creates secure public token.
5. Owner sends public link to customer.

### Customer confirmation

1. Customer opens public order link.
2. Customer reviews product list and totals.
3. Customer fills full name and phone.
4. Customer chooses delivery carrier:
   - Nova Poshta
   - Ukrposhta
5. Customer selects city and branch/office from official carrier data.
6. Customer chooses payment:
   - MonoPay
   - cash on delivery
7. Customer submits form.
8. App saves confirmation data, sets the order to `CONFIRMED_BY_CUSTOMER`, and prepares pending payment/shipment records.

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

Latest local quality status on 2026-04-30 after the shipment worker milestone:
- `pnpm lint` passed.
- `pnpm typecheck` passed.
- `pnpm test:coverage` passed with 92.24% statements, 80.67% branches, 94.81% functions, and 92.24% lines across the configured coverage scope.
- `pnpm test:e2e` passed with Chromium, including seeded owner product creation, user-role dashboard denial, owner order link creation, public order review, customer delivery confirmation with mocked carriers, and mocked MonoPay success webhook flow.
- `pnpm build` passed.
- `pnpm db:generate` passed and created `drizzle/0003_kind_deathstrike.sql`.

## Commands

Configured commands:

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm test:coverage
pnpm test:e2e
pnpm build
pnpm db:generate
pnpm db:migrate
pnpm worker:start
```

Current command status:
- `package.json`, `pnpm-lock.yaml`, and `pnpm-workspace.yaml` are present.
- `pnpm db:generate` was verified and generated Drizzle migrations through `drizzle/0003_kind_deathstrike.sql`.
- `pnpm db:migrate` requires a secure `DATABASE_URL`; Railway verification is blocked by Railway authentication and no local `DATABASE_URL`/`DATABASE_URL_TEST` is set in this shell.
- `pnpm worker:start` requires a secure `DATABASE_URL` before the worker can connect to PostgreSQL and start pg-boss shipment jobs.
- Required local checks are available through pnpm scripts.

## Environment variables

```txt
DATABASE_URL=
DATABASE_URL_TEST=

BETTER_AUTH_SECRET=
BETTER_AUTH_URL=

MONOBANK_TOKEN=
MONOBANK_API_URL=
MONOBANK_PUBLIC_KEY=
MONOBANK_WEBHOOK_SECRET_OR_PUBLIC_KEY=

NOVA_POSHTA_API_KEY=
NOVA_POSHTA_API_URL=

UKRPOSHTA_BEARER_TOKEN=
UKRPOSHTA_COUNTERPARTY_TOKEN=
UKRPOSHTA_API_URL=

AUTO_COMPLETE_AFTER_DELIVERED_HOURS=24

PLAYWRIGHT_E2E=
USE_MOCK_SHIPPING_CARRIERS=
```

No S3/storage bucket env vars are required for the initial version.

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
- No Railway project could be connected or created from this session.
- PostgreSQL could not be provisioned from this session.
- `DATABASE_URL` could not be retrieved or configured.
- Railway DB connectivity and migration verification are blocked until Railway authentication is refreshed outside the repository.
- Migrations were generated locally with Drizzle, but not applied to Railway.

Fallback until Railway access is restored:
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
- No Railway deployment is configured in the repository yet.

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

Status: completed locally on 2026-04-30; Railway migration verification is blocked by invalid Railway authentication.

- Add Drizzle PostgreSQL setup and migrations.
- Model users, products, product images, orders, order items, customers, payments, shipments, tags, audit events, webhook events, and carrier cache.
- Add domain/application tests for product and order invariants.
- Verify migrations against Railway PostgreSQL when credentials are available, otherwise a local disposable database.

### Milestone 3 - Owner catalog and order draft flow

Status: completed locally on 2026-04-30; Railway migration verification remains blocked by invalid Railway authentication.

- Implement owner authentication and dashboard access for `owner` role only.
- Implement product catalog CRUD with external image URLs.
- Implement order draft creation from selected products and quantities.
- Generate secure public order tokens.

### Milestone 4 - Public customer confirmation

Status: completed locally on 2026-04-30; Railway migration verification remains blocked by invalid Railway authentication.

- Implement public order page.
- Add Ukrainian delivery and payment form validation.
- Integrate carrier directory adapters through ports with mocked tests.
- Persist customer confirmation data.
- Cache city and warehouse directory lookups.
- Add Playwright e2e for customer confirmation with mocked carriers.

### Milestone 5 - Payments, shipments, and worker

Status: payment module and shipment worker automation completed locally on 2026-04-30. Railway migration/database/job queue verification remains blocked by invalid Railway authentication.

- Implement MonoPay invoice creation and webhook handling. Completed locally with mocked/contract-tested Monobank adapters.
- Implement Nova Poshta and Ukrposhta shipment creation/tracking adapters. Completed locally with mocked/contract-tested carrier adapters.
- Add worker jobs for shipment creation, tracking sync, and auto-completion. Completed locally with pg-boss queue adapter and in-memory test queue.
- Add shipment audit events. Completed locally for worker enqueue/create/failure/sync/auto-complete events.
- Owner status/tag views remain pending.

### Milestone 6 - Deployment readiness

- Configure Railway web, worker, and postgres services.
- Configure GitHub autodeploy from protected `main`.
- Add deployment documentation.
- Run full required checks and Railway migration verification.

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
- Exact Nova Poshta sender/counterparty settings.
- Exact Ukrposhta sender/client/address setup.
- Whether to reserve stock when order link is created or only after customer confirms.
- Cash on delivery now enqueues shipment creation after customer confirmation.
- Whether image uploads are needed later or external URLs are enough.
