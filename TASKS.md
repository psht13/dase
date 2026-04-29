# Codex prompts - Jewelry order confirmation app v2

Цей файл містить оновлений набір промптів для Codex, щоб побудувати комерційний веб-застосунок для продажу прикрас через кастомні order links.

## Що змінилось у v2

- Немає ролі `admin`.
- Дозволені тільки ролі `owner` та `user`.
- Dashboard належить власнику, тому в коді й маршрутах краще використовувати `owner` / `dashboard`, а не `admin`.
- Увесь користувацький контент у UI має бути українською мовою.
- Codex має одразу підняти PostgreSQL на Railway через Railway MCP і використовувати цю БД для перевірки міграцій та роботи repository/use case шарів.
- S3 / R2 / Railway Storage Bucket не створювати на старті.
- Для зображень товарів на старті використовувати URL-и у таблиці `product_images`. Завантаження файлів залишити як майбутнє рішення.
- Назви комітів мають бути англійською в imperative sentence case, без Conventional Commits префіксів. Приклад: `Add class selection logic`.

## Як використовувати

1. Почни з **PROMPT 00**.
2. Після кожного успішного коміту переходь до наступного промпта.
3. Якщо тести, лінтер, typecheck або build падають, не переходь далі. Використай **PROMPT 12 - recovery prompt**.
4. Вручну створювати `AGENTS.md`, `spec.md` або архітектурні файли не потрібно. **PROMPT 00** змушує Codex створити або оновити їх самостійно.
5. Усі наступні промпти теж містять правило: якщо `AGENTS.md`, `spec.md` або ADR-файл відсутні, Codex має їх відновити перед роботою.

## Які документаційні файли потрібні

Мінімально достатньо:

- `AGENTS.md` - постійні інструкції для Codex та інших агентів.
- `spec.md` - жива специфікація продукту, статус реалізації, env vars, команди, відкриті питання.
- `docs/adr/0001-architecture.md` - коротке архітектурне рішення. Не обовʼязково для запуску, але корисно для стабільної роботи Codex у нових сесіях.

Пізніше окремо створюється:

- `DEPLOYMENT.md` - на етапі Railway deployment.

---

================================================================================
PROMPT 00 - repository audit, Railway PostgreSQL, AGENTS.md, spec.md, architecture ADR
================================================================================

````text
You are working in an existing GitHub repository.

Project goal:
Build a small commercial order-confirmation web app for jewelry sellers.

Important product correction:
There must be no `admin` role. The only allowed auth roles are:
- `owner` - authenticated seller/owner who can access the dashboard and manage products/orders.
- `user` - regular user/customer role. Public customers usually do not need to log in to confirm an order link, but if the auth system needs a default role, it must be `user`.

Do not create `admin`, `manager`, `staff`, or similar roles.
Do not call the dashboard an admin dashboard in user-facing UI. Use owner/dashboard wording instead.

Language rule:
All user-facing UI content must be in Ukrainian:
- page titles
- buttons
- labels
- placeholders
- validation messages
- loading states
- empty states
- error states
- confirmation messages
- order/payment/delivery status labels shown to users

Code identifiers, file names, tests, and commit messages can be in English.

The app should support:
- Owner dashboard.
- Product catalog management.
- Adding products with price, SKU, description, stock, and image URLs.
- Selecting multiple products and quantities to create an order.
- Creating a public order confirmation link.
- Customer opens the link, reviews products, and confirms the order.
- Customer fills delivery data: full name, phone, carrier, city/locality, branch/warehouse/post office.
- Delivery carriers: Nova Poshta and Ukrposhta.
- Carrier location data must come from official APIs through app adapters.
- Payment methods: MonoPay / Monobank acquiring or cash on delivery.
- After confirmation, data must be saved in PostgreSQL.
- The app should create the corresponding shipping document/label for Nova Poshta or Ukrposhta.
- Owner can view orders, tags, statuses, payments, shipments, and audit history.
- Owner can apply tags like completed, returned, needs attention, etc.
- Where possible, orders should automatically become completed after successful parcel delivery.

Existing context:
- The project already has a GitHub repository.
- Playwright MCP is available for UI inspection and testing.
- Railway MCP is available for deployment and PostgreSQL setup.
- Target deployment is Railway with automatic deploy from the GitHub repository.

Your task in this prompt:
1. Inspect the repository structure, package manager, framework, test setup, CI files, deployment files, and existing code.
2. Do not assume the repository is empty. Adapt to what exists.
3. Use Railway MCP immediately to create or connect a Railway project and provision a PostgreSQL service for development/staging verification.
4. Retrieve the Railway PostgreSQL connection string securely and configure it through environment variables only. Never commit secrets.
5. Use the Railway PostgreSQL database to verify DB connectivity and future migrations. Do not run destructive tests against a production database.
6. If Railway MCP or Railway credentials are unavailable, document the blocker in `spec.md` and continue with a local/mock database setup only as a fallback.
7. If `AGENTS.md` does not exist, create it using the content below. If it exists, update it carefully while preserving useful existing instructions.
8. If `spec.md` does not exist, create it using the content below. If it exists, update it carefully while preserving useful existing information.
9. If `docs/adr/0001-architecture.md` does not exist, create it using the content below.
10. Add a concise implementation plan split into milestones.
11. Do not implement product features yet, except minimal scaffolding only if the repository is empty and cannot run checks at all.
12. Run existing checks if available.
13. Commit the documentation, Railway PostgreSQL setup notes, and audit result.

Commit message rule:
Use English imperative sentence case without Conventional Commits prefixes.
Examples:
- `Add project specification`
- `Create architecture decision record`
- `Update Railway database setup notes`
Do not use messages like `docs: add spec` or `feat: add product catalog`.

Important:
- Never commit secrets.
- Do not skip repository inspection.
- Do not ask the user to manually create `AGENTS.md`, `spec.md`, or architecture files. Create or update them yourself.
- Keep changes small and focused.
- Do not create S3, R2, or Railway Storage Bucket at this stage.
- Product images should initially be stored as external image URLs in the database.

Create or update `AGENTS.md` with this content, adapted only where the existing repository requires it:

~~~md
# AGENTS.md

## Project

This repository contains a commercial order-confirmation web app for jewelry sellers.

The app has:
- Owner dashboard.
- Product catalog management.
- Product selection and quantity-based order building.
- Owner-created public order links.
- Public customer confirmation page.
- Delivery form with Nova Poshta and Ukrposhta integrations.
- MonoPay / Monobank acquiring integration.
- Shipment creation and tracking.
- Order tags, statuses, and audit history.
- Railway deployment with GitHub-based deploy flow.

## Roles

Only these roles are allowed:

- `owner` - authenticated seller/owner with dashboard access.
- `user` - regular user/customer role.

Forbidden roles:

- `admin`
- `manager`
- `staff`
- any other dashboard role unless the user explicitly requests it later.

If existing code contains `admin`, migrate it to `owner` or remove it.

## Language and UI content

All user-facing content must be Ukrainian:

- page titles
- navigation labels
- buttons
- form labels
- placeholders
- validation messages
- loading states
- empty states
- error states
- success messages
- status labels
- public customer-facing copy

Code identifiers, file names, tests, and commit messages can be English.

Tests for UI flows should assert important Ukrainian labels to prevent accidental English UI copy.

## Non-negotiable rules

1. Always read `spec.md` and this `AGENTS.md` before making changes.
2. If `spec.md` is missing, recreate it from the latest known project specification before implementing features.
3. Keep architecture clean and feature-oriented.
4. Do not put business logic directly inside React components, Next.js route handlers, or server actions.
5. Domain layer must not import Next.js, React, Drizzle, external API clients, or UI code.
6. Application layer coordinates use cases and depends on ports/interfaces.
7. Infrastructure layer implements repositories, payment providers, shipping carriers, storage, and external API adapters.
8. UI layer uses use cases through safe server actions or API handlers.
9. Every feature must include tests.
10. Minimum coverage is 80% for lines, statements, branches, and functions.
11. Do not mark work as complete until required checks pass.
12. Update `spec.md` after each completed milestone.
13. Make small meaningful commits after each green milestone.
14. Commit messages must be English imperative sentence case, for example `Add product catalog form`.
15. Do not use Conventional Commits prefixes such as `feat:`, `fix:`, `docs:`, or `chore:`.
16. Never commit secrets.
17. Do not weaken tests or reduce coverage thresholds to make checks pass.
18. Do not call live external APIs in CI. Use MSW, fixtures, mocks, or test adapters.
19. If blocked by missing credentials, implement mocked/contract-tested adapters and document the missing credential and manual verification step in `spec.md`.
20. Do not create S3/R2/Railway Storage Bucket unless the user explicitly asks later.
21. For product images, initially store validated external image URLs in `product_images`.
22. Do not store uploaded image files on ephemeral service storage.

## Railway PostgreSQL rule

Railway MCP is available and should be used early.

Required behavior:

1. Create or connect a Railway project.
2. Provision PostgreSQL on Railway for development/staging verification.
3. Store `DATABASE_URL` only in secure environment variables.
4. Use Railway PostgreSQL to verify DB connectivity and migrations.
5. Do not commit `.env` files containing secrets.
6. Do not run destructive tests against a production database.
7. If Railway MCP is unavailable, document the blocker in `spec.md` and continue with local/test DB as a fallback.

## Required final checks

Run before claiming completion:

```bash
pnpm lint
pnpm typecheck
pnpm test:coverage
pnpm test:e2e
pnpm build
```

If the repository uses another package manager, adapt commands consistently and document them in `spec.md`.

If a check fails:
1. Fix the issue.
2. Run the check again.
3. Do not claim completion until it passes or a real external blocker is documented.

## Preferred stack

Use the existing stack if the repository already has a clear one. Otherwise use:

- Next.js App Router
- TypeScript strict mode
- pnpm
- Tailwind CSS
- shadcn/ui-compatible components
- Drizzle ORM
- PostgreSQL
- Better Auth
- Vitest
- Testing Library
- MSW
- Playwright
- pg-boss or another Postgres-backed job queue for workers
- Railway for PostgreSQL and deployment

## Architecture

Use feature-oriented onion architecture:

```txt
src/
  app/
    (owner)/
      dashboard/
    o/
      [token]/
    api/
      webhooks/
      health/
  modules/
    catalog/
      domain/
      application/
      infrastructure/
      ui/
    orders/
      domain/
      application/
      infrastructure/
      ui/
    payments/
      domain/
      application/
      infrastructure/
    shipping/
      domain/
      application/
      infrastructure/
    users/
      domain/
      application/
      infrastructure/
  shared/
    db/
    config/
    errors/
    logger/
    ui/
    utils/
  worker/
    jobs/
```

Do not use `(admin)` route groups unless existing framework constraints make it unavoidable. Prefer `(owner)` or `(dashboard)`.

## Layer rules

### Domain

Allowed:
- Entities
- Value objects
- Domain services
- Domain errors
- Pure functions
- Type definitions

Forbidden:
- React
- Next.js
- Drizzle
- Database clients
- HTTP clients
- External API SDKs
- Environment variables

### Application

Allowed:
- Use cases
- Ports/interfaces
- DTOs
- Transaction boundaries through interfaces
- Calling repositories and providers through ports

Forbidden:
- React components
- Direct external API calls
- Raw database queries unless behind a repository interface

### Infrastructure

Allowed:
- Drizzle repositories
- Better Auth adapter setup
- Monobank provider implementation
- Nova Poshta provider implementation
- Ukrposhta provider implementation
- Job queue implementation
- Environment-specific adapters

### UI

Allowed:
- React components
- Forms
- Tables
- Server actions or route calls
- Ukrainian user-facing copy

Forbidden:
- Business rules that belong in domain/application
- Direct external carrier/payment calls
- Direct SQL queries

## Image handling

Initial image strategy:

- Do not create object storage.
- Do not implement binary image uploads unless explicitly requested later.
- Store image URLs in `product_images`.
- Validate image URLs.
- Allow multiple image URLs per product.
- Keep an `ImageStoragePort` only if useful for future extension, but the initial implementation should be an external URL strategy.

Future possible strategies, not for initial implementation:

- Railway Volume for small persistent uploads.
- Railway Storage Bucket or another S3-compatible bucket for scalable object storage.

## Testing strategy

- Unit test domain logic.
- Integration test application use cases.
- Use MSW for Monobank, Nova Poshta, and Ukrposhta API mocks.
- Use Playwright for end-to-end flows.
- Use Playwright MCP to inspect and verify UI behavior where useful.
- Keep tests deterministic.
- Do not rely on real external APIs in CI.
- UI tests should verify important Ukrainian copy.

## Commit behavior

Commit often, but only after relevant checks pass.

Commit message format:

- English
- imperative
- sentence case
- no Conventional Commits prefix
- no trailing period

Good examples:
- `Add project specification`
- `Create product catalog schema`
- `Add order confirmation flow`
- `Fix payment webhook idempotency`
- `Update Railway deployment notes`

Bad examples:
- `feat: add product catalog`
- `docs: update spec`
- `WIP`
- `fixed stuff`

## External integrations

### Monobank / MonoPay

- Verify webhook signatures.
- Store webhook events idempotently.
- Use provider modified date to avoid applying stale events.
- Never store card data.

### Nova Poshta

- Implement through `ShippingCarrier` port.
- Support city search, warehouse search, shipment creation, and tracking.

### Ukrposhta

- Implement through `ShippingCarrier` port.
- Support address/client/shipment workflow.
- Filter unavailable post offices where the API indicates they are inactive.

## Railway

Expected services:
- `web`
- `worker`
- `postgres`

Do not create object storage services by default.
Use GitHub autodeploy from protected `main` when deployment is configured.

## Documentation

Keep `spec.md` updated with:
- implemented features;
- open decisions;
- env vars;
- commands;
- test coverage status;
- Railway PostgreSQL setup status;
- deployment notes;
- external API assumptions.
~~~

Create or update `spec.md` with this content, adapted to the existing repository:

~~~md
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

Status: initial planning

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

To be implemented with Drizzle migrations.

Main entities:
- users
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

## Quality requirements

- TypeScript strict mode.
- 80%+ test coverage for lines, statements, branches, and functions.
- Clean architecture.
- No business logic in UI components.
- No direct external API calls from domain/application tests.
- CI must run lint, typecheck, coverage, e2e, and build.
- UI must be Ukrainian.
- No `admin` role.

## Commands

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
```

No S3/storage bucket env vars are required for the initial version.

## Railway PostgreSQL

Railway MCP should be used immediately to provision PostgreSQL.

Expected result:
- Railway project exists or is connected.
- PostgreSQL service exists.
- `DATABASE_URL` is configured securely.
- Migrations can run against Railway PostgreSQL.
- Repository/use case integration checks can use the configured test/development database safely.

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
~~~

Create `docs/adr/0001-architecture.md` if missing:

~~~md
# ADR 0001 - Feature-oriented onion architecture

## Status

Accepted

## Context

The app needs owner dashboard features, public customer order confirmation, payment integration, shipping integrations, background jobs, and testable business logic.

The app should remain understandable for future Codex sessions and future developers.

## Decision

Use feature-oriented onion architecture.

Each business module should be organized as:

```txt
module/
  domain/
  application/
  infrastructure/
  ui/
```

Domain contains pure business rules.
Application contains use cases and ports.
Infrastructure contains database and external API adapters.
UI contains React/Next.js components and route-level integration.

## Consequences

Benefits:
- Business logic is testable without Next.js or external APIs.
- External services can be mocked through ports.
- UI remains simpler.
- Future agents can work module-by-module.

Tradeoffs:
- More files than a simple CRUD app.
- Requires discipline to keep boundaries clean.

## Rules

- No domain imports from infrastructure or UI.
- No direct external API calls in UI.
- No direct database calls in UI.
- Route handlers and server actions should be thin.
- User-facing UI copy must be Ukrainian.
- Only `owner` and `user` roles are allowed.
~~~
````
---

================================================================================
PROMPT 01 - foundation, tooling, CI, Railway database verification
================================================================================

````text
Read `AGENTS.md`, `spec.md`, and `docs/adr/0001-architecture.md` first.

If any of those files are missing, recreate them according to the project specification before continuing.

Important constraints:
- Roles are only `owner` and `user`.
- Do not create an `admin` role.
- User-facing UI content must be Ukrainian.
- Product images are image URLs only for now.
- Do not create S3/R2/Railway Storage Bucket.
- Commit messages must look like `Add class selection logic`, not `feat: add class selection logic`.

Implement the project foundation.

Target stack:
- Next.js App Router
- TypeScript strict mode
- pnpm
- Tailwind CSS
- shadcn/ui compatible setup
- Drizzle ORM
- PostgreSQL
- Better Auth skeleton
- Vitest
- Testing Library
- MSW
- Playwright
- ESLint
- coverage threshold of 80% for lines, statements, branches, and functions

Railway PostgreSQL requirement:
1. Use Railway MCP to ensure a Railway PostgreSQL service exists.
2. Configure `DATABASE_URL` securely for development/staging verification.
3. Add `DATABASE_URL_TEST` if the project needs a separate test database/schema.
4. Verify the app can connect to Railway PostgreSQL.
5. Do not commit secrets.
6. Document Railway PostgreSQL status in `spec.md`.
7. If Railway MCP is unavailable, document the blocker and use local/test DB fallback only until MCP is available.

Tasks:
1. Add or fix project scripts:
   - lint
   - typecheck
   - test
   - test:coverage
   - test:e2e
   - build
   - db:generate
   - db:migrate
   - worker:start
2. Configure Vitest coverage thresholds at 80%.
3. Configure Playwright with trace on retry.
4. Add GitHub Actions workflow that runs:
   - pnpm install
   - pnpm lint
   - pnpm typecheck
   - pnpm test:coverage
   - pnpm test:e2e
   - pnpm build
5. Add `/api/health` route.
6. Add environment validation module.
7. Add initial test examples for env validation and health route.
8. Ensure any starter UI text is Ukrainian.
9. Update `spec.md` with commands, Railway PostgreSQL status, and current status.
10. Run all available checks.
11. Commit after checks pass.

Required checks before final response:
```bash
pnpm lint
pnpm typecheck
pnpm test:coverage
pnpm test:e2e
pnpm build
```

Use a commit message like:
`Add project foundation`

Do not mark this complete until all checks pass or until a real blocker is documented in `spec.md`.
````
---

================================================================================
PROMPT 02 - database schema, roles cleanup, and domain model
================================================================================

````text
Read `AGENTS.md`, `spec.md`, and `docs/adr/0001-architecture.md` first.

Important constraints:
- Allowed roles: `owner`, `user`.
- Forbidden role: `admin`.
- If existing code, schema, tests, or seed files contain `admin`, migrate it to `owner` or remove it.
- User-facing UI content must be Ukrainian.
- Product images are image URLs only.
- Use Railway PostgreSQL for migration verification through secure env vars.
- Do not commit secrets.

Implement the initial database schema and domain model.

Entities:
- users
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

Requirements:
1. Use Drizzle schema and migrations.
2. Run migrations against the configured Railway PostgreSQL development/staging database.
3. Use a safe test database/schema for automated tests. Do not destructively reset production data.
4. User role enum must only contain `owner` and `user`.
5. Use minor units for money.
6. Store product snapshots in order items:
   - product name
   - SKU
   - unit price
7. Use a random public token for public order links.
8. Define order status enum:
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
9. Add product image URL fields/table. Do not add object storage or upload infrastructure.
10. Add domain tests for:
   - order total calculation
   - invalid quantity rejection
   - status transition rules
   - product snapshot behavior
   - role validation rejects `admin`
   - image URL validation
11. Add repository interfaces in application/domain boundaries.
12. Implement Drizzle repositories only in infrastructure.
13. Update `spec.md`.
14. Run required checks.
15. Commit after checks pass.

Required checks:
```bash
pnpm lint
pnpm typecheck
pnpm test:coverage
pnpm build
```

Use a commit message like:
`Create database schema`
````
---

================================================================================
PROMPT 03 - auth and owner product catalog
================================================================================

````text
Read `AGENTS.md`, `spec.md`, and `docs/adr/0001-architecture.md` first.

Important constraints:
- No `admin` role.
- Only `owner` and `user` roles.
- Dashboard access belongs to `owner`.
- Use `/dashboard` or an `(owner)` route group. Avoid `/admin` and `(admin)` unless existing routing makes a temporary migration unavoidable.
- All user-facing UI content must be Ukrainian.
- Product images are image URLs only.
- Do not create S3/R2/Railway Storage Bucket.
- Use Railway PostgreSQL for DB verification.

Implement owner authentication and product catalog management.

Requirements:
1. Add Better Auth with Drizzle adapter.
2. Add roles:
   - owner
   - user
3. Protect dashboard routes so only `owner` can access them.
4. Add owner dashboard shell.
5. Add product list page.
6. Add product creation form.
7. Add product edit form.
8. Add product active/inactive toggle.
9. Add basic image URL support:
   - one or more image URLs per product;
   - URL validation;
   - image preview if simple to implement;
   - no file upload;
   - no object storage.
10. Use React Hook Form and Zod for validation.
11. Keep UI components separated from use cases.
12. Ensure all visible UI text is Ukrainian.
13. Add tests:
   - product create use case
   - product update use case
   - product validation
   - protected owner dashboard access
   - user role cannot access dashboard
   - product form component behavior
   - important Ukrainian UI labels are present
14. Add a Playwright test for owner product creation using a seeded owner user.
15. Use Playwright MCP to inspect the product form and table if available.
16. Update `spec.md`.
17. Run all required checks.
18. Commit after checks pass.

Required checks:
```bash
pnpm lint
pnpm typecheck
pnpm test:coverage
pnpm test:e2e
pnpm build
```

Use a commit message like:
`Add owner product catalog`

Do not expose secrets.
Do not bypass auth in production code.
````
---

================================================================================
PROMPT 04 - owner order builder and public order link
================================================================================

````text
Read `AGENTS.md`, `spec.md`, and `docs/adr/0001-architecture.md` first.

Important constraints:
- No `admin` role or admin wording in UI.
- Owner creates order links.
- Public customer pages are accessible by secure token.
- All user-facing UI content must be Ukrainian.
- Product images are image URLs only.
- Use Railway PostgreSQL for DB verification.

Implement owner order builder and public order review link.

Owner flow:
1. Owner opens order builder.
2. Owner selects multiple active products.
3. Owner sets quantity for each product.
4. App calculates total.
5. Owner creates order draft.
6. App creates a secure public token.
7. Owner can copy the public order link.
8. Order status becomes SENT_TO_CUSTOMER.

Public customer flow:
1. Customer opens `/o/[token]`.
2. Customer sees selected products, image URLs/previews where available, quantities, prices, and total.
3. Customer cannot change products or quantities.
4. Customer can proceed to delivery/payment form.

Requirements:
1. Do not expose internal order id in public URL.
2. Expired/cancelled order links must show a safe unavailable page in Ukrainian.
3. Use product snapshots.
4. Add audit event for order creation.
5. Add tests:
   - create order draft use case
   - token generation
   - public order lookup
   - expired order behavior
   - owner order builder UI
   - public order review page
   - Ukrainian UI labels and messages
6. Add Playwright e2e:
   - owner creates product
   - owner creates order link
   - public link shows correct product list
7. Update `spec.md`.
8. Run all required checks.
9. Commit after checks pass.

Required checks:
```bash
pnpm lint
pnpm typecheck
pnpm test:coverage
pnpm test:e2e
pnpm build
```

Use a commit message like:
`Add owner order builder`
````
---

================================================================================
PROMPT 05 - delivery form and shipping carrier ports
================================================================================

````text
Read `AGENTS.md`, `spec.md`, and `docs/adr/0001-architecture.md` first.

Important constraints:
- No `admin` role.
- All user-facing UI content must be Ukrainian.
- Do not call live external carrier APIs in CI.
- Use MSW fixtures and adapter tests.
- Use Railway PostgreSQL for DB verification.

Implement customer delivery form and shipping carrier abstraction.

Requirements:
1. Create `ShippingCarrier` port with:
   - searchCities
   - searchWarehouses
   - createShipment
   - getShipmentStatus
2. Implement Nova Poshta adapter behind the port.
3. Implement Ukrposhta adapter behind the port.
4. Do not call live external APIs in CI.
5. Use MSW fixtures for tests.
6. Add cache for city/warehouse lookup results.
7. Customer form fields:
   - full name
   - phone
   - delivery carrier
   - city/locality
   - branch/warehouse/post office
   - payment method
8. Validate with Zod.
9. Store confirmed delivery data in the order.
10. Change status to CONFIRMED_BY_CUSTOMER after valid submit.
11. All form labels, placeholders, errors, loading states, and empty states must be Ukrainian.
12. Add tests:
   - delivery form validation
   - carrier search use cases
   - Nova Poshta adapter contract with MSW
   - Ukrposhta adapter contract with MSW
   - order confirmation use case
   - Ukrainian form labels and validation messages
13. Add Playwright e2e for customer confirmation with mocked carriers.
14. Update `spec.md`.
15. Run all required checks.
16. Commit after checks pass.

Required checks:
```bash
pnpm lint
pnpm typecheck
pnpm test:coverage
pnpm test:e2e
pnpm build
```

Important:
- Keep carrier-specific response formats out of the UI.
- Map external API data to internal DTOs.
- Document required env vars in `spec.md`.

Use a commit message like:
`Add customer delivery form`
````
---

================================================================================
PROMPT 06 - MonoPay / Monobank payment module
================================================================================

````text
Read `AGENTS.md`, `spec.md`, and `docs/adr/0001-architecture.md` first.

Important constraints:
- No `admin` role.
- All user-facing UI content must be Ukrainian.
- Do not call live Monobank API in CI.
- Use MSW fixtures and mocked webhook payloads.
- Use Railway PostgreSQL for DB verification.

Implement Monobank / MonoPay payment module.

Requirements:
1. Create `PaymentProvider` port with:
   - createInvoice
   - getInvoiceStatus
   - verifyWebhook
2. Implement Monobank provider.
3. Add payment creation after customer confirmation when payment method is `monobank`.
4. Store provider invoice id.
5. Add webhook route:
   - POST /api/webhooks/monobank
6. Verify webhook signature.
7. Store webhook events idempotently.
8. Handle unordered webhook events by comparing provider modified date.
9. Update payment and order status safely.
10. For cash on delivery, skip online invoice creation.
11. Ensure customer-facing payment statuses/messages are Ukrainian.
12. Add tests:
   - create invoice use case
   - webhook signature verification
   - idempotent webhook processing
   - stale webhook ignored
   - payment status transition
   - MSW Monobank API contract tests
   - Ukrainian payment messages
13. Add Playwright e2e with mocked payment success.
14. Update `spec.md`.
15. Run all required checks.
16. Commit after checks pass.

Required checks:
```bash
pnpm lint
pnpm typecheck
pnpm test:coverage
pnpm test:e2e
pnpm build
```

Use a commit message like:
`Add Monobank payment flow`

Do not store card data.
Do not log secrets or full sensitive webhook headers.
````
---

================================================================================
PROMPT 07 - shipment creation worker and status sync
================================================================================

````text
Read `AGENTS.md`, `spec.md`, and `docs/adr/0001-architecture.md` first.

Important constraints:
- No `admin` role.
- All user-facing UI content must be Ukrainian.
- Use Railway PostgreSQL for DB and job queue verification.
- Do not call live carrier APIs in CI.

Implement shipment creation and status sync worker.

Requirements:
1. Add pg-boss or the already selected Postgres-backed job queue.
2. Add worker entrypoint:
   - pnpm worker:start
3. Add jobs:
   - create-shipment
   - sync-shipment-status
   - auto-complete-delivered-order
4. When order is ready for shipment:
   - paid MonoPay order
   - or confirmed cash-on-delivery order
   enqueue create-shipment.
5. create-shipment job:
   - calls selected ShippingCarrier
   - stores tracking number
   - stores carrier document id
   - stores label URL or label reference
   - changes order status to SHIPMENT_CREATED
6. sync-shipment-status job:
   - calls selected carrier tracking API
   - maps external status to internal status
   - changes order status to IN_TRANSIT, DELIVERED, RETURNED, etc.
7. auto-complete job:
   - moves DELIVERED orders to COMPLETED after configured delay.
8. Add retry behavior.
9. Add manual retry action for failed shipment creation.
10. Ensure dashboard-facing job/status messages are Ukrainian.
11. Add tests:
   - job enqueueing
   - shipment creation success
   - shipment creation failure
   - tracking status mapping
   - auto-completion rule
   - Ukrainian status labels where displayed
12. Update `spec.md`.
13. Run all required checks.
14. Commit after checks pass.

Required checks:
```bash
pnpm lint
pnpm typecheck
pnpm test:coverage
pnpm test:e2e
pnpm build
```

Do not create shipments directly inside customer request handlers.
Use jobs to avoid slow or flaky checkout completion.

Use a commit message like:
`Add shipment worker`
````
---

================================================================================
PROMPT 08 - owner orders, tags, filters, audit log
================================================================================

````text
Read `AGENTS.md`, `spec.md`, and `docs/adr/0001-architecture.md` first.

Important constraints:
- No `admin` role or admin wording.
- Owner manages orders.
- All user-facing UI content must be Ukrainian.
- Use Railway PostgreSQL for DB verification.

Implement owner order management.

Requirements:
1. Add orders list page.
2. Add filters:
   - status
   - delivery carrier
   - payment method
   - tag
   - date range
   - search by customer phone or tracking number
3. Add order details page.
4. Show:
   - products
   - customer info
   - delivery info
   - payment info
   - shipment info
   - status history
   - audit events
5. Add tags:
   - create tag
   - assign tag
   - remove tag
6. Add manual status update with audit event.
7. Add manual retry shipment creation.
8. Ensure all labels, filters, table headings, empty states, errors, and status text are Ukrainian.
9. Add tests:
   - list orders use case
   - filters
   - tag assignment
   - audit event creation
   - manual status update rules
   - owner orders UI
   - Ukrainian UI labels
10. Add Playwright e2e for owner order management.
11. Update `spec.md`.
12. Run all required checks.
13. Commit after checks pass.

Required checks:
```bash
pnpm lint
pnpm typecheck
pnpm test:coverage
pnpm test:e2e
pnpm build
```

Use a commit message like:
`Add owner order management`
````
---

================================================================================
PROMPT 09 - UI polish, Ukrainian copy, accessibility, Playwright MCP verification
================================================================================

````text
Read `AGENTS.md`, `spec.md`, and `docs/adr/0001-architecture.md` first.

Important constraints:
- No `admin` role or admin wording.
- All user-facing UI content must be Ukrainian.
- Do not add object storage.
- Product images are image URLs only.

Polish and verify the UI.

Scope:
- Owner dashboard
- Product catalog
- Product form
- Order builder
- Public order review page
- Customer delivery/payment form
- Orders list
- Order details

Requirements:
1. Use accessible shadcn/Radix patterns.
2. Check keyboard navigation.
3. Check focus states.
4. Check loading states.
5. Check empty states.
6. Check error states.
7. Check mobile layout for public customer pages.
8. Replace any English user-facing copy with Ukrainian.
9. Replace any visible `admin` wording with owner/dashboard wording.
10. Use Playwright MCP to inspect critical flows:
   - product creation
   - order builder
   - public order confirmation
   - owner order details
11. Add or update Playwright tests where UI issues are found.
12. Add tests/assertions for Ukrainian labels on critical screens.
13. Use screenshots/traces only as test artifacts, not as committed noise unless intentionally needed.
14. Update `spec.md` with UI verification notes.
15. Run all required checks.
16. Commit after checks pass.

Required checks:
```bash
pnpm lint
pnpm typecheck
pnpm test:coverage
pnpm test:e2e
pnpm build
```

Use a commit message like:
`Polish Ukrainian user interface`
````
---

================================================================================
PROMPT 10 - Railway deployment
================================================================================

````text
Read `AGENTS.md`, `spec.md`, and `docs/adr/0001-architecture.md` first.

Important constraints:
- Use Railway MCP.
- No S3/R2/Railway Storage Bucket by default.
- Required Railway services: web, worker, postgres.
- User-facing UI content must remain Ukrainian.
- Commit messages must be English imperative sentence case.

Configure Railway deployment using Railway MCP.

Target deployment:
- web service
- worker service
- PostgreSQL database

Requirements:
1. Link the GitHub repository to Railway if not already linked.
2. Ensure Railway PostgreSQL service exists and `DATABASE_URL` is available to web and worker services.
3. Configure GitHub autodeploy from protected `main`.
4. Configure web service:
   - build command if needed
   - start command: pnpm start
   - pre-deploy command: pnpm db:migrate
5. Configure worker service:
   - start command: pnpm worker:start
6. Configure required env vars as placeholders or real values only through secure Railway variables.
7. Do not commit secrets.
8. Do not create object storage unless the user explicitly asks later.
9. Add `/api/health` check if missing.
10. Add `DEPLOYMENT.md` with:
   - Railway services
   - env vars
   - deployment flow
   - rollback notes
   - migration notes
   - manual external API verification checklist
   - note that image handling currently uses external image URLs only
11. Update `spec.md`.
12. Run all local required checks.
13. Commit deployment configuration docs and any safe config files.

Required checks:
```bash
pnpm lint
pnpm typecheck
pnpm test:coverage
pnpm test:e2e
pnpm build
```

Use a commit message like:
`Configure Railway deployment`

Do not claim live production integration is verified unless the Railway deployment and external credentials were actually tested.
````
---

================================================================================
PROMPT 11 - final hardening and release candidate
================================================================================

````text
Read `AGENTS.md`, `spec.md`, `docs/adr/0001-architecture.md`, and `DEPLOYMENT.md` if it exists.

Prepare a release candidate.

Hard constraints:
- No `admin` role anywhere in code, schema, seeds, tests, or UI.
- Only `owner` and `user` roles are allowed.
- All user-facing UI content must be Ukrainian.
- Product images are external image URLs only.
- No object storage service should exist unless explicitly requested later.
- Railway PostgreSQL should be configured and documented.
- Commit messages must be English imperative sentence case.

Tasks:
1. Review architecture boundaries.
2. Search for business logic inside UI components or route handlers and move it into use cases.
3. Search for `admin` and remove/migrate any remaining usage.
4. Search for English user-facing UI text and translate it to Ukrainian.
5. Search for secrets or unsafe logs.
6. Verify all env vars are documented.
7. Verify all external APIs have mocked tests.
8. Verify all public routes are safe.
9. Verify dashboard routes are protected for `owner` only.
10. Verify `user` role cannot access owner dashboard.
11. Verify public order token cannot expose other orders.
12. Verify coverage is at least 80%.
13. Verify Railway PostgreSQL migration flow is documented and tested.
14. Run:
    - pnpm lint
    - pnpm typecheck
    - pnpm test:coverage
    - pnpm test:e2e
    - pnpm build
15. Fix all failures.
16. Update `spec.md` with final status, known limitations, and manual production verification checklist.
17. Create a final commit.
18. Prepare a PR summary with:
    - implemented features
    - test evidence
    - coverage result
    - Railway deployment notes
    - remaining risks

Use a commit message like:
`Prepare release candidate`

Do not stop after partial checks.
Do not mark the release candidate complete unless all required checks pass.
````
---

================================================================================
PROMPT 12 - recovery prompt for failed checks or broken implementation
================================================================================

````text
Read `AGENTS.md`, `spec.md`, and `docs/adr/0001-architecture.md` first.

Use this prompt only when tests, lint, typecheck, e2e, build, migrations, Railway DB connection, or architecture checks fail.

Important constraints:
- Do not skip failing checks.
- Do not weaken tests.
- Do not reduce coverage thresholds.
- Do not remove useful tests just to pass.
- Do not create an `admin` role.
- Only `owner` and `user` roles are allowed.
- All user-facing UI content must be Ukrainian.
- Do not create object storage.
- Do not commit secrets.

Recovery tasks:
1. Identify the failing command and the exact failure.
2. Find the smallest correct fix.
3. Preserve architecture boundaries.
4. If the failure is caused by missing Railway MCP or missing external credentials, document the blocker in `spec.md` and keep mocked/local tests green.
5. If the failure is caused by DB migrations, verify the migration against the configured Railway PostgreSQL development/staging database or a safe test database.
6. If the failure is caused by UI tests, use Playwright MCP to inspect the page when useful.
7. If any English user-facing text appears in screenshots/tests, translate it to Ukrainian.
8. If any `admin` role or admin wording appears, replace it with `owner` or dashboard wording.
9. Re-run the failed command.
10. Then run the full required suite:

```bash
pnpm lint
pnpm typecheck
pnpm test:coverage
pnpm test:e2e
pnpm build
```

11. Update `spec.md` with any important fix or blocker.
12. Commit only after checks pass.

Use a commit message like:
`Fix test failures`

Final response must include:
- what failed;
- what was fixed;
- which commands now pass;
- whether any blocker remains.
````
---

================================================================================
Reusable instruction block - paste into any extra Codex task
================================================================================

````text
Before starting, read `AGENTS.md`, `spec.md`, and `docs/adr/0001-architecture.md`.

Non-negotiable project rules:
- Allowed roles are only `owner` and `user`.
- Do not create or use `admin`.
- Owner dashboard access is for `owner` only.
- All user-facing UI text must be Ukrainian.
- Product images are image URLs only for the initial version.
- Do not create S3/R2/Railway Storage Bucket unless explicitly requested later.
- Use Railway PostgreSQL for DB/migration verification through secure env vars.
- Do not commit secrets.
- Keep feature-oriented onion architecture.
- Domain must not import UI, Next.js, Drizzle, external clients, or env vars.
- Application layer contains use cases and ports.
- Infrastructure layer implements repositories and external adapters.
- Every feature must include tests.
- Maintain 80%+ coverage for lines, statements, branches, and functions.
- Update `spec.md` when behavior changes.
- Commit after green milestones.
- Commit messages must be English imperative sentence case, for example `Add class selection logic`.
- Do not use Conventional Commits prefixes.

Before final response, run:
```bash
pnpm lint
pnpm typecheck
pnpm test:coverage
pnpm test:e2e
pnpm build
```

Do not claim completion unless checks pass or a real external blocker is documented in `spec.md`.
````
---

================================================================================
Recommended implementation order
================================================================================

````text
1. Repository audit, docs, architecture ADR, Railway PostgreSQL
2. Tooling, tests, CI, DB connection verification
3. DB schema and domain model
4. Auth and owner dashboard shell
5. Product catalog with image URLs
6. Owner order builder
7. Public order link
8. Customer delivery form
9. Nova Poshta adapter
10. Ukrposhta adapter
11. MonoPay module
12. Shipment worker
13. Tracking sync
14. Owner orders and tags
15. Ukrainian UI polish and Playwright MCP verification
16. Railway deployment
17. Release hardening
````
