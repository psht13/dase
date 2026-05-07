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

## First Owner Setup

Before any owner exists, open `/setup` and create the first owner.

In production, set `OWNER_SETUP_TOKEN` as a secure environment variable and enter it in the Ukrainian token field on the `/setup` form. Do not place `OWNER_SETUP_TOKEN` in URLs, redirects, logs, query strings, or client-side state.

After the first owner is created, `/setup` becomes unavailable and owner access starts from `/login`.

## Verification

```bash
pnpm lint
pnpm typecheck
pnpm test:coverage
pnpm test:e2e
pnpm build
```
