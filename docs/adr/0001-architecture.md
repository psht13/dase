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
