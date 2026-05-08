# Dase UI/mobile refactor prompts v1

Цей файл містить набір промптів для Codex, щоб привести UI застосунку Dase до mobile-first стану, спростити форми через step-by-step flow, зробити таблиці менш перевантаженими та покрити все тестами.

## Як використовувати

1. Почни з **PROMPT 00**.
2. Після кожного успішного етапу переходь до наступного промпта.
3. Якщо падає lint, typecheck, coverage, e2e або build - не переходь далі, використовуй **PROMPT 10 - recovery prompt**.
4. Не змінюй бізнес-логіку без явної потреби. Це UI/refactor milestone, не product logic rewrite.
5. Усі user-facing тексти мають бути українською.
6. Коміти мають бути англійською в imperative sentence case без Conventional Commits prefixes. Приклад: `Improve mobile dashboard layout`.

## Головна мета

Поточний застосунок працює функціонально, але UI потребує серйозного покращення:

- сторінки не адаптовані під мобільні екрани;
- dashboard layout, таблиці й форми мають бути mobile-first;
- великі форми треба розбити на кілька кроків;
- таблиці перевантажені інформацією й незручні для читання;
- на мобільних таблиці треба заміняти на card/list views;
- desktop tables мають бути компактнішими, з меншою кількістю колонок і кращою ієрархією;
- critical flows треба перевірити через Playwright desktop + mobile.

---

================================================================================
PROMPT 00 - UI audit and mobile refactor plan
================================================================================

````text
Read AGENTS.md, spec.md, DEPLOYMENT.md, README.md if present, and docs/adr/0001-architecture.md first.

Goal:
Audit the current UI and create a concrete mobile-first refactor plan before changing components.

Context:
The app works functionally, but the UI is not adapted well for mobile. Forms are too large, tables are overloaded, and row layouts feel visually heavy.

Important constraints:
- User-facing UI text must be Ukrainian.
- Roles remain only `owner` and `user`.
- Do not introduce `admin` wording.
- Do not change core business logic.
- Do not change database schema unless a UI requirement makes it truly necessary.
- Keep feature-oriented onion architecture.
- Do not put business rules into UI components.
- Use existing Tailwind/shadcn/Radix-compatible patterns.
- No new heavy UI framework.
- Do not add object storage or image uploads.
- Keep all required checks passing.

Pages to audit:
- `/`
- `/login`
- `/setup`
- `/dashboard`
- `/dashboard/products`
- `/dashboard/products/new`
- `/dashboard/products/[productId]/edit`
- `/dashboard/orders/new`
- `/dashboard/orders`
- `/dashboard/orders/[orderId]`
- `/o/[token]`
- `/o/[token]/delivery`

Tasks:
1. Inspect the current UI components, layouts, tables, forms, and responsive classes.
2. Use Playwright MCP where available to inspect critical pages at these viewport widths:
   - 360x740
   - 390x844
   - 430x932
   - 768x1024
   - 1440x900
3. Identify horizontal scrolling, cramped layouts, overflowing tables, too-wide forms, tiny tap targets, missing sticky/mobile nav, and weak visual hierarchy.
4. Create `docs/ui/mobile-form-table-guidelines.md` with:
   - mobile-first layout principles;
   - form stepper principles;
   - table-to-card responsive rules;
   - dashboard navigation behavior;
   - spacing and typography rules;
   - accessibility requirements;
   - exact pages to refactor;
   - testing checklist.
5. Update `spec.md` with the new UI refactor milestone and known issues.
6. Do not implement UI changes yet except tiny documentation-safe fixes if absolutely needed.
7. Run existing checks if feasible.
8. Commit documentation and audit notes.

Acceptance criteria:
- `docs/ui/mobile-form-table-guidelines.md` exists.
- `spec.md` contains a UI/mobile refactor milestone.
- The plan lists concrete changes page-by-page.
- No business logic is changed.

Required checks:
```bash
pnpm lint
pnpm typecheck
pnpm test:coverage
pnpm build
```

Commit message:
`Document mobile UI refactor plan`
````

---

================================================================================
PROMPT 01 - mobile-first shell, navigation, and page containers
================================================================================

````text
Read AGENTS.md, spec.md, DEPLOYMENT.md, docs/adr/0001-architecture.md, and docs/ui/mobile-form-table-guidelines.md first.

Goal:
Make the global shell and owner dashboard layout mobile-first.

Important constraints:
- User-facing UI text must be Ukrainian.
- Do not change auth/business logic.
- Do not break production auth redirects.
- Do not use Next Link for logout if the current fix intentionally uses a plain anchor or form.
- Keep owner/user roles only.

Tasks:
1. Refactor the owner dashboard layout to work well at 360px width.
2. Replace the fixed desktop sidebar experience on mobile with a mobile-friendly navigation pattern:
   - top header or compact mobile nav;
   - visible current section label;
   - no horizontal overflow;
   - tap targets at least 44px high where practical;
   - logout remains reliable.
3. Keep desktop sidebar if it works well on larger screens, but improve spacing and active/current states.
4. Create shared layout primitives if useful:
   - `PageShell`
   - `PageHeader`
   - `ResponsiveStack`
   - `MobileSectionNav`
   - `ActionBar`
   Keep these in shared UI only if they are truly reusable.
5. Ensure public pages `/`, `/login`, `/setup`, `/o/[token]`, `/o/[token]/delivery` have mobile-safe containers and typography.
6. Ensure no page uses fixed widths that overflow mobile screens.
7. Add or update tests for:
   - Ukrainian dashboard navigation labels;
   - mobile nav renders at small viewport;
   - logout UI still points to the correct route and does not use problematic client-side RSC navigation;
   - public pages have no horizontal overflow at mobile width.
8. Add Playwright mobile checks for dashboard shell and public pages.
9. Use Playwright MCP to inspect `/dashboard`, `/dashboard/products`, and `/o/[token]` at mobile viewport if available.
10. Update `spec.md` and `docs/ui/mobile-form-table-guidelines.md` with implemented shell changes.

Acceptance criteria:
- `/dashboard` is usable at 360px without horizontal scrolling.
- Mobile nav is clear and Ukrainian.
- Desktop dashboard remains usable.
- Logout remains reliable.
- No business logic changed.

Required checks:
```bash
pnpm lint
pnpm typecheck
pnpm test:coverage
pnpm test:e2e
pnpm build
```

Commit message:
`Improve mobile dashboard shell`
````

---

================================================================================
PROMPT 02 - reusable multi-step form foundation
================================================================================

````text
Read AGENTS.md, spec.md, DEPLOYMENT.md, docs/adr/0001-architecture.md, and docs/ui/mobile-form-table-guidelines.md first.

Goal:
Create a reusable, accessible multi-step form foundation for large forms.

Current issue:
Large forms are too long and overwhelming. They should be split into clear steps with progress, back/next controls, and per-step validation.

Important constraints:
- User-facing UI text must be Ukrainian.
- Do not submit partial data to the server unless the existing business flow explicitly supports it.
- Keep final submit behavior compatible with existing server actions.
- Do not move domain/business rules into UI components.
- Keep React Hook Form + Zod where currently used.

Tasks:
1. Create reusable UI primitives for multi-step forms, for example:
   - `Stepper`
   - `StepIndicator`
   - `StepActions`
   - `StepCard`
   - `FormSummaryCard`
2. Add a small form-step utility that supports:
   - current step index;
   - next/back;
   - validating only fields for the current step;
   - preventing final submit until all required fields are valid;
   - preserving form state when navigating between steps.
3. Keep these utilities generic and UI-focused.
4. Do not introduce new global state libraries.
5. Add accessibility behavior:
   - current step announced through `aria-current` or similar;
   - errors announced through live regions;
   - focus moves to step heading or first invalid field after next/submit;
   - buttons have clear Ukrainian labels.
6. Add unit/component tests for the stepper behavior.
7. Add example test-only/demo usage if useful, but do not leave unused production code.
8. Update docs with how feature forms should adopt the stepper.

Suggested Ukrainian copy:
- `Крок {current} з {total}`
- `Назад`
- `Далі`
- `Перевірити`
- `Завершити`
- `Заповніть обов’язкові поля цього кроку`

Acceptance criteria:
- A reusable multi-step foundation exists.
- It is accessible and tested.
- No current forms are broken.
- No business logic changed.

Required checks:
```bash
pnpm lint
pnpm typecheck
pnpm test:coverage
pnpm build
```

Commit message:
`Add multi step form foundation`
````

---

================================================================================
PROMPT 03 - split product forms into mobile-friendly steps
================================================================================

````text
Read AGENTS.md, spec.md, DEPLOYMENT.md, docs/adr/0001-architecture.md, and docs/ui/mobile-form-table-guidelines.md first.

Goal:
Refactor product create/edit forms into a mobile-friendly multi-step flow.

Pages:
- `/dashboard/products/new`
- `/dashboard/products/[productId]/edit`

Important constraints:
- User-facing UI text must be Ukrainian.
- Product images remain external URLs only.
- Do not add file uploads or object storage.
- Keep existing product validation and server actions.
- Do not change product business logic.

Suggested steps:
1. `Основне`
   - product name;
   - SKU;
   - description;
   - active status if already present.
2. `Ціна та залишок`
   - price;
   - stock quantity;
   - currency if exposed.
3. `Зображення`
   - one or more image URLs;
   - image preview;
   - URL validation copy.
4. `Перевірка`
   - compact summary of all entered values;
   - final submit button.

Tasks:
1. Refactor product form UI to use the reusable stepper.
2. Validate only relevant fields when clicking `Далі`.
3. Preserve entered values when moving between steps.
4. Keep final submit wired to the existing server action.
5. On desktop, use a nicer layout but still keep step structure.
6. Improve mobile spacing, labels, error messages, and tap targets.
7. Ensure image preview does not overflow mobile screens.
8. Add tests for:
   - step navigation;
   - per-step validation;
   - final summary;
   - create flow still calls the expected action;
   - edit flow preloads existing values;
   - Ukrainian labels.
9. Update Playwright e2e for product creation to use the new multi-step flow.
10. Use Playwright MCP to inspect product create/edit pages at mobile viewport if available.
11. Update `spec.md` and UI docs.

Acceptance criteria:
- Product forms are usable on 360px screens.
- Long product form is split into clear steps.
- Existing product create/edit behavior still works.
- Tests updated and passing.

Required checks:
```bash
pnpm lint
pnpm typecheck
pnpm test:coverage
pnpm test:e2e
pnpm build
```

Commit message:
`Split product forms into steps`
````

---

================================================================================
PROMPT 04 - split owner order builder into steps
================================================================================

````text
Read AGENTS.md, spec.md, DEPLOYMENT.md, docs/adr/0001-architecture.md, and docs/ui/mobile-form-table-guidelines.md first.

Goal:
Refactor the owner order builder into a clear multi-step flow.

Page:
- `/dashboard/orders/new`

Current issue:
The order builder can become visually dense when selecting multiple products and quantities, especially on mobile.

Important constraints:
- User-facing UI text must be Ukrainian.
- Do not change order creation business logic.
- Do not expose internal order ids in public URLs.
- Keep product snapshots and secure public token behavior unchanged.

Suggested steps:
1. `Вибір товарів`
   - searchable/selectable product list;
   - mobile-friendly product cards;
   - active products only.
2. `Кількість`
   - selected products only;
   - quantity controls;
   - line totals.
3. `Перевірка`
   - compact order summary;
   - total amount;
   - create link button.
4. `Посилання`
   - generated public link;
   - copy action;
   - quick open action if appropriate.

Tasks:
1. Refactor order builder UI into steps.
2. Use mobile cards for product selection.
3. Avoid giant tables on mobile.
4. Keep desktop layout efficient but less visually overloaded.
5. Improve quantity controls for touch devices:
   - clear input;
   - optional plus/minus buttons if simple;
   - validation messages.
6. Keep server action and use case unchanged unless wiring requires minor adaptation.
7. Add tests for:
   - product selection step;
   - quantity validation;
   - summary step;
   - public link generation display;
   - Ukrainian labels.
8. Update Playwright e2e for owner order link creation.
9. Use Playwright MCP at 390px mobile and desktop if available.
10. Update `spec.md` and UI docs.

Acceptance criteria:
- Order builder is usable on mobile.
- Owner can create an order link with multiple products without horizontal scroll.
- Generated link flow remains intact.
- Existing order creation tests still pass.

Required checks:
```bash
pnpm lint
pnpm typecheck
pnpm test:coverage
pnpm test:e2e
pnpm build
```

Commit message:
`Split order builder into steps`
````

---

================================================================================
PROMPT 05 - split customer delivery and payment form into steps
================================================================================

````text
Read AGENTS.md, spec.md, DEPLOYMENT.md, docs/adr/0001-architecture.md, and docs/ui/mobile-form-table-guidelines.md first.

Goal:
Refactor the public customer delivery/payment form into a mobile-first multi-step checkout-like flow.

Page:
- `/o/[token]/delivery`

Important constraints:
- User-facing UI text must be Ukrainian.
- Public customer does not need to log in.
- Do not change payment/shipment business logic unless required by UI wiring.
- Do not reintroduce Ukrposhta if it was removed from active MVP.
- Active MVP shipping carrier should be Nova Post / Nova Poshta only unless the current code still intentionally supports more.
- Keep final submit wired to existing confirmation/payment action.

Suggested steps:
1. `Контакти`
   - full name;
   - phone.
2. `Доставка`
   - active carrier selection;
   - city search;
   - warehouse/branch search;
   - selected delivery summary.
3. `Оплата`
   - MonoPay;
   - cash on delivery;
   - clear short explanation for each method.
4. `Перевірка`
   - customer info summary;
   - delivery summary;
   - payment summary;
   - final confirm button.

Tasks:
1. Refactor `DeliveryForm` into steps using the reusable stepper.
2. Keep carrier/city/warehouse lookup behavior stable.
3. Make city and warehouse search results mobile-friendly:
   - no cramped dropdowns;
   - clear selected state;
   - easy reset/change action.
4. Add loading/empty/error states per step in Ukrainian.
5. After final submit:
   - if MonoPay redirect URL exists, redirect as before;
   - if cash on delivery, show confirmation as before.
6. Avoid accidental double submit.
7. Add tests for:
   - step navigation;
   - contact validation;
   - city/warehouse selection;
   - payment method step;
   - final review;
   - MonoPay redirect still works;
   - cash on delivery confirmation still works;
   - mobile no horizontal overflow.
8. Update Playwright customer delivery e2e to use the step flow.
9. Use Playwright MCP to inspect public delivery flow at 360/390px if available.
10. Update `spec.md` and UI docs.

Acceptance criteria:
- Public customer delivery/payment form is comfortable on mobile.
- Long form is split into understandable steps.
- Existing confirmation/payment behavior remains intact.
- No public auth requirement introduced.

Required checks:
```bash
pnpm lint
pnpm typecheck
pnpm test:coverage
pnpm test:e2e
pnpm build
```

Commit message:
`Split delivery form into steps`
````

---

================================================================================
PROMPT 06 - simplify product and order tables with responsive card views
================================================================================

````text
Read AGENTS.md, spec.md, DEPLOYMENT.md, docs/adr/0001-architecture.md, and docs/ui/mobile-form-table-guidelines.md first.

Goal:
Make product and order lists less cluttered and mobile-friendly.

Pages:
- `/dashboard/products`
- `/dashboard/orders`

Current issue:
Table rows are visually clumsy and overloaded with too much information. On mobile, tables are hard to use.

Important constraints:
- User-facing UI text must be Ukrainian.
- Do not remove important functionality.
- Do not change business logic or filters.
- Keep owner-only access.

Tasks for desktop tables:
1. Reduce visible columns to the most important data.
2. Use visual hierarchy:
   - primary title;
   - secondary metadata;
   - compact badges;
   - actions grouped at the end.
3. Avoid repeating too much information in every cell.
4. Use truncation and tooltips/details only if accessible.
5. Prefer status badges over long text blocks.
6. Move secondary actions into a compact action area or dropdown if existing UI supports it.

Tasks for mobile:
1. Replace tables with responsive cards/list rows below an appropriate breakpoint.
2. Each mobile card should show:
   - main title;
   - status badge;
   - key amount/date/customer info;
   - one primary action;
   - optional secondary details collapsed or in metadata rows.
3. No horizontal scroll.
4. Tap targets should be comfortable.

Product list card content:
- name;
- SKU;
- price;
- stock;
- active/inactive badge;
- edit action;
- active toggle action if present.

Order list card content:
- order short id or display id;
- customer name/phone if available;
- status badge;
- total amount;
- date;
- key tags;
- details action.

Tests:
1. Component tests for desktop table visible hierarchy.
2. Component tests for mobile card rendering.
3. Playwright tests for `/dashboard/products` and `/dashboard/orders` at 390px and desktop.
4. Tests should assert important Ukrainian labels and no horizontal overflow.
5. Existing filters and actions must still work.

Update:
- `spec.md`
- `docs/ui/mobile-form-table-guidelines.md`

Acceptance criteria:
- Product and order lists look clean on desktop.
- Product and order lists become cards on mobile.
- No table overflows at 360px.
- Existing owner actions still work.

Required checks:
```bash
pnpm lint
pnpm typecheck
pnpm test:coverage
pnpm test:e2e
pnpm build
```

Commit message:
`Simplify responsive data tables`
````

---

================================================================================
PROMPT 07 - simplify order details with sections and collapsible mobile layout
================================================================================

````text
Read AGENTS.md, spec.md, DEPLOYMENT.md, docs/adr/0001-architecture.md, and docs/ui/mobile-form-table-guidelines.md first.

Goal:
Make the owner order details page easier to scan on mobile and desktop.

Page:
- `/dashboard/orders/[orderId]`

Current issue:
Order details can become overloaded with products, customer info, delivery info, payment info, shipment info, tags, status history, audit events, manual status controls, payment retry, and shipment retry.

Important constraints:
- User-facing UI text must be Ukrainian.
- Do not change order/payment/shipment business logic.
- Do not hide critical owner actions completely.
- Keep audit information accessible.

Tasks:
1. Split order details into clear sections:
   - `Огляд`
   - `Товари`
   - `Клієнт`
   - `Доставка`
   - `Оплата`
   - `Теги`
   - `Історія статусів`
   - `Аудит`
2. On mobile, use collapsible sections or stacked cards.
3. On desktop, use a two-column layout if it improves readability:
   - main content: products and timeline;
   - side panel: customer, delivery, payment, actions.
4. Make primary actions easy to find:
   - retry MonoPay payment if available;
   - retry shipment if available;
   - manual status update;
   - tag assignment/removal.
5. Make audit events compact and readable.
6. Avoid huge dense tables inside the details page.
7. Add tests for:
   - sections render with Ukrainian headings;
   - mobile layout renders collapsible/stacked sections;
   - payment retry action remains available when eligible;
   - shipment retry action remains available when eligible;
   - manual status update still works;
   - audit events are still visible.
8. Add Playwright mobile test for order details page.
9. Use Playwright MCP to inspect details page at 390px and desktop if available.
10. Update `spec.md` and UI docs.

Acceptance criteria:
- Order details page is readable at 360px.
- Important actions remain accessible.
- Audit/status history remains available but not visually overwhelming.
- Existing tests still pass.

Required checks:
```bash
pnpm lint
pnpm typecheck
pnpm test:coverage
pnpm test:e2e
pnpm build
```

Commit message:
`Simplify order details layout`
````

---

================================================================================
PROMPT 08 - improve filters, empty states, and action feedback
================================================================================

````text
Read AGENTS.md, spec.md, DEPLOYMENT.md, docs/adr/0001-architecture.md, and docs/ui/mobile-form-table-guidelines.md first.

Goal:
Improve filtering UI, empty states, loading states, and action feedback across dashboard pages.

Pages:
- `/dashboard/products`
- `/dashboard/orders`
- `/dashboard/orders/[orderId]`
- `/dashboard/orders/new`

Important constraints:
- User-facing UI text must be Ukrainian.
- Do not change business logic.
- Keep filters functional.
- Keep mobile-first behavior.

Tasks:
1. Refactor dense filter forms into mobile-friendly filter panels:
   - collapsed by default on mobile;
   - visible summary of active filters;
   - clear filters action;
   - accessible labels.
2. Improve empty states:
   - no products;
   - no orders;
   - no filtered results;
   - no tags;
   - no audit events;
   - no shipments/payments yet.
3. Improve action feedback:
   - successful tag update;
   - failed tag update;
   - successful manual status update;
   - failed status update;
   - retry payment/shipment feedback.
4. Ensure feedback uses live regions where appropriate.
5. Add or improve skeleton/loading states only if they fit the app. Do not add unnecessary complexity.
6. Add tests for:
   - filter panel mobile behavior;
   - active filter summary;
   - clear filters;
   - Ukrainian empty states;
   - action feedback messages.
7. Update Playwright e2e for owner order filters if UI changed.
8. Update `spec.md` and UI docs.

Acceptance criteria:
- Filters are not visually overwhelming on mobile.
- Empty states are useful and Ukrainian.
- Owner actions give clear feedback.
- Existing filters remain functional.

Required checks:
```bash
pnpm lint
pnpm typecheck
pnpm test:coverage
pnpm test:e2e
pnpm build
```

Commit message:
`Improve dashboard filters and feedback`
````

---

================================================================================
PROMPT 09 - final responsive QA and UI polish
================================================================================

````text
Read AGENTS.md, spec.md, DEPLOYMENT.md, docs/adr/0001-architecture.md, and docs/ui/mobile-form-table-guidelines.md first.

Goal:
Perform final responsive QA and polish after the mobile/form/table refactor.

Important constraints:
- User-facing UI text must be Ukrainian.
- Do not add new features.
- Do not change business logic.
- Fix UI regressions found during QA.

Pages to verify:
- `/`
- `/login`
- `/setup`
- `/dashboard`
- `/dashboard/products`
- `/dashboard/products/new`
- `/dashboard/products/[productId]/edit`
- `/dashboard/orders/new`
- `/dashboard/orders`
- `/dashboard/orders/[orderId]`
- `/o/[token]`
- `/o/[token]/delivery`

Viewport matrix:
- 360x740
- 390x844
- 430x932
- 768x1024
- 1024x768
- 1440x900

Tasks:
1. Use Playwright MCP to inspect critical flows if available.
2. Add or update Playwright tests to cover:
   - mobile public order review;
   - mobile customer delivery steps;
   - mobile product creation steps;
   - mobile owner order builder steps;
   - mobile product list card view;
   - mobile order list card view;
   - mobile order details sections;
   - desktop dashboard still works.
3. Add a no-horizontal-overflow assertion helper and apply it to critical pages.
4. Verify keyboard navigation:
   - skip link;
   - mobile nav;
   - stepper controls;
   - filter panels;
   - action buttons.
5. Verify focus states and aria labels.
6. Verify loading, empty, error, and success states.
7. Review visual density:
   - spacing;
   - typography;
   - badge usage;
   - table/card hierarchy;
   - action placement.
8. Update `spec.md` with final UI QA status.
9. Update `docs/ui/mobile-form-table-guidelines.md` with final implemented patterns.
10. Run all required checks.
11. Commit after checks pass.

Acceptance criteria:
- Critical pages have no horizontal overflow at 360px.
- Forms are step-based where appropriate.
- Tables become cards on mobile.
- Desktop layouts remain readable.
- Keyboard and screen reader basics are preserved.
- All checks pass.

Required checks:
```bash
pnpm lint
pnpm typecheck
pnpm test:coverage
pnpm test:e2e
pnpm build
```

Commit message:
`Polish responsive user interface`
````

---

================================================================================
PROMPT 10 - recovery prompt
================================================================================

````text
Read AGENTS.md, spec.md, DEPLOYMENT.md, docs/adr/0001-architecture.md, and docs/ui/mobile-form-table-guidelines.md first.

Goal:
Recover from a failed UI/mobile refactor step without weakening quality gates.

Use this prompt when:
- lint fails;
- typecheck fails;
- coverage falls below 80%;
- e2e fails;
- build fails;
- mobile UI regresses;
- auth/navigation breaks after UI changes;
- forms stop submitting correctly;
- tables/cards lose functionality.

Rules:
- Do not skip failing tests.
- Do not reduce coverage thresholds.
- Do not delete meaningful tests to pass checks.
- Do not hide UI bugs by weakening assertions.
- Do not change business logic unless the failure proves a real integration bug.
- Keep all user-facing copy Ukrainian.
- Keep roles only `owner` and `user`.

Tasks:
1. Identify the exact failing command and failure reason.
2. Inspect recent changes related to the failure.
3. Fix the smallest possible area.
4. If a Playwright test fails, inspect the trace or use Playwright MCP to reproduce the page state.
5. If a mobile overflow test fails, find the element causing overflow and fix layout/classes/components.
6. If a form step test fails, verify field registration, step validation, final submit, and server action wiring.
7. If auth/navigation breaks, verify logout/login fixes were not reverted and Next Link is not used for route-handler logout.
8. Update tests only when behavior intentionally changed and the new assertion is stronger or equally strong.
9. Run the failed command again.
10. Then run the full required check suite.
11. Update `spec.md` if the recovery changed behavior.
12. Commit only after checks pass.

Required checks:
```bash
pnpm lint
pnpm typecheck
pnpm test:coverage
pnpm test:e2e
pnpm build
```

Commit message examples:
- `Fix mobile form step validation`
- `Fix responsive order card overflow`
- `Fix dashboard mobile navigation`
- `Fix table card test regression`
````

---

## Рекомендований порядок запуску

```txt
1. PROMPT 00 - audit and plan
2. PROMPT 01 - dashboard shell and navigation
3. PROMPT 02 - stepper foundation
4. PROMPT 03 - product forms
5. PROMPT 04 - order builder
6. PROMPT 05 - customer delivery/payment form
7. PROMPT 06 - product/order tables and mobile cards
8. PROMPT 07 - order details page
9. PROMPT 08 - filters, empty states, feedback
10. PROMPT 09 - final responsive QA
11. PROMPT 10 - only when something fails
```

