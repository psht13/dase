# Dase prompts - functional order/payment updates and desktop UI polish v1

Цей файл містить набір промптів для Codex, щоб виправити поточні функціональні та UI-проблеми після mobile-first рефакторингу.

## Основні цілі

Функціонально:
- Після підтвердження замовлення покупець не повинен повторно вводити дані по тому самому посиланню.
- Публічна сторінка замовлення після підтвердження має показувати номер замовлення, поточний статус і зрозуміле повідомлення, що замовлення обробляється або очікує оплату.
- У формі покупця потрібно додати Instagram нікнейм.
- Owner має бачити Instagram нікнейм у замовленні.
- Owner має мати пошук замовлення за ID / коротким номером.
- MonoPay / Monobank прибрати з активного customer flow.
- Замість MonoPay додати варіант `Оплата картою онлайн`, який показує покупцю картки / реквізити власника і просить надіслати квитанцію в Instagram чат.
- Owner має мати налаштування карток / реквізитів, які показуються покупцю.

UI:
- Зберегти хороший mobile UX, але відновити якісний desktop layout.
- Виправити дивне розташування кнопок у формах, деталях замовлення, таблицях і публічних сторінках.
- Кнопки в межах одного екрану мають мати стабільну висоту, зрозумілу ширину і гарне вирівнювання.
- Таблиці та списки не мають бути перевантажені інформацією.
- Step forms мають виглядати добре і на мобільному, і на desktop.

## Постійні правила для всіх промптів

- Read `AGENTS.md`, `spec.md`, `DEPLOYMENT.md`, and `docs/adr/0001-architecture.md` before changing code.
- Keep all user-facing UI copy Ukrainian.
- Do not create or use `admin` role.
- Allowed roles remain only `owner` and `user`.
- Do not add S3/object storage.
- Do not call live external APIs in automated tests.
- Do not commit secrets.
- Keep architecture feature-oriented and onion-like.
- Domain/application layers must not import React, Next.js UI, Drizzle, or external API clients.
- Route handlers and server actions should stay thin.
- Every feature must have tests.
- Keep 80%+ coverage.
- Do not weaken tests or coverage thresholds.
- Commit messages must be English imperative sentence case, for example `Add manual card payment settings`.
- Before final response for each prompt, run the required checks listed inside that prompt.

---

================================================================================
PROMPT 00 - audit current order, payment, and responsive UI state
================================================================================

```text
Read AGENTS.md, spec.md, DEPLOYMENT.md, and docs/adr/0001-architecture.md first.

Goal:
Audit the current code before implementing the next round of functional and UI changes.

Context:
The current app works, but there are remaining issues:
- After a customer confirms an order, reopening the same public order link should not allow submitting delivery/customer data again.
- The public order link should show a clear Ukrainian status page after confirmation: order number, current status, and contact seller guidance.
- Customer delivery form needs an Instagram nickname field.
- Owners need to search orders by id / short id.
- MonoPay / Monobank should be removed from the active customer payment flow for now.
- Instead of MonoPay, customer payment option should be `Оплата картою онлайн`.
- `Оплата картою онлайн` is a manual card transfer flow: show owner-configured card/requisite list and tell the customer to send the receipt in Instagram chat.
- Owner should configure visible payment cards/requisites in dashboard settings.
- Mobile got better, but desktop layout now looks too sparse and unbalanced.
- Buttons are inconsistently placed and sized.
- Tables/cards are still too cluttered in some places.

Tasks:
1. Inspect:
   - public order pages under `/o/[token]`;
   - customer delivery/payment form;
   - owner product form;
   - owner order builder;
   - owner orders list;
   - owner order details;
   - dashboard layout;
   - payment modules and payment provider enum;
   - existing Monobank code;
   - shipping/job flow;
   - current migrations.
2. Identify where MonoPay is still active in customer UI, use cases, tests, docs, and env vars.
3. Identify where payment method values are persisted and what migration is needed to add a manual card transfer provider.
4. Identify where customer data is persisted and what migration is needed to add Instagram username.
5. Identify where owner order search currently matches phone/tracking and where to add order id / short id matching.
6. Inspect UI components used for:
   - wizard/step forms;
   - buttons;
   - tables;
   - card lists;
   - page headers;
   - sidebars.
7. Create or update a short audit section in `spec.md`:
   - what is currently active;
   - what must change;
   - migration plan;
   - UI refactor plan;
   - risks.
8. Do not implement the feature changes yet, except very small documentation-only clarifications.
9. Run:
   - pnpm lint
   - pnpm typecheck
10. Commit documentation-only changes if any.

Acceptance criteria:
- `spec.md` clearly lists the planned change from MonoPay to manual card transfer.
- `spec.md` clearly lists the planned public post-confirmation order status behavior.
- `spec.md` clearly lists the desktop UI/layout issues and planned fixes.
- No production behavior changes yet unless absolutely necessary.

Commit message:
Audit payment and responsive UI issues
```

---

================================================================================
PROMPT 01 - public order status after customer confirmation
================================================================================

```text
Read AGENTS.md, spec.md, DEPLOYMENT.md, and docs/adr/0001-architecture.md first.

Goal:
Prevent duplicate customer submission and show a proper public order status page after a customer has already confirmed the order.

Current desired behavior:
1. Customer receives public order link.
2. Before confirmation, `/o/[token]` shows the order review and the button to continue to delivery/payment.
3. Customer opens `/o/[token]/delivery`, fills data, and submits.
4. After successful submit, customer should be sent back to `/o/[token]` or see a final status screen.
5. Reopening `/o/[token]` after submit should show:
   - `Замовлення #<shortOrderId>`;
   - a Ukrainian status label;
   - message like `Ваше замовлення обробляється`;
   - if manual card payment is pending, message like `Очікуємо оплату картою`;
   - instruction: `Якщо маєте питання, зверніться до продавця в чаті`;
   - selected products and total in a compact summary;
   - no ability to submit the delivery form again.
6. Opening `/o/[token]/delivery` after submit should not render the form again. It should redirect to `/o/[token]` or render the same status state.

Implementation details:
1. Add a small display helper:
   - `formatOrderDisplayNumber(orderId: string): string`
   - It can use the first 8 chars of the UUID for now.
   - Show it as `#55e143f7` style.
   - Keep it stable and covered by tests.
2. Update public order lookup/read model to distinguish:
   - unavailable: not found / expired / cancelled;
   - awaiting customer confirmation;
   - already confirmed / payment pending / shipment statuses / completed.
3. Public page variants:
   - `PublicOrderReview` for `SENT_TO_CUSTOMER`;
   - `PublicOrderStatus` for every valid status after customer confirmation.
4. Public delivery page:
   - If order is not `SENT_TO_CUSTOMER`, do not render the form.
   - Redirect or show status page.
   - Do not allow duplicate customer/payment/shipment rows.
5. Ensure `confirmPublicOrderUseCase` still rejects duplicate confirmation.
6. Make customer submit action redirect or return a result that moves the UI to the status page after successful submission.
7. Add Ukrainian status messages for:
   - `CONFIRMED_BY_CUSTOMER`;
   - `PAYMENT_PENDING`;
   - `PAID`;
   - `SHIPMENT_PENDING`;
   - `SHIPMENT_CREATED`;
   - `IN_TRANSIT`;
   - `DELIVERED`;
   - `COMPLETED`;
   - `PAYMENT_FAILED`;
   - `RETURN_REQUESTED`;
   - `RETURNED`;
   - `CANCELLED`.
8. Use a compact public summary layout:
   - product list;
   - total;
   - order number;
   - current status;
   - contact seller instruction.
9. Keep mobile good, but make desktop centered and visually balanced with a sensible max width.

Tests:
- Unit tests for `formatOrderDisplayNumber`.
- Public order lookup tests:
  - `SENT_TO_CUSTOMER` returns review state;
  - `CONFIRMED_BY_CUSTOMER` returns status state;
  - `PAYMENT_PENDING` returns status state;
  - cancelled/expired remain unavailable.
- UI tests for Ukrainian post-confirmation copy.
- E2E:
  - create order link;
  - customer submits details;
  - revisit same public link;
  - assert no delivery form is shown;
  - assert order number and processing/status message are shown.

Run:
pnpm lint
pnpm typecheck
pnpm test:coverage
pnpm test:e2e
pnpm build

Update:
- spec.md
- README.md if it exists or create it if still missing

Commit message:
Add public order status page
```

---

================================================================================
PROMPT 02 - add customer Instagram nickname
================================================================================

```text
Read AGENTS.md, spec.md, DEPLOYMENT.md, and docs/adr/0001-architecture.md first.

Goal:
Add Instagram nickname to customer/order data so sellers can connect an order with Instagram chat history.

Behavior:
- Customer delivery/contact form asks for Instagram nickname.
- Label: `Instagram нікнейм`
- Placeholder examples:
  - `@username`
  - or `username`
- Helper text:
  - `Допоможе продавцю швидше знайти вашу переписку.`
- Make it optional for now, but visible and encouraged.
- Normalize stored value:
  - trim whitespace;
  - remove duplicate leading @;
  - store without spaces;
  - allow only a safe Instagram-like username pattern if provided;
  - preserve one leading `@` in UI display if you choose to display it with @.
- Owner order details should show Instagram nickname in the customer section.
- Owner orders list/cards should show Instagram nickname when present.
- Owner search should also match Instagram nickname, but order id search will be handled in the next prompt if not done yet.

Data model:
1. Add a nullable column to `customers`:
   - `instagram_username`
2. Add a forward-only Drizzle migration.
3. Do not make the migration destructive.
4. Keep existing customers valid.

Code changes:
- Update customer domain/application DTOs.
- Update customer repository interface and implementations.
- Update in-memory test repositories.
- Update customer confirmation use case.
- Update delivery form validation.
- Update delivery form UI.
- Update owner order read model and UI.
- Update public order status page if it displays contact summary.

Tests:
- Validation accepts:
  - `username`
  - `@username`
  - `user.name_123`
- Validation rejects:
  - spaces inside username;
  - overly long username;
  - invalid symbols.
- Confirmation use case persists normalized Instagram username.
- Owner details UI shows Instagram nickname.
- Owner list/card UI shows Instagram nickname.
- E2E customer flow includes Instagram nickname and owner can see it.

Run:
pnpm db:generate
pnpm lint
pnpm typecheck
pnpm test:coverage
pnpm test:e2e
pnpm build

Update:
- spec.md
- README.md / DEPLOYMENT.md if env/migration notes are relevant

Commit message:
Add customer Instagram nickname
```

---

================================================================================
PROMPT 03 - owner payment requisites settings
================================================================================

```text
Read AGENTS.md, spec.md, DEPLOYMENT.md, and docs/adr/0001-architecture.md first.

Goal:
Allow owners to configure card/payment requisites shown to customers for manual online card transfer.

Important:
This is not card processing.
Do not collect customer card data.
Do not ask for CVV, expiry, or any customer payment card information.
The owner is configuring public payment requisites that customers can transfer money to.
Do not log payment requisite values.
Do not expose inactive requisites publicly.

Recommended wording:
- Dashboard nav: `Налаштування`
- Settings page: `Реквізити для оплати`
- Customer payment option: `Оплата картою онлайн`
- Customer instruction:
  `Переказ можна зробити на одну з карток нижче. Після оплати надішліть квитанцію продавцю в Instagram чат.`

Data model:
Create a table such as `payment_requisites`:
- id uuid primary key
- owner_id uuid references users(id)
- label text not null
- recipient_name text nullable
- bank_name text nullable
- display_value text not null
  - can contain a card number, IBAN, or other owner-provided payment details
- note text nullable
- is_active boolean default true not null
- sort_order integer default 0 not null
- created_at timestamp
- updated_at timestamp

Validation:
- `label` required, max 80 chars.
- `display_value` required, max 120 chars.
- `recipient_name`, `bank_name`, `note` optional with reasonable max lengths.
- Do not require strict card-number validation because owners may use IBAN or formatted payment details.
- Add a helper to create a masked display for owner lists:
  - e.g. show last 4 chars if card-like;
  - but public customer view should show the full owner-provided display value because the customer must copy it.

Architecture:
- Add module under `src/modules/payments` or `src/modules/settings`.
- Use repository port in application layer.
- Drizzle repository only in infrastructure.
- UI under dashboard settings.
- Keep Ukrainian UI.

Owner UI:
1. Add dashboard nav item `Налаштування`.
2. Add route `/dashboard/settings/payment`.
3. Owner can:
   - view active and inactive requisites;
   - create new requisite;
   - edit existing requisite;
   - activate/deactivate;
   - reorder if simple, otherwise sort by created date / sort_order.
4. Add copy-to-clipboard for display value if simple.
5. Empty state:
   - `Додайте картку або реквізити, які покупці бачитимуть під час оплати.`
6. Desktop and mobile layouts must both be clean:
   - mobile cards;
   - desktop compact table or cards;
   - consistent action buttons.

Public read model:
- Add use case to list active payment requisites for an owner.
- Public order/payment UI must only show active requisites.
- Do not expose owner email or internal user id.

Tests:
- Payment requisite validation.
- Repository save/list/update/toggle.
- Owner access required.
- User role cannot access settings.
- Public read model returns only active requisites for the order owner.
- UI shows Ukrainian labels.
- E2E:
  - owner creates a payment requisite;
  - public customer payment step can display it when choosing online card payment.

Run:
pnpm db:generate
pnpm lint
pnpm typecheck
pnpm test:coverage
pnpm test:e2e
pnpm build

Update:
- spec.md
- README.md
- DEPLOYMENT.md if needed

Commit message:
Add payment requisite settings
```

---

================================================================================
PROMPT 04 - replace active MonoPay flow with manual card transfer
================================================================================

```text
Read AGENTS.md, spec.md, DEPLOYMENT.md, and docs/adr/0001-architecture.md first.

Goal:
Remove MonoPay / Monobank from the active customer payment flow for now and replace it with manual online card transfer.

Business requirement:
- Payment option shown to customers:
  - `Оплата картою онлайн`
  - `Оплата при отриманні`
- Do not show `MonoPay`, `Monobank`, or `Оплата MonoPay` in active customer UI.
- Do not create Monobank invoices in the customer flow.
- Do not redirect customers to Monobank.
- Do not require Monobank variables for normal production operation.
- Keep Monobank code only as inactive/future integration if removing it entirely would be too risky.
- Existing Monobank tests can either be moved to inactive integration tests or updated to not drive active customer flow.

Recommended internal provider:
- Add `MANUAL_CARD_TRANSFER` as the active online-card payment provider.
- Keep `CASH_ON_DELIVERY`.
- Existing `MONOBANK` enum value can remain for backwards compatibility, but active UI/use cases must not create new Monobank payments.
- If PostgreSQL enum migration is needed, create a forward-only migration:
  - `ALTER TYPE payment_provider ADD VALUE IF NOT EXISTS 'MANUAL_CARD_TRANSFER';`
- Do not attempt to drop `MONOBANK` enum value in PostgreSQL.

Customer flow:
1. Customer selects `Оплата картою онлайн`.
2. Payment step shows owner-configured active payment requisites.
3. Customer sees instruction:
   `Після переказу надішліть квитанцію продавцю в Instagram чат.`
4. On submit:
   - create payment record with provider `MANUAL_CARD_TRANSFER`;
   - payment status `PENDING`;
   - order status should become `PAYMENT_PENDING`;
   - do not enqueue shipment yet.
5. Public order status page after submit:
   - order number;
   - status `Очікуємо оплату`;
   - active payment requisites;
   - instruction to send receipt in Instagram.
6. If no active requisites exist:
   - owner dashboard should show a warning;
   - public customer should not be able to choose online card payment, or should see a clear unavailable message and choose cash on delivery.
7. Cash on delivery behavior remains:
   - payment provider `CASH_ON_DELIVERY`;
   - shipment can be prepared according to existing logic.

Owner flow:
1. Owner order details should show:
   - payment method `Оплата картою онлайн`;
   - payment status `Очікує підтвердження`;
   - Instagram nickname if present.
2. Add owner action:
   - `Позначити оплату отриманою`
3. When owner marks manual card transfer as paid:
   - payment status becomes `PAID`;
   - order status transitions through valid path to `PAID`;
   - enqueue shipment creation if shipment exists and shipping mode allows it;
   - append audit event `MANUAL_PAYMENT_MARKED_PAID` or similar.
4. Add owner action for payment failed/cancelled only if simple and useful. Otherwise leave for later.

Code changes:
- Update payment provider domain types.
- Update delivery form payment options.
- Update delivery form review step.
- Update public order status page.
- Update customer confirmation use case.
- Update payment status labels.
- Update owner order details.
- Update owner order filters if payment method filter exists.
- Update tests and fixtures.
- Remove active Monobank env dependency from customer flow.
- Keep `/api/webhooks/monobank` if you do not delete Monobank integration, but it should not be part of current active flow.
- Update docs to say Monobank is inactive/future.

Tests:
- Customer can choose online card payment and sees requisites.
- Customer submit with online card creates manual payment and no Monobank invoice.
- Public link after submit shows `Очікуємо оплату` and no duplicate form.
- Owner marks manual card payment as paid.
- Marking manual card payment paid writes audit event.
- Shipment is enqueued only after manual payment is marked paid.
- Cash on delivery still works.
- No active customer UI contains `MonoPay` or `Monobank`.
- E2E covers online card flow with configured requisite.
- E2E covers no duplicate customer submission after submit.

Run:
pnpm db:generate
pnpm lint
pnpm typecheck
pnpm test:coverage
pnpm test:e2e
pnpm build

Update:
- spec.md
- README.md
- DEPLOYMENT.md
- .env.example
Remove Monobank from required active production env docs, but keep a clearly marked future/inactive section if the integration remains in code.

Commit message:
Replace MonoPay with manual card transfer
```

---

================================================================================
PROMPT 05 - owner order search by id and better owner summaries
================================================================================

```text
Read AGENTS.md, spec.md, DEPLOYMENT.md, and docs/adr/0001-architecture.md first.

Goal:
Improve owner order search and summaries.

Functional requirements:
- Owner can search orders by:
  - full order UUID;
  - short order id / display number, e.g. first 8 chars;
  - customer phone;
  - tracking number;
  - Instagram nickname;
  - customer full name if already available.
- Search input placeholder:
  `ID, Instagram, телефон або ТТН`
- Owner list/cards and order details should show the same display order number as the public page.
- Order details header should show:
  - `Замовлення #55e143f7`
  - status label;
  - customer name or `Клієнт ще не вказаний`;
  - Instagram nickname if present.

Implementation:
1. Reuse `formatOrderDisplayNumber`.
2. Update owner order read model search matcher.
3. Include customer full name and instagram in search.
4. Ensure search is case-insensitive and ignores leading @ for Instagram.
5. Add tests:
   - search by full id;
   - search by short id;
   - search by Instagram with and without @;
   - search by phone;
   - search by tracking.
6. Update owner orders filter form.
7. Update empty state:
   - `За цим пошуком замовлень не знайдено`
8. Keep tables/cards visually lighter:
   - primary line: order number, status, total;
   - secondary line: customer, Instagram, date;
   - tertiary/action area: compact actions.

UI:
- Desktop:
  - search/filter bar should be one balanced row or clean two-row layout.
  - Do not overfill table rows.
- Mobile:
  - use cards with compact metadata.
- All actions should use consistent button sizes.

Run:
pnpm lint
pnpm typecheck
pnpm test:coverage
pnpm test:e2e
pnpm build

Update:
- spec.md

Commit message:
Improve owner order search
```

---

================================================================================
PROMPT 06 - restore high-quality desktop layouts for wizard forms
================================================================================

```text
Read AGENTS.md, spec.md, DEPLOYMENT.md, and docs/adr/0001-architecture.md first.

Goal:
Keep the improved mobile UX, but fix desktop layout regressions in multi-step forms.

Problems to address:
- Product form desktop layout is too sparse and unbalanced.
- Customer delivery form step cards are too large on mobile and awkward on desktop.
- Stepper/sidebar consumes too much space or creates odd empty areas.
- Buttons are placed inconsistently.
- Desktop should look intentional, not like stretched mobile UI.

Create or refactor reusable layout components:
- `WizardPageLayout`
- `WizardStepper`
- `WizardStepCard`
- `WizardActions`
- or similarly named components under shared UI.

Responsive behavior:
Mobile:
- one column;
- compact vertical stepper;
- full-width primary action button;
- secondary action below or beside it depending on space.

Tablet:
- one or two columns depending on form complexity;
- compact stepper above form.

Desktop:
- max content width should be intentional, e.g. 960-1180px depending on page.
- product form:
  - either 2-column form layout inside the active step;
  - or left stepper + right card, but widths must be balanced.
- delivery form:
  - stepper can be horizontal/compact at top or left rail only if it does not dominate.
- order builder:
  - selection list and summary can use a balanced grid.
- large empty white space should be avoided.

Specific UI requirements:
1. Stepper labels should use `Крок 1 із 4`, not `Крок 1 з 4` if you want grammatical consistency. Pick one and use it everywhere.
2. Stepper cards on mobile should be smaller than current screenshot:
   - avoid huge vertical padding;
   - reduce icon circle size where appropriate.
3. Desktop stepper should not look like four oversized cards unless the page has enough space.
4. Current active step should be clear but not visually heavy.
5. `Назад`, `Далі`, `Скасувати`, `Зберегти`, `Створити` buttons should be in a consistent actions footer.
6. On desktop, action footer should usually align to the right inside the form container.
7. On mobile, action buttons should be full-width and stacked in logical order:
   - primary first or bottom sticky if implemented;
   - secondary below.
8. Do not introduce fixed pixel widths that break 320px mobile screens.
9. Avoid horizontal overflow.

Apply to:
- product create/edit form;
- owner order builder;
- public customer delivery/payment form;
- any other multi-step form introduced recently.

Tests:
- Component tests for stepper current state and buttons.
- E2E responsive screenshots or viewport checks:
  - 390x844 mobile;
  - 768x1024 tablet;
  - 1440x900 desktop.
- Assert no horizontal overflow on public delivery, product form, order builder.
- Assert important Ukrainian labels are visible in each viewport.

Run:
pnpm lint
pnpm typecheck
pnpm test:coverage
pnpm test:e2e
pnpm build

Update:
- spec.md with UI verification notes.

Commit message:
Improve desktop wizard layouts
```

---

================================================================================
PROMPT 07 - standardize button placement and sizing
================================================================================

```text
Read AGENTS.md, spec.md, DEPLOYMENT.md, and docs/adr/0001-architecture.md first.

Goal:
Standardize button placement, sizing, and alignment across the app.

Current issues:
- Buttons sometimes appear in strange places.
- Button sizes depend too much on text content.
- Buttons on the same screen can have inconsistent widths/heights.
- Desktop and mobile action placement is inconsistent.

Create shared UI patterns:
1. `ActionBar` or `FormActions`
   - handles primary/secondary/destructive actions.
   - desktop: right-aligned row by default.
   - mobile: full-width stacked buttons.
   - supports `sticky` only if it improves UX and does not hide content.
2. Button size rules:
   - same height for buttons in the same action group;
   - sensible min-width on desktop;
   - full-width on mobile where appropriate;
   - icon + text spacing consistent.
3. Do not make every button globally full-width.
4. Do not force table row action buttons to huge widths.
5. Ensure disabled buttons look disabled but still readable.
6. Ensure loading states do not change button width drastically.
   - For example, reserve width or use same label length strategy.
7. Ensure destructive actions are visually distinct but not overbearing.

Apply to:
- home page CTA;
- setup/login forms;
- product create/edit wizard;
- order builder wizard;
- customer delivery/payment wizard;
- owner order details:
  - status update;
  - payment mark paid;
  - shipment retry;
  - public page link;
  - back buttons;
- owner payment settings;
- owner list filters/actions;
- public order status/review page.

Important home page fix:
- The CTA `Перейти до налаштування` must be a real link/button action.
- If no owner exists, it should lead to `/setup`.
- If owner exists, it can lead to `/login` or `/dashboard` depending on session if easy to determine.
- Do not leave non-functional CTA buttons.

Tests:
- Unit/component tests for ActionBar/FormActions responsive class behavior if practical.
- UI tests ensuring home CTA has a link target.
- E2E checks:
  - product form buttons aligned on desktop;
  - delivery form buttons full-width and ordered on mobile;
  - order details action group does not overflow.
- Visual/DOM assertions for no duplicate awkward back buttons on the same public screen.

Run:
pnpm lint
pnpm typecheck
pnpm test:coverage
pnpm test:e2e
pnpm build

Update:
- spec.md
- README.md if UX docs are useful

Commit message:
Standardize action buttons
```

---

================================================================================
PROMPT 08 - declutter tables, cards, and owner order details
================================================================================

```text
Read AGENTS.md, spec.md, DEPLOYMENT.md, and docs/adr/0001-architecture.md first.

Goal:
Make owner tables, cards, and order details cleaner and easier to scan.

Problems:
- Table rows look cluttered.
- Too much metadata is visible at once.
- Desktop order details can feel overly spread out.
- Mobile details need sections, but desktop needs compact, balanced panels.

Requirements for owner order list:
1. Desktop:
   - Use a compact table or card-table hybrid.
   - Each row should have:
     - order number;
     - status badge;
     - customer/Instagram;
     - payment method/status;
     - delivery status/tracking if available;
     - total;
     - date;
     - one primary action.
   - Hide secondary details behind details page, tooltip, or secondary text.
2. Mobile:
   - Use cards.
   - Show only:
     - order number;
     - status;
     - customer/Instagram;
     - total;
     - payment/delivery summary;
     - action button.
3. Use consistent status badges.
4. Use consistent empty states and loading/skeletons if already present.
5. Avoid rows with multiple competing buttons.
6. Search/filter controls should not visually dominate the page.

Requirements for product list:
1. Desktop table:
   - product name + sku;
   - price;
   - stock;
   - active status;
   - compact actions.
2. Mobile cards:
   - name, sku, price, stock, active badge;
   - edit/toggle action.
3. Do not over-show image URLs in table rows.

Requirements for order details:
1. Header:
   - order number;
   - status;
   - customer/Instagram if available;
   - primary action area.
2. Main content:
   - products;
   - payment;
   - delivery;
   - customer;
   - audit/status history.
3. Desktop:
   - balanced 2-column layout;
   - primary content wider than side panels.
4. Mobile:
   - collapsible/accordion sections or stacked cards;
   - important status/payment info first.
5. Payment manual card transfer action should be easy to find:
   - `Позначити оплату отриманою`.
6. Do not show huge empty panels.

Tests:
- UI tests for owner order list simplified labels.
- UI tests for order details with and without customer data.
- E2E:
  - owner can search by short id;
  - owner opens order details;
  - order details has no horizontal overflow on mobile;
  - desktop viewport shows primary panels correctly.

Run:
pnpm lint
pnpm typecheck
pnpm test:coverage
pnpm test:e2e
pnpm build

Update:
- spec.md with UI polish status.

Commit message:
Declutter owner order views
```

---

================================================================================
PROMPT 09 - final QA, production smoke, and docs
================================================================================

```text
Read AGENTS.md, spec.md, DEPLOYMENT.md, and docs/adr/0001-architecture.md first.

Goal:
Final verification after functional payment/order changes and responsive UI cleanup.

Functional checklist:
1. Public order before confirmation:
   - shows products and total;
   - allows going to delivery/payment.
2. Public delivery/payment:
   - asks for full name, phone, Instagram nickname, Nova Post delivery, payment method.
3. Online card payment:
   - shows active owner payment requisites;
   - no MonoPay or Monobank text appears in active customer UI;
   - tells customer to send receipt in Instagram chat.
4. Submit:
   - saves customer data and Instagram nickname;
   - creates manual card payment if selected;
   - shows public status page;
   - does not allow duplicate submit.
5. Reopen public link:
   - shows order number and status;
   - no duplicate form.
6. Owner:
   - searches by short order id;
   - sees Instagram nickname;
   - sees manual card payment status;
   - can mark payment as received;
   - sees audit event.
7. Cash on delivery still works.
8. No live external API calls in tests.
9. Monobank/MonoPay is inactive in active customer flow.

UI checklist:
1. Mobile 390x844:
   - no horizontal overflow;
   - forms readable;
   - buttons full-width where appropriate;
   - no duplicate weird back buttons.
2. Tablet 768x1024:
   - layouts balanced.
3. Desktop 1440x900:
   - forms not overly stretched or sparse;
   - stepper proportional;
   - buttons aligned consistently;
   - tables/cards readable.
4. Owner order details desktop:
   - primary content and side panels balanced.
5. Public order pages:
   - clear, centered, polished.

Tasks:
1. Run full local checks:
   - pnpm lint
   - pnpm typecheck
   - pnpm test:coverage
   - pnpm test:e2e
   - pnpm build
2. Run Playwright against key viewports:
   - 390x844
   - 768x1024
   - 1440x900
3. Use Playwright MCP if available to inspect:
   - product create form;
   - order builder;
   - public delivery/payment;
   - public post-confirmation status;
   - owner order list;
   - owner order details;
   - payment settings.
4. Update docs:
   - spec.md current status;
   - README.md user/testing instructions;
   - DEPLOYMENT.md if env or production behavior changed;
   - .env.example.
5. Confirm no required production env vars remain for Monobank unless clearly marked inactive/future.
6. Confirm no active customer UI contains:
   - MonoPay
   - Monobank
7. Confirm active customer UI contains:
   - `Оплата картою онлайн`
   - `Після оплати надішліть квитанцію продавцю в Instagram чат`
8. Commit after all checks pass.

Commit message:
Polish order payment experience
```

---

================================================================================
PROMPT 10 - recovery prompt
================================================================================

```text
Read AGENTS.md, spec.md, DEPLOYMENT.md, and docs/adr/0001-architecture.md first.

You are recovering from a failed implementation or failed checks.

Rules:
- Do not start new features.
- Do not weaken tests.
- Do not reduce coverage thresholds.
- Do not delete important tests just to pass.
- Do not commit secrets.
- Keep all user-facing UI Ukrainian.
- Keep roles only `owner` and `user`.

Tasks:
1. Run or inspect the failed command:
   - pnpm lint
   - pnpm typecheck
   - pnpm test:coverage
   - pnpm test:e2e
   - pnpm build
2. Identify the smallest set of code changes needed to fix the failure.
3. If a migration failed:
   - inspect Drizzle migration output;
   - ensure it is forward-only;
   - avoid destructive schema changes.
4. If payment provider enum migration failed:
   - do not drop PostgreSQL enum values;
   - use safe `ALTER TYPE ... ADD VALUE IF NOT EXISTS`;
   - preserve old `MONOBANK` values for historical compatibility even if active flow is disabled.
5. If UI tests fail:
   - keep the intended Ukrainian copy;
   - update tests only if the new copy is correct and intentional.
6. If Playwright fails due to timing:
   - prefer stable locators and deterministic waits;
   - do not use arbitrary long sleeps unless there is no alternative.
7. If production smoke fails:
   - inspect Railway variables and deployed commit;
   - do not expose credentials or secret values.
8. Update spec.md with the resolved blocker if relevant.
9. Rerun the failed checks.
10. Then run:
    - pnpm lint
    - pnpm typecheck
    - pnpm test:coverage
    - pnpm test:e2e
    - pnpm build
11. Commit with an imperative sentence case message describing the fix.

Commit message examples:
- Fix manual payment migration
- Fix public order status routing
- Fix responsive form actions
- Fix owner order search tests
```
