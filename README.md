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

Production `web` requires `DATABASE_URL`, `BETTER_AUTH_SECRET`, and `BETTER_AUTH_URL`. `OWNER_SETUP_TOKEN` is required only for the production first-owner setup path while no owner exists.

Production `worker` requires `DATABASE_URL` and `AUTO_COMPLETE_AFTER_DELIVERED_HOURS`. It does not require login or setup secrets.

MonoPay and Nova Post secrets should be set only for the live flows that use them. Keep Railway values in secure service variables or variable references.

## First Owner Setup

Before any owner exists, open `/setup` and create the first owner.

In production, set `OWNER_SETUP_TOKEN` as a secure environment variable and enter it in the Ukrainian token field on the `/setup` form. Do not place `OWNER_SETUP_TOKEN` in URLs, redirects, logs, query strings, or client-side state.

After the first owner is created, `/setup` becomes unavailable and owner access starts from `/login`.

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
