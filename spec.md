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

Status: owner authentication and product catalog implemented locally

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
8. App saves confirmation data.

### Payment

For MonoPay:

1. App creates payment invoice.
2. Customer is redirected to payment.
3. Monobank sends webhook.
4. App verifies signature.
5. App stores event idempotently.
6. App updates payment and order status.

For cash on delivery:

1. App skips online payment.
2. App moves order to shipment creation.

### Shipment

1. App creates shipment job.
2. Worker calls selected carrier API.
3. App stores tracking number and label/reference.
4. Worker periodically syncs shipment status.
5. App auto-completes order when delivered according to configured rules.

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

Money values are stored in integer minor units. The historical product price column is `products.price_cents`; new order and payment amount columns use `_minor` naming.

Order item product snapshots are stored in:
- `product_name_snapshot`
- `product_sku_snapshot`
- `unit_price_minor`

Public order links use a random URL-safe `orders.public_token` with a unique database constraint.

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

Latest local quality status on 2026-04-30:
- `pnpm lint` passed.
- `pnpm typecheck` passed.
- `pnpm test:coverage` passed with 96.23% statements, 81.2% branches, 97.11% functions, and 96.23% lines across the configured coverage scope.
- `pnpm test:e2e` passed with Chromium, including seeded owner product creation and user-role dashboard denial.
- `pnpm build` passed.
- `pnpm db:generate` passed and created `drizzle/0002_romantic_sway.sql`.

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
- `pnpm db:generate` was verified and generated `drizzle/0000_spotty_golden_guardian.sql` and `drizzle/0001_secret_the_fallen.sql`.
- `pnpm db:migrate` requires a secure `DATABASE_URL`; Railway verification is blocked by Railway authentication and no local `DATABASE_URL`/`DATABASE_URL_TEST` is set in this shell.
- `pnpm worker:start` requires a secure `DATABASE_URL` before the worker can connect to PostgreSQL.
- Required local checks are available through pnpm scripts.

## Environment variables

```txt
DATABASE_URL=
DATABASE_URL_TEST=

BETTER_AUTH_SECRET=
BETTER_AUTH_URL=

MONOBANK_TOKEN=
MONOBANK_PUBLIC_KEY=
MONOBANK_WEBHOOK_SECRET_OR_PUBLIC_KEY=

NOVA_POSHTA_API_KEY=
NOVA_POSHTA_API_URL=

UKRPOSHTA_BEARER_TOKEN=
UKRPOSHTA_COUNTERPARTY_TOKEN=
UKRPOSHTA_API_URL=

AUTO_COMPLETE_AFTER_DELIVERED_HOURS=24

PLAYWRIGHT_E2E=
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

Status: owner authentication and catalog management completed locally on 2026-04-30; order draft creation remains pending.

- Implement owner authentication and dashboard access for `owner` role only.
- Implement product catalog CRUD with external image URLs.
- Implement order draft creation from selected products and quantities.
- Generate secure public order tokens.

### Milestone 4 - Public customer confirmation

- Implement public order page.
- Add Ukrainian delivery and payment form validation.
- Integrate carrier directory adapters through ports with mocked tests.
- Persist customer confirmation data.

### Milestone 5 - Payments, shipments, and worker

- Implement MonoPay invoice creation and webhook handling.
- Implement Nova Poshta and Ukrposhta shipment creation/tracking adapters.
- Add worker jobs for shipment creation, tracking sync, and auto-completion.
- Add audit events and owner status/tag views.

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

- Exact MonoPay contract and production credentials.
- Exact Nova Poshta sender/counterparty settings.
- Exact Ukrposhta sender/client/address setup.
- Whether to reserve stock when order link is created or only after customer confirms.
- Whether cash on delivery should always create shipment immediately.
- Whether image uploads are needed later or external URLs are enough.
