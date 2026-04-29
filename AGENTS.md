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
