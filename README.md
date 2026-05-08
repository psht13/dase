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

MonoPay and Nova Post secrets should be set only for the live flows that use them. Keep Railway values in secure service variables or variable references.

## First Owner Setup

Before any owner exists, open `/setup` and create the first owner.

In production, set `OWNER_SETUP_TOKEN` as a secure environment variable and enter it in the Ukrainian token field on the `/setup` form. Do not place `OWNER_SETUP_TOKEN` in URLs, redirects, logs, query strings, or client-side state.

After the first owner is created, `/setup` becomes unavailable and owner access starts from `/login`.

## Public Order Links

Customers open `/o/[token]` to review selected products and continue to delivery while the order is waiting for confirmation.

The delivery/contact form asks for full name, phone, and an optional Instagram nickname so the seller can match the order with chat history. Instagram nicknames are stored normalized without duplicate leading `@` characters, while owner UI displays them with one leading `@`.

After a customer submits delivery/payment details, the same public link becomes a Ukrainian status page with `Замовлення #...`, current status, seller-chat instruction, selected products, and total. Reopening `/o/[token]/delivery` after confirmation shows the status page instead of the delivery form, so the customer cannot submit the same order twice.

## Shipping Demo Modes

Use `SHIPPING_LABEL_CREATION_MODE=disabled` for demos and staging when Nova Post sender settings are not complete. Owners will see a Ukrainian notice, shipment creation jobs will stop before live label creation, and no real tracking number is recorded.

Use `SHIPPING_LABEL_CREATION_MODE=mock` only for local development and Playwright e2e. This keeps carrier directory data and shipment numbers deterministic without Nova Post live calls.

To enable live Nova Post later, set `SHIPPING_LABEL_CREATION_MODE=live` and configure the required `NOVA_POST_*` sender, payer, parcel, and API variables from `.env.example` in secure environment variables.

## Verification

```bash
pnpm lint
pnpm typecheck
pnpm test:coverage
pnpm test:e2e
pnpm build
```

Authenticated production smoke testing is opt-in and uses only temporary local shell variables:

```bash
E2E_PROD_EMAIL='owner@example.com' \
E2E_PROD_PASSWORD='temporary-password' \
pnpm test:e2e:prod
```

Do not commit or store the production smoke credentials in repo files or Railway runtime variables.
