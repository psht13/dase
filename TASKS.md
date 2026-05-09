# Dase - Railway production/test database split prompts v1

Цей файл містить промпти для Codex, щоб безпечно розділити Railway PostgreSQL на окремі production і test інстанси, оновити Railway env, зберегти локальні env-файли та підготувати інструкцію для створення першого owner у новій production базі.

## Важливо

- Не коміть `.env`, `.env.*`, `.env.production`, `.env.production.local`, `.env.test.local` або будь-які файли з секретами.
- Не друкуй повні credentials у відповіді, логах або комітах.
- Перед перемиканням production на нову БД зроби snapshot/export поточної БД або переконайся, що Railway backup доступний.
- Поточний PostgreSQL інстанс після перемикання має використовуватись як test/staging DB, але не запускай destructive tests проти нього, якщо там є корисні дані.
- Production web і worker повинні отримувати `DATABASE_URL` тільки через Railway variables/reference до нового production Postgres.
- Локальні env-файли мають бути створені тільки в робочій директорії й залишатися ignored by git.

---

================================================================================
PROMPT DB-00 - audit current Railway database state and plan safe split
================================================================================

```text
Read AGENTS.md, spec.md, DEPLOYMENT.md, README.md if it exists, and docs/adr/0001-architecture.md first.

Goal:
Audit the current Railway database and deployment state before splitting production and test databases.

Context:
The current Railway PostgreSQL instance has been used by the deployed app. The user now wants:
- a new PostgreSQL instance for production;
- the current PostgreSQL instance to become test/staging;
- local `.env` to point to the current/test database where possible;
- local `.env.production.local` or `.env.production` to contain production values for quick switching;
- Railway production `web` and `worker` env vars to be updated to the new production database;
- instructions for creating the first owner in the new production database.

Rules:
- Never commit secrets.
- Never print full connection strings or secret values.
- Do not run destructive commands against the current DB.
- Do not rename Railway services until you know which variables reference them.
- Keep all documentation user-facing text Ukrainian.
- Commit messages must be English imperative sentence case, for example `Document database split plan`.

Tasks:
1. Inspect the repository:
   - package scripts;
   - drizzle config;
   - Railway config files;
   - `.gitignore` rules for `.env` files;
   - current env docs in `.env.example`, `DEPLOYMENT.md`, `spec.md`, and `README.md` if present.
2. Use Railway MCP to inspect the live project:
   - project name and environment;
   - services: web, worker, current Postgres;
   - latest deployed commits for web and worker;
   - current `DATABASE_URL` references for web and worker;
   - whether Railway backups/snapshots are available for the current Postgres;
   - public/private connection options for the current Postgres.
3. Identify the current Postgres service ID/name and label it in notes as `test/staging candidate`.
4. Identify what local connection string can safely be used for the current/test database:
   - Prefer a Railway public proxy connection string if available.
   - If only a private Railway URL exists, document that local direct connection is not possible without Railway CLI/proxy.
5. Write a short plan in `spec.md` and `DEPLOYMENT.md`:
   - current DB becomes test/staging;
   - new DB becomes production;
   - web must migrate production DB before worker starts using it;
   - owner setup must be run after new DB is live.
6. Do not create or switch databases yet in this prompt.
7. Run:
   - pnpm lint
   - pnpm typecheck
   - pnpm test:coverage
   - pnpm build
8. Commit only documentation changes with a message like:
   `Document database split plan`

Expected final response:
- Redacted summary of current Railway DB state.
- Whether local current/test DB connection is possible.
- Whether backups/snapshots are available.
- Confirmation that no secrets were committed.
```

---

================================================================================
PROMPT DB-01 - provision new production PostgreSQL and switch Railway services
================================================================================

```text
Read AGENTS.md, spec.md, DEPLOYMENT.md, README.md if it exists, and docs/adr/0001-architecture.md first.

Goal:
Create a new Railway PostgreSQL instance for production, keep the current PostgreSQL instance as test/staging, update Railway production env vars, run migrations safely, and verify production health.

Rules:
- Never commit secrets.
- Never print full credentials.
- Do not delete the old/current Postgres service.
- Do not run destructive tests against either database.
- Do not switch worker to the new production DB before web migrations are verified.
- Keep old/current DB available for test/staging.
- Keep object storage disabled unless already explicitly required elsewhere.

Tasks:
1. Use Railway MCP to inspect the project and services.
2. Before changing anything, verify current web and worker `DATABASE_URL` values are references to the current Postgres service. Record only redacted service names/IDs in docs.
3. Ensure a backup/snapshot/export exists for the current Postgres, or create one if Railway MCP supports it. If MCP cannot create a backup, document the exact manual backup step and do not delete or mutate the current DB.
4. Create a new Railway PostgreSQL service for production.
   - Suggested name: `Postgres Production`.
   - Keep the old/current service as test/staging.
   - Suggested old service name after switch: `Postgres Test` or `Postgres Staging`, but rename only after all references are updated and verified.
5. Configure Railway variables safely:
   - For `web`, set `DATABASE_URL` to reference the new production Postgres service.
   - For `worker`, do not switch until web migration is verified.
6. Trigger/redeploy `web` so its pre-deploy command `pnpm db:migrate` runs against the new production DB.
7. Verify the web deployment:
   - deployment succeeded;
   - `/api/health` returns status ok;
   - migrations created the expected app tables;
   - do a read-only table count or schema check.
8. After web/migrations are verified, set `worker` `DATABASE_URL` to reference the new production Postgres service.
9. Redeploy `worker` and verify logs show the worker is ready.
10. Confirm old/current Postgres is not referenced by production `web` or production `worker` anymore.
11. Mark old/current Postgres as test/staging in docs.
12. Update `DEPLOYMENT.md` and `spec.md` with:
    - new production DB created;
    - old DB retained as test/staging;
    - web migration verification;
    - worker verification;
    - owner setup needed for the new empty production DB;
    - no secret values.
13. Do not create or commit local env files in this prompt unless specifically running in the user's local working tree and the files are gitignored. If local file creation is possible and safe, use Prompt DB-02 instead.
14. Run:
    - pnpm lint
    - pnpm typecheck
    - pnpm test:coverage
    - pnpm build
15. Commit docs/config changes only, if any safe tracked files changed.

Commit message:
`Switch production database`

Expected final response:
- New production DB service name, redacted.
- Old test/staging DB service name, redacted.
- Web and worker are using the new production DB.
- Health check result.
- Worker readiness result.
- Reminder that first owner must be created in the new production DB.
```

---

================================================================================
PROMPT DB-02 - create local env files for test and production switching
================================================================================

```text
Read AGENTS.md, spec.md, DEPLOYMENT.md, README.md if it exists, and docs/adr/0001-architecture.md first.

Goal:
Create local ignored env files so the user can quickly switch between local/test and production values without committing secrets.

Context:
The old/current Railway Postgres should now be used as test/staging. The new Railway Postgres should be used by production web/worker.

Rules:
- Never commit env files with secrets.
- Ensure `.gitignore` ignores `.env`, `.env.*`, `.env.production`, `.env.production.local`, `.env.test.local`, and `.env.local`, while keeping `.env.example` tracked.
- Do not print full secret values.
- If this Codex environment is not the user's persistent local machine, do not pretend the files will be available to the user. Instead, create templates without secrets and document manual steps.
- Prefer `.env.production.local` over `.env.production` for secret local storage. If the user explicitly needs `.env.production`, create it only if it is gitignored.

Tasks:
1. Verify `.gitignore` protects all local env secret files.
   - If missing, update `.gitignore` safely.
2. Retrieve redacted Railway variables through Railway MCP.
3. Determine whether the current/test Railway Postgres has a local-accessible public connection string.
   - If yes, use that for local `.env` and `.env.test.local`.
   - If no, document the Railway CLI/proxy command required to connect locally and do not put an unusable private URL into `.env` unless clearly labeled.
4. Create local ignored file `.env` for local development/test with values like:
   - DATABASE_URL=<old/current test DB connection string or local postgres URL>
   - BETTER_AUTH_SECRET=<local generated secret, at least 32 chars>
   - BETTER_AUTH_URL=http://localhost:3000
   - OWNER_SETUP_TOKEN=<local generated setup token>
   - SHIPPING_LABEL_CREATION_MODE=mock or disabled depending on current app config
   - USE_MOCK_SHIPPING_CARRIERS=1 only if the current app still uses it for local tests
   - AUTO_COMPLETE_AFTER_DELIVERED_HOURS=24
   - No production payment/shipping secrets unless needed for local staging.
5. Create local ignored file `.env.test.local` pointing to the old/current test DB if available.
6. Create local ignored file `.env.production.local` with production values needed for emergency local checks:
   - DATABASE_URL=<new production DB local-accessible connection string if available>
   - BETTER_AUTH_SECRET=<production value from Railway, only if this is the user's local trusted machine>
   - BETTER_AUTH_URL=https://web-production-26609.up.railway.app or custom production domain
   - OWNER_SETUP_TOKEN=<production setup token, only if this is the user's local trusted machine>
   - SHIPPING_LABEL_CREATION_MODE=disabled unless live shipping is intentionally configured
   - AUTO_COMPLETE_AFTER_DELIVERED_HOURS=24
7. Set permissions on secret env files:
   - chmod 600 .env .env.test.local .env.production.local
8. Do not commit these env files.
9. Add or update `.env.example` with non-secret placeholders only.
10. Add or update README.md or DEPLOYMENT.md with Ukrainian instructions:
    - how to use `.env` for local/test;
    - how to temporarily copy `.env.production.local` to `.env` if needed;
    - how to restore `.env` back to test;
    - warning never to commit secrets.
11. Run:
    - git status --ignored
    - pnpm lint
    - pnpm typecheck
    - pnpm test:coverage
    - pnpm build
12. Commit only safe tracked docs or `.gitignore`/`.env.example` changes.

Commit message:
`Document local environment switching`

Expected final response:
- Names of local env files created.
- Confirmation they are ignored by git.
- Confirmation permissions were set to 600 where possible.
- Redacted summary only, no full secrets.
```

---

================================================================================
PROMPT DB-03 - verify first owner setup on new production database
================================================================================

```text
Read AGENTS.md, spec.md, DEPLOYMENT.md, README.md if it exists, and docs/adr/0001-architecture.md first.

Goal:
Verify that the new production database can create the first owner through the production setup flow and document clear instructions for the user.

Rules:
- Do not create a permanent owner unless the user explicitly asked to do so in this run.
- If using temporary test owner credentials, do not commit or log them.
- If a temporary owner is created for verification, document how to delete or replace it safely.
- Do not print OWNER_SETUP_TOKEN.
- Keep all documentation Ukrainian.

Tasks:
1. Use Railway MCP to verify production `web` points to the new production database.
2. Check whether an `owner` already exists in the new production database using a read-only query or safe application use case.
3. If no owner exists, verify `/setup` is available.
4. Verify production env contains `OWNER_SETUP_TOKEN` without printing its value.
5. Verify setup flow behavior:
   - `/setup` opens Ukrainian first-owner setup UI;
   - setup requires the setup token in production;
   - invalid token does not create an owner;
   - valid token creates an owner;
   - after an owner exists, `/setup` becomes unavailable;
   - `/login` works with the new owner;
   - `/dashboard` opens and navigation persists.
6. If the user did not authorize creating the real first owner, do not complete the creation step. Instead, prepare manual instructions for the user.
7. Add or update README.md and DEPLOYMENT.md with a section:
   `Створення першого owner у production`
8. The instruction must include:
   - Open `https://web-production-26609.up.railway.app/setup` or the custom domain `/setup`.
   - Enter the setup token from Railway variable `OWNER_SETUP_TOKEN` if the form asks for it.
   - Create owner with name, email, and password.
   - After redirect to `/login`, log in.
   - Open `/dashboard`.
   - Verify `/setup` is no longer available after owner creation.
   - Rotate or remove `OWNER_SETUP_TOKEN` after first owner is created, if the app no longer needs it.
9. Add an optional safe SQL/read-only verification command if useful:
   - count users with role owner;
   - do not include database credentials.
10. Run:
    - pnpm lint
    - pnpm typecheck
    - pnpm test:coverage
    - pnpm test:e2e
    - pnpm build
11. Commit only docs/tests/safe code changes.

Commit message:
`Document production owner setup`

Expected final response:
- Whether a production owner already exists.
- If not created, exact manual steps for the user.
- If created with user approval, confirm login/dashboard verification and do not print password.
- Reminder to rotate setup token after owner creation.
```

---

================================================================================
PROMPT DB-04 - recovery prompt for database split issues
================================================================================

```text
Read AGENTS.md, spec.md, DEPLOYMENT.md, README.md if it exists, and docs/adr/0001-architecture.md first.

Goal:
Recover safely if the production/test database split caused broken deployments, failed migrations, wrong env variables, or auth/setup issues.

Rules:
- Do not delete any database service.
- Do not run destructive migrations.
- Do not print secrets.
- Prefer rollback and variable correction over data mutation.
- Keep the site available where possible.

Tasks:
1. Inspect Railway web, worker, and database services.
2. Identify current `DATABASE_URL` references for web and worker.
3. Identify latest successful web deployment and worker deployment.
4. Check web logs for:
   - migration failure;
   - auth env validation failure;
   - DATABASE_URL errors;
   - owner setup errors.
5. Check worker logs for:
   - DATABASE_URL errors;
   - pg-boss startup errors;
   - migration/table missing errors.
6. If production web points to the wrong database, correct `DATABASE_URL` to the new production database reference and redeploy web.
7. If worker points to the wrong database, stop or redeploy worker only after web migrations are verified.
8. If the new production DB has no tables, run or trigger `pnpm db:migrate` safely through web pre-deploy or Railway command.
9. If `/setup` is unavailable unexpectedly, check whether an owner already exists in the new production database.
10. If auth redirects break, verify:
    - BETTER_AUTH_URL is the public production URL;
    - BETTER_AUTH_SECRET is present;
    - cookies are not configured for localhost;
    - `/logout` does not redirect to localhost.
11. Run local checks:
    - pnpm lint
    - pnpm typecheck
    - pnpm test:coverage
    - pnpm build
12. Update spec.md and DEPLOYMENT.md with the incident and resolution.
13. Commit only safe code/docs fixes.

Commit message:
`Fix database split deployment`

Expected final response:
- Root cause.
- What changed.
- Which services now use which database, redacted.
- Health check status.
- Worker status.
- Owner setup status.
```
