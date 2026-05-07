# Dase audit and Codex repair prompts - v3

Цей файл містить аудитні висновки та набір промптів для Codex після перевірки репозиторію `psht13/dase`.

## Як використовувати

1. Почни з **PROMPT 00**.
2. Далі виконуй промпти по порядку.
3. Після кожного промпта Codex має:
   - оновити `spec.md`, `AGENTS.md`, `DEPLOYMENT.md`, якщо поведінка або env vars змінилися;
   - додати або оновити тести;
   - запустити релевантні перевірки;
   - зробити коміт тільки після green checks.
4. Якщо будь-яка перевірка падає, не переходь до наступного промпта. Використай **PROMPT 07 - recovery prompt**.
5. Назви комітів мають бути англійською, imperative sentence case, без Conventional Commits prefix.
   - Добре: `Fix owner authentication navigation`
   - Погано: `fix: owner navigation`

## Короткий аудит

Підтверджені проблеми:

- Початкова CTA-кнопка `Перейти до налаштування` на home page є просто `<Button>`, без `Link` або `onClick`, тому вона нікуди не веде.
- `/setup` зараз очікує setup token у query параметрі `?token=...` і не показує форму, якщо token відсутній. Це поганий UX і небажано з точки зору безпеки, бо secret потрапляє в URL/history/logs.
- Після auth update треба окремо перевірити session cookie persistence: login -> dashboard -> navigation between dashboard pages -> hard reload. Не можна покладатися тільки на Playwright fallback cookies.
- Nova Poshta adapter зараз використовує legacy `https://api.novaposhta.ua/v2.0/json/`.
- Потрібно перейти на новий Nova Post API `v.1.0` з API key -> JWT flow.
- Ukrposhta треба повністю прибрати з активного MVP, але залишити `ShippingCarrier` port і carrier registry так, щоб її можна було повернути пізніше.
- Поточний delivery UI, validation, schema, env docs і factory все ще містять `UKRPOSHTA`.
- Поточні shipment adapters не мають достатньо sender/counterparty configuration для безпечного production label creation.
- Потрібен README або короткий operations guide для запуску, owner setup, Railway env vars і demo flow.
- Варто розділити env validation за runtime: `web`, `worker`, `test`, бо зараз production worker може бути змушений мати web-only secrets.

---

================================================================================
PROMPT 00 - audit current repo and create repair checklist
================================================================================

```text
You are working in the existing GitHub repository `psht13/dase`.

Read these files first:
- AGENTS.md
- spec.md
- DEPLOYMENT.md
- docs/adr/0001-architecture.md
- package.json
- .env.example
- src/app/page.tsx
- src/app/login/page.tsx
- src/app/setup/page.tsx
- src/modules/users/**
- src/modules/shipping/**
- src/modules/orders/application/delivery-form-validation.ts
- src/modules/orders/ui/delivery-form.tsx
- src/shared/config/env.ts
- src/shared/db/schema.ts

Goal:
Create a precise repair checklist for the current issues before changing large areas of code.

Confirmed issues to account for:
1. Home page CTA button "Перейти до налаштування" does not navigate anywhere.
2. `/setup` currently relies on a setup token in the URL query. Replace this with a safer form-based setup token flow.
3. Dashboard navigation after authentication appears unstable and can redirect to `/login` during normal navigation.
4. Nova Poshta adapter uses legacy `api.novaposhta.ua/v2.0/json/`.
5. Active Ukrposhta integration should be removed from MVP, but future reintroduction should remain easy through ports/interfaces.
6. Shipping label creation needs clearer production configuration and failure handling.
7. Documentation should be updated after each behavior/env change.

Constraints:
- Allowed roles remain only `owner` and `user`.
- Do not add an `admin` role.
- All user-facing UI text must be Ukrainian.
- Product images remain external URL-only.
- Do not create S3/R2/Railway Storage Bucket.
- Do not commit secrets.
- Do not call live external APIs in CI.
- Use MSW/fixtures for external API tests.
- Use Playwright MCP or Playwright tests for UI/navigation verification.
- Commit messages must be English imperative sentence case without prefixes.

Tasks:
1. Inspect the code and produce a short checklist in `spec.md` under a new section `Repair audit on <today date>`.
2. Document the intended order of repairs:
   - auth/setup/navigation;
   - Nova Post API replacement;
   - Ukrposhta removal from active MVP;
   - shipping production configuration;
   - regression tests and docs.
3. Do not implement functional changes in this prompt except tiny documentation corrections if necessary.
4. Run:
   - pnpm lint
   - pnpm typecheck
5. Commit with:
   `Document repair audit`
```

---

================================================================================
PROMPT 01 - fix owner setup, login, and dashboard navigation
================================================================================

```text
Read AGENTS.md, spec.md, DEPLOYMENT.md, and docs/adr/0001-architecture.md first.

Goal:
Fix production owner setup, login persistence, and dashboard navigation.

Current problems:
- The home page CTA button "Перейти до налаштування" is not a link and does nothing.
- `/setup` requires `?token=...` before showing the form. This is poor UX and puts the setup token into URLs.
- After login, normal navigation between dashboard pages can redirect the owner back to `/login`.

Required behavior:
1. Home page CTA must be a real link.
2. If no owner exists:
   - CTA should lead to `/setup`.
   - `/setup` should show the first-owner setup form.
3. If an owner already exists:
   - CTA should lead to `/login` or show a clear Ukrainian login action.
4. `/setup` must not require token in the URL.
5. In production, `/setup` must include a Ukrainian setup token input field in the form.
6. The setup token must be validated only in the server action.
7. Do not put `OWNER_SETUP_TOKEN` in URLs, redirects, logs, client state, or query strings.
8. In non-production, allow setup without token unless the existing tests require another behavior.
9. After first owner creation, redirect to `/login?setup=created`.
10. After login, the owner must remain authenticated across:
    - `/dashboard`;
    - `/dashboard/products`;
    - `/dashboard/orders`;
    - `/dashboard/orders/new`;
    - hard reload;
    - client-side navigation;
    - browser back/forward.
11. `user` role must still be denied dashboard access.
12. Unauthenticated users must be redirected to `/login`.

Implementation guidance:
- Investigate the real cause of session loss instead of adding superficial redirects.
- Inspect `LoginForm`, Better Auth route handler, `getSessionUserFromHeaders`, `requireOwnerSession`, and Better Auth configuration.
- Prefer a robust Better Auth client or server action approach for sign-in that reliably stores the session cookie.
- If using direct fetch to `/api/auth/sign-in/email`, verify cookies are actually set and available to server components after navigation.
- Preserve Ukrainian UI copy.
- Keep business logic in application/domain layers where possible.

Tests to add or update:
1. Unit/application tests:
   - setup available when no owner exists;
   - setup blocked when owner exists;
   - production setup requires token;
   - token is not accepted from URL as the main flow;
   - owner role is assigned after setup.
2. UI/component tests:
   - home CTA is a link and points to the right destination based on setup state;
   - setup form shows a Ukrainian token field in production;
   - login form has Ukrainian labels.
3. Playwright e2e using real auth flow, not only fallback cookies:
   - open `/setup`;
   - create first owner;
   - log in;
   - navigate through dashboard pages;
   - hard reload on `/dashboard/orders`;
   - verify still authenticated;
   - log out;
   - verify dashboard redirects to login.
4. Existing fallback-cookie e2e tests can remain, but add at least one real setup/login persistence e2e path.

Docs:
- Update `spec.md` with final owner setup/login behavior.
- Update `DEPLOYMENT.md` with secure `OWNER_SETUP_TOKEN` instructions.
- Update `.env.example` if needed.
- If `README.md` does not exist, create a minimal one with local setup and first-owner setup instructions.

Required checks:
```bash
pnpm lint
pnpm typecheck
pnpm test:coverage
pnpm test:e2e
pnpm build
```

Commit with:
`Fix owner authentication navigation`
```

---

================================================================================
PROMPT 02 - replace legacy Nova Poshta API with new Nova Post API
================================================================================

```text
Read AGENTS.md, spec.md, DEPLOYMENT.md, and docs/adr/0001-architecture.md first.

Goal:
Replace the legacy Nova Poshta `v2.0/json` implementation with the newer Nova Post API `v.1.0` and JWT-based authorization.

Current problem:
`src/modules/shipping/infrastructure/nova-poshta-shipping-carrier.ts` uses the legacy JSON API:
- default URL: `https://api.novaposhta.ua/v2.0/json/`
- request shape with `apiKey`, `modelName`, `calledMethod`, `methodProperties`

New target:
Use Nova Post API v.1.0 with:
- API key used to generate a temporary JWT token;
- JWT token cached and reused until near expiration;
- production endpoint documented by Nova Post;
- stage/test endpoint documented by Nova Post;
- no live calls in CI.

Important:
Before implementation, inspect official Nova Post API documentation and/or official Postman collection for exact endpoint paths, auth header format, request/response fields, and shipment creation requirements. Do not guess field names for shipment creation.

Expected env changes:
1. Prefer new env names:
   - `NOVA_POST_API_KEY`
   - `NOVA_POST_API_URL`
   - `NOVA_POST_AUTH_URL` if the auth endpoint cannot be derived safely from `NOVA_POST_API_URL`
2. Remove or deprecate old env names:
   - `NOVA_POSHTA_API_KEY`
   - `NOVA_POSHTA_API_URL`
3. If backward compatibility is temporarily kept, document it as deprecated in `spec.md` and `DEPLOYMENT.md`.

Architecture requirements:
1. Keep the `ShippingCarrier` application port.
2. Rename infrastructure implementation to something like:
   - `NovaPostShippingCarrier`
   - `NovaPostJwtProvider`
3. Keep internal carrier code stable unless a safe migration is implemented.
   - It is acceptable to keep DB/internal code `NOVA_POSHTA` for compatibility while the implementation uses Nova Post v.1.0.
   - User-facing UI should say `Нова пошта`.
4. Do not expose provider-specific DTOs to UI.
5. Keep route handlers thin.

Implementation tasks:
1. Replace the legacy adapter with a new Nova Post v.1.0 adapter.
2. Implement JWT generation:
   - call the documented authorization endpoint with API key;
   - parse JWT response;
   - cache JWT for less than 1 hour;
   - refresh before expiration;
   - never log the API key or JWT.
3. Implement or update:
   - search cities/localities;
   - search warehouses/branches;
   - create shipment;
   - get shipment status.
4. If exact production shipment creation requires sender/counterparty fields not currently available, implement explicit configuration validation:
   - fail with a clear application error;
   - append safe Ukrainian audit message;
   - do not call the live create-shipment endpoint with incomplete data.
5. Add safe error mapping so the public delivery form does not show raw provider errors.
6. Update factory wiring to use the new adapter.
7. Update `.env.example`, `spec.md`, and `DEPLOYMENT.md`.
8. Remove references to the legacy `v2.0/json` URL from production code and docs.

Tests:
1. MSW contract tests:
   - JWT is generated from API key;
   - JWT is cached;
   - JWT refreshes after expiration;
   - city search maps provider response to internal `ShippingCity`;
   - warehouse search maps provider response to internal `ShippingWarehouse`;
   - create shipment maps tracking number/document id/label;
   - status mapping works;
   - provider error maps to safe app error.
2. Unit tests:
   - no token/API key is logged;
   - missing sender config blocks shipment creation safely.
3. Playwright:
   - customer delivery form can search/select Nova Post city and warehouse through mocked API;
   - order confirmation works with Nova Post as the only active carrier.
4. CI must not call live Nova Post APIs.

Required checks:
```bash
pnpm lint
pnpm typecheck
pnpm test:coverage
pnpm test:e2e
pnpm build
```

Commit with:
`Replace Nova Poshta legacy API`
```

---

================================================================================
PROMPT 03 - remove Ukrposhta from active MVP while preserving carrier architecture
================================================================================

```text
Read AGENTS.md, spec.md, DEPLOYMENT.md, and docs/adr/0001-architecture.md first.

Goal:
Remove Ukrposhta from the active MVP because test/production API access is not currently practical, but keep the shipping architecture extensible so Ukrposhta can be reintroduced later.

Current problem:
Ukrposhta is still active in several places:
- delivery form select option;
- delivery form validation;
- shipping carrier factory;
- env validation and `.env.example`;
- schema enums;
- shipment carrier types;
- docs/spec/deployment;
- tests and fixtures.

Required product behavior:
1. Customer delivery form must show only:
   - `Нова пошта`
2. Customer cannot submit `UKRPOSHTA`.
3. `/api/carriers/cities` and `/api/carriers/warehouses` must reject disabled carriers with a Ukrainian 400 response.
4. Worker must not try to create Ukrposhta shipments.
5. Owner UI should not offer Ukrposhta filters unless there are historical records.
6. If historical Ukrposhta records exist, show them as disabled/legacy:
   - `Укрпошта (вимкнено)`
   - no retry/live shipment action for them.
7. Keep `ShippingCarrier` port and a carrier registry so another carrier can be added later without rewriting order/payment logic.

Implementation guidance:
- Prefer an `activeShippingCarriers` registry or config object instead of hardcoded arrays in many files.
- It is acceptable to keep old PostgreSQL enum values if removing enum values is risky. Do not expose disabled carriers in UI.
- If you change DB enum values, write a safe migration and verify it against a test DB first.
- Remove live Ukrposhta adapter code from production wiring.
- You may keep a future placeholder interface or README note, but do not leave an active factory path that calls Ukrposhta.
- Remove `UKRPOSHTA_*` env vars from required/active production docs.
- Do not delete the generic `ShippingCarrier` interface.

Tasks:
1. Add a central shipping carrier registry:
   - active carrier code;
   - Ukrainian label;
   - whether search is enabled;
   - whether shipment creation is enabled;
   - whether the carrier is legacy/disabled.
2. Update delivery validation to accept only active carriers.
3. Update delivery form to render active carriers from the registry.
4. Update API carrier routes to reject disabled/unknown carriers.
5. Update shipment worker and retry logic to avoid disabled carriers.
6. Update owner order filters/details to handle legacy disabled carrier records safely.
7. Remove Ukrposhta env vars from `.env.example`, `spec.md`, and `DEPLOYMENT.md`.
8. Update tests that previously expected Ukrposhta as active.
9. Keep architecture notes explaining how Ukrposhta can be added back later through the same port.

Tests:
1. Unit tests:
   - active carrier registry contains Nova Post only;
   - delivery validation rejects `UKRPOSHTA`;
   - carrier API routes reject disabled carrier;
   - worker refuses disabled carrier safely.
2. UI tests:
   - delivery form does not show `Укрпошта`;
   - owner filter does not show Ukrposhta unless a legacy record exists.
3. Playwright:
   - customer delivery flow works with only Nova Post;
   - no Ukrposhta option is visible.
4. Docs tests or snapshot-like checks if they already exist.

Required checks:
```bash
pnpm lint
pnpm typecheck
pnpm test:coverage
pnpm test:e2e
pnpm build
```

Commit with:
`Remove Ukrposhta active integration`
```

---

================================================================================
PROMPT 04 - harden shipping production settings and demo safety
================================================================================

```text
Read AGENTS.md, spec.md, DEPLOYMENT.md, and docs/adr/0001-architecture.md first.

Goal:
Make shipping safe for demo and production by preventing accidental incomplete or live shipment creation.

Context:
The app should support real Nova Post shipment creation eventually, but demo/staging should not accidentally create real labels with incomplete sender/counterparty data.

Tasks:
1. Define explicit shipping modes:
   - `mock` for local/e2e only;
   - `disabled` for production without full credentials/sender config;
   - `live` for real label creation.
2. Add env var:
   - `SHIPPING_LABEL_CREATION_MODE=disabled|mock|live`
3. In production, default to `disabled` unless explicitly set to `live`.
4. In `mock` mode, do not call live Nova Post APIs for shipment creation.
5. In `disabled` mode:
   - do not call live create-shipment endpoint;
   - append a safe Ukrainian audit event;
   - show owner-facing message that shipment creation is disabled until production shipping settings are completed;
   - do not pretend a real tracking number exists.
6. In `live` mode:
   - validate every required Nova Post setting before creating shipment;
   - fail safely if any setting is missing;
   - never log API key/JWT/sensitive sender data.
7. Add sender/counterparty configuration model for Nova Post.
   You may start with env vars if no settings UI exists yet, but document it.
8. Do not add Ukrposhta back.
9. Keep all user-facing messages Ukrainian.

Suggested env vars to evaluate and adjust after checking the official Nova Post API shape:
- `NOVA_POST_API_KEY`
- `NOVA_POST_API_URL`
- `NOVA_POST_SENDER_ID`
- `NOVA_POST_SENDER_CONTACT_ID`
- `NOVA_POST_SENDER_WAREHOUSE_ID`
- `NOVA_POST_PAYER_TYPE`
- `NOVA_POST_PAYMENT_METHOD`
- `NOVA_POST_DEFAULT_WEIGHT_KG`
- `SHIPPING_LABEL_CREATION_MODE`

Do not blindly add all env vars if the official Nova Post v.1.0 API requires different names. Use exact provider fields in infrastructure only, and keep app-level names stable.

Tests:
1. Unit/application tests:
   - disabled mode does not call provider;
   - live mode missing config fails before provider call;
   - mock mode stays deterministic;
   - audit event is written for disabled/missing-config cases.
2. Worker tests:
   - create-shipment job handles disabled mode safely;
   - retry does not bypass disabled mode.
3. Playwright:
   - owner sees a clear Ukrainian message when shipment creation is disabled.
4. Env tests:
   - production env validation accepts disabled mode without full shipping credentials;
   - live mode requires all required Nova Post settings.

Docs:
- Update `.env.example`.
- Update `spec.md`.
- Update `DEPLOYMENT.md`.
- Add a short README section:
  - how to demo with shipping disabled/mock;
  - how to enable live Nova Post later.

Required checks:
```bash
pnpm lint
pnpm typecheck
pnpm test:coverage
pnpm test:e2e
pnpm build
```

Commit with:
`Harden shipping production settings`
```

---

================================================================================
PROMPT 05 - split runtime env validation and clean deployment docs
================================================================================

```text
Read AGENTS.md, spec.md, DEPLOYMENT.md, and docs/adr/0001-architecture.md first.

Goal:
Clean up environment validation so each runtime validates only the secrets/settings it actually needs.

Current issue:
`getServerEnv()` validates one broad schema for all production runtimes. This can force the worker to require web-only values like owner setup/login settings, and can force web to carry worker-only settings.

Tasks:
1. Refactor env validation into runtime-aware functions:
   - `getWebEnv()`
   - `getWorkerEnv()`
   - `getTestEnv()` if useful
   - keep `getServerEnv()` only if it remains safe and documented.
2. Web runtime should require:
   - `DATABASE_URL`
   - `BETTER_AUTH_SECRET`
   - `BETTER_AUTH_URL`
   - `OWNER_SETUP_TOKEN` only if first-owner setup is enabled in production
   - payment/shipping settings only when the corresponding live mode is enabled.
3. Worker runtime should require:
   - `DATABASE_URL`
   - `AUTO_COMPLETE_AFTER_DELIVERED_HOURS`
   - shipping mode/settings needed by worker.
4. Worker should not require login/setup-only secrets unless truly needed.
5. Test/dev should allow fixture/mocked behavior safely.
6. Make missing env errors explicit and non-secret.
7. Update all imports to use the correct env getter.
8. Update `.env.example`, `spec.md`, `DEPLOYMENT.md`, and README.
9. Keep Railway variables secure.
10. Do not weaken production checks.

Tests:
1. Env validation tests for:
   - web production;
   - worker production;
   - live shipping mode;
   - disabled shipping mode;
   - test/dev fallback.
2. Worker start test or lightweight config test proving worker does not require owner setup token.
3. Build must still pass.

Required checks:
```bash
pnpm lint
pnpm typecheck
pnpm test:coverage
pnpm test:e2e
pnpm build
```

Commit with:
`Split runtime environment validation`
```

---

================================================================================
PROMPT 06 - final code audit and production readiness hardening
================================================================================

```text
Read AGENTS.md, spec.md, DEPLOYMENT.md, docs/adr/0001-architecture.md, and README.md first.

Goal:
Perform a final production-readiness audit after the auth, Nova Post, Ukrposhta removal, and shipping settings changes.

Audit areas:
1. Auth:
   - no redirect loops;
   - owner setup works;
   - login persists across navigation and reload;
   - logout clears session;
   - `user` role cannot access dashboard.
2. Shipping:
   - only Nova Post is active;
   - no live Ukrposhta calls exist;
   - no legacy Nova Poshta `v2.0/json` production code remains;
   - shipping mode prevents accidental live labels;
   - Nova Post JWT/API key is never logged.
3. Payments:
   - MonoPay retry works;
   - stale webhook events are ignored;
   - duplicate webhook events are idempotent;
   - no card data is stored.
4. DB:
   - migrations are safe;
   - no production destructive scripts;
   - order confirmation writes remain transactional.
5. UI:
   - all user-facing copy is Ukrainian;
   - home CTA works;
   - public pages work on mobile;
   - dashboard navigation works.
6. Docs:
   - README exists;
   - `.env.example` matches code;
   - `spec.md` current status is accurate;
   - `DEPLOYMENT.md` matches Railway services and env vars.
7. Tests:
   - coverage remains 80%+;
   - Playwright e2e covers repaired flows;
   - CI does not call live external APIs.

Fix any issues found.

Required final checks:
```bash
pnpm lint
pnpm typecheck
pnpm test:coverage
pnpm test:e2e
pnpm build
```

Also run, if available:
```bash
pnpm db:generate
pnpm db:migrate
```

If `pnpm db:generate` creates a migration, inspect it carefully and commit it only if expected.

Update docs:
- spec.md
- DEPLOYMENT.md
- README.md
- AGENTS.md only if future agents need a new permanent rule.

Commit with:
`Prepare shipping and auth release`
```

---

================================================================================
PROMPT 07 - recovery prompt
================================================================================

```text
Read AGENTS.md, spec.md, DEPLOYMENT.md, docs/adr/0001-architecture.md, and the latest failing command output.

Goal:
Recover from failing checks without weakening quality gates.

Rules:
1. Do not skip failing tests.
2. Do not delete meaningful tests to make the suite pass.
3. Do not reduce coverage thresholds.
4. Do not bypass auth or shipping safety checks.
5. Do not re-enable Ukrposhta as an active carrier.
6. Do not restore legacy Nova Poshta `v2.0/json` production code.
7. Do not commit secrets.
8. Keep UI copy Ukrainian.
9. Keep roles limited to `owner` and `user`.

Tasks:
1. Identify the root cause of the failure.
2. Fix the smallest safe area of code.
3. Add or update tests if the failure exposed missing coverage.
4. Run the failing command again.
5. Then run the full required suite:
   ```bash
   pnpm lint
   pnpm typecheck
   pnpm test:coverage
   pnpm test:e2e
   pnpm build
   ```
6. Update `spec.md` if behavior changed.
7. Commit only after checks pass.

Use a commit message that describes the actual recovery, for example:
`Fix owner session persistence`
```
