# Mobile Form And Table Refactor Guidelines

## Audit Summary

Audit date: 2026-05-08.

Scope:
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

Playwright MCP was used against the local Next.js dev server with E2E-safe seeded owner data, one sample product, one unconfirmed order link, and one confirmed order. Viewports inspected:
- 360x740
- 390x844
- 430x932
- 768x1024
- 1440x900

Key findings:
- Public and auth pages avoid page-level horizontal scrolling, but most primary controls are 40-42 px tall and should move to at least 44 px on touch screens.
- Dashboard mobile starts with a full-height content stack: brand, all nav links, account header, then page content. At 360-430 px the owner navigation consumes about 309 px before content appears.
- The persistent desktop sidebar starts at `md` (768 px), leaving only about 496 px for dashboard content on tablet portrait. Data-heavy owner pages still overflow at 768 px.
- Product, order-builder, order-list, product-details, and audit tables use fixed `min-w` table widths from 720 px to 980 px. This creates intentional horizontal scroll containers, but on some pages the table also contributes to page-level overflow.
- Product create/edit forms originally shipped as a single long form and reached roughly 1,830-1,900 px of scroll height on 360-430 px viewports. They now use the shared product stepper documented below, with mobile E2E coverage at 360 px.
- Owner order details are the heaviest page: roughly 3,750-3,810 px tall on mobile, with multiple card sections plus two horizontally scrolling tables.
- The public order review is already card-based and is the closest current pattern for mobile owner table replacements.

## Mobile-First Layout Principles

- Build the mobile layout as the primary layout. Add wider layouts with `md:` or `lg:` only after the mobile flow works without horizontal scroll.
- Treat `360x740` as the minimum supported phone viewport for owner and public flows.
- The document width must not exceed viewport width. A page-level `scrollWidth > innerWidth + 1` is a blocker.
- Use `min-w-0` on flex/grid children that contain names, SKUs, emails, phone numbers, URLs, tracking numbers, and status labels.
- Use `break-words`, `truncate`, or a line clamp on long seller/customer/product values.
- Prefer full-width mobile actions and compact desktop actions.
- Keep cards shallow. Use cards for repeated items, forms, and details sections, not for nesting full page sections inside other cards.
- Keep public customer pages simpler than owner pages. Public pages should not inherit dashboard density patterns.

## Form Stepper Principles

Use steppers for long mobile forms, but keep submission and validation in the existing application/server-action flow.

Rules:
- Step state is UI state only; it must not change database schema or domain rules.
- Server actions continue to validate the complete submitted payload.
- Client-side step validation may guide the user, but it must not become the source of business rules.
- Each step has one clear `h2`, a concise Ukrainian label, and one primary action.
- Back/next buttons are real buttons. Cancel/back navigation remains a `Link`.
- The final step summarizes the submitted data before the server action runs.
- A post-submit result step is acceptable for flows such as order-link creation, but it must display returned data only after the unchanged server action succeeds.
- Preserve submitted values when moving between steps.
- If server validation fails, focus or reveal the step containing the first invalid field.
- Async success/error messages use `aria-live`.

Recommended step groups:
- Product create/edit:
  - `Основне`: name, SKU, description, and active status when present.
  - `Ціна та залишок`: price and stock.
  - `Зображення`: external image URLs and previews.
  - `Перевірка`: summary, save, and cancel.
- Order builder:
  - `Вибір товарів`: searchable card list with selectable active products.
  - `Кількість`: quantity controls for selected products.
  - `Перевірка`: compact summary, total, and public link creation.
  - `Посилання`: generated token URL, copy action, and quick open action.
- Public delivery:
  - `Контакти`: name and phone.
  - `Доставка`: carrier, city, warehouse.
  - `Оплата`: payment method and confirmation.

## Reusable Multi-Step Foundation

Shared primitives live in `src/shared/ui/multi-step-form.tsx`:
- `Stepper` renders the Ukrainian progress label `Крок {current} з {total}` and marks the active step with `aria-current="step"`.
- `StepIndicator` renders one accessible progress item.
- `StepCard` wraps the active step, exposes a focusable `h2`, and announces step-level validation errors through `role="alert"` and `aria-live`.
- `StepActions` renders Ukrainian `Назад`, `Далі`, and final-submit controls.
- `FormSummaryCard` renders final review data before the unchanged server-action submit.
- `useMultiStepForm` keeps local step UI state, validates only the current step through React Hook Form `trigger`, preserves registered form values between steps, handles Back/Next, exposes `validateAllSteps`, and wraps final submit so partial data is not submitted before the last step.

Adoption checklist for feature forms:
- Keep the existing Zod schema and server action as the source of truth for the complete payload. Client step validation is only guidance.
- Define a typed `steps` array near the form component with Ukrainian `title` values and RHF field names for each step, for example `fields: ["name", "sku"]`. For field arrays, include the stable array path such as `imageUrls` when the whole repeated group belongs to one step.
- Keep `useForm` default values complete for every field and do not enable unregister-on-unmount behavior for step panels. This preserves values while the user moves between steps.
- Use `onSubmit={stepper.handleSubmit(onSubmit)}` on the `<form>`. Pressing Enter before the last step should advance/validate the current step, not call the server action.
- Render `Stepper`, one active `StepCard`, and `StepActions`. Pass `stepper.headingRef` and `stepper.stepErrorMessage` to `StepCard` so focus and live-region behavior remain consistent.
- On the final review step, render `FormSummaryCard` and optionally a `Перевірити` button that calls `stepper.validateAllSteps()` before the user clicks the final submit button.
- If a server action returns field errors, keep the existing `form.setError(...)` mapping and reveal the matching step before focusing the invalid field. Do not move server validation or business rules into the UI layer.
- Keep all new labels, helper text, errors, loading states, and button text Ukrainian.
- Product create/edit now follows this checklist in `src/modules/catalog/ui/product-form.tsx`. It keeps the original product schema, server actions, and external-image-URL strategy, and reveals the matching step when server validation returns field errors.

## Table-To-Card Rules

Desktop tables can remain where they are useful, but mobile should not depend on horizontal table scrolling.

Rules:
- Use a card list below the dashboard desktop/tablet breakpoint. Keep semantic tables for wider layouts.
- Prefer card layout at least below `lg` for owner dashboard data. The current `md` sidebar leaves too little content width for wide tables.
- Do not hide important data on mobile; instead prioritize it.
- Primary card line: human-readable entity name or short order id plus status.
- Secondary lines: price, quantity, SKU, phone, delivery, payment, or created date.
- Tertiary metadata: tags, audit payload summaries, tracking numbers, provider invoice ids.
- Actions live in a stable footer row and are at least 44 px tall.
- Use status badges with wrapping-safe text and no fixed width.
- For card lists, each row/card should support long Ukrainian labels and long user-entered values without layout overflow.
- If a true wide data comparison must remain scrollable, label the region and ensure the scroll is inside the card only, not the document.

Component targets:
- `ProductTable`: render product cards on mobile; keep table on wide screens.
- `OrderBuilderForm`: implemented as a four-step flow with selectable product cards, large quantity controls, review summary, and link result.
- `OwnerOrdersTable`: render order summary cards on mobile; keep the table for wide screens.
- `OwnerOrderDetailsView`: convert product and audit tables into mobile cards or a timeline.

## Dashboard Navigation Behavior

The dashboard shell should distinguish phone, tablet, and desktop.

Implemented shell baseline on 2026-05-08:
- Phone and tablet widths below `lg` use a compact sticky top shell with the Dase mark, owner email, POST logout button, current-section label, and four Ukrainian navigation targets.
- Desktop `lg` and wider keeps the persistent sidebar, now with active-route styling and the same route matching used by the mobile header.
- The owner content region uses `min-w-0`, responsive horizontal padding, and a `lg` sidebar breakpoint so 768 px tablet portrait keeps the wider mobile layout instead of a constrained desktop sidebar.
- Logout remains a real POST form to `/logout`; do not replace it with a Next `Link` or client-only navigation.
- The shell refactor added Playwright coverage for `/dashboard`, `/dashboard/products`, mobile logout to `/login?logout=1`, and page-level overflow at 360 px.

Phone:
- Brand and current page/account controls stay in a compact sticky top bar.
- Primary navigation moves into a menu button, bottom nav, or compact segmented nav.
- Use safe-area padding for sticky top or bottom navigation.
- Keep logout available as a POST form action, not a client-only link.
- Ensure page content starts near the first viewport, not after a full stacked sidebar.

Tablet portrait:
- Avoid the 17 rem persistent sidebar at 768 px if the page contains tables or forms. Prefer the mobile navigation until `lg`.
- Keep content width generous enough for form controls and cards.

Desktop:
- The existing sticky sidebar pattern can remain, with active route styling added during the refactor.
- Page-level action buttons stay in the header row when there is room.

## Spacing And Typography Rules

- Mobile page padding: `px-4` or `px-5`; avoid nested containers that add accidental width.
- Vertical rhythm: use `gap-4` for dense form groups, `gap-6` for page groups, and avoid `gap-8` in long mobile forms unless a section boundary needs it.
- Mobile `h1`: prefer `text-2xl` or `text-3xl`; reserve `text-4xl` for public/marketing pages where it fits.
- Form labels stay `text-sm font-medium`; helper/error text stays `text-sm`.
- Controls on touch screens should be at least 44 px high. Destructive/icon actions should be 44-48 px.
- Number and money columns should use tabular numerals where they remain in tables.
- Long identifiers, URLs, tracking numbers, and invoice ids must wrap or truncate intentionally.

## Accessibility Requirements

- Keep the existing Ukrainian skip link and visible focus styles.
- Preserve semantic elements: `button` for actions, `Link`/`a` for navigation, `label` for form controls.
- Icon-only buttons need Ukrainian `aria-label`.
- Decorative lucide icons remain `aria-hidden="true"`.
- Card replacements for tables must retain accessible names and clear relationships between labels and values.
- Async states and server action messages use `aria-live` and `role="status"` or `role="alert"` as appropriate.
- Validation errors stay adjacent to controls and connected through `aria-describedby` where the component already supports it.
- Mobile nav menu/drawer, if introduced, must trap focus while open and close with Escape.
- Do not remove browser zoom or rely on hover-only interactions.

## Page-By-Page Refactor Plan

### `/`

Current state:
- No horizontal overflow at audited viewports.
- At 360x740 the page height was about 924 px, so the feature cards start below the fold.
- CTA height is 40 px.

Plan:
- Keep the page structurally simple.
- Reduce first-viewport vertical weight so at least one next-section item is hinted on 360x740.
- Raise CTA touch height to at least 44 px.

### `/login`

Current state:
- No horizontal overflow.
- Form controls are about 42 px high and the primary button is 40 px.
- The setup link is a small text link.

Plan:
- Keep the single-card auth form.
- Raise control and button touch height to 44 px.
- Ensure the setup link remains readable and does not rely on a tiny tap target.

### `/setup`

Current state:
- No horizontal overflow.
- Controls are about 42 px high and the submit button is 40 px.

Plan:
- Keep the single-card first-owner setup flow.
- Raise touch target heights.
- Keep production setup token entry in the form only; do not reintroduce token URLs.

### `/dashboard`

Current state after 2026-05-08 shell refactor:
- No page-level horizontal overflow at 360x740 in Playwright.
- Phone widths use a compact sticky top header with current-section label and 44 px-plus navigation/logout targets.
- Desktop sidebar remains at `lg` and wider with active/current route styling.
- Logout is still submitted through a POST form action to `/logout`.

Remaining plan:
- Continue table-to-card and long-form refactors page by page; do not move auth or business rules into shell components.

### `/dashboard/products`

Current state:
- Table has `min-w-[760px]`; with sample content it rendered about 954 px.
- The table is inside a horizontal scroll container at 360-768 px.
- Table action buttons are about 36 px high.

Plan:
- Add a mobile product-card list for product image, name, SKU, price, stock, active state, and actions.
- Keep the table for wide desktop.
- Make edit/toggle actions full-width or 44 px high on mobile.
- Preserve external image URL strategy only.

### `/dashboard/products/new`

Current state after 2026-05-08 product stepper refactor:
- The form uses the shared four-step flow: `Основне`, `Ціна та залишок`, `Зображення`, and `Перевірка`.
- `Далі` validates only the current step; the final submit still uses the existing product server action and complete Zod validation.
- Entered values are preserved between steps through React Hook Form state.
- The image URL step keeps external URLs only, stacks URL input, helper copy, preview, and delete action safely on phone widths, and does not add file uploads or object storage.
- Playwright MCP inspected the page at 360x740, and Playwright E2E covers the create form through all steps at 360 px with no page-level horizontal overflow.

Remaining plan:
- Keep monitoring image URL lengths and preview behavior when product table/card refactors add more mobile catalog coverage.

### `/dashboard/products/[productId]/edit`

Current state after 2026-05-08 product stepper refactor:
- The edit page reuses the product stepper and preloads existing product values into the matching steps.
- Long product names wrap in the page header instead of stretching the viewport.
- The update path still uses the existing server action and product application use case.
- Playwright MCP inspected the edit page at 360x740 with E2E-safe seeded product data, and Playwright E2E verifies the edit page loads at 360 px without page-level horizontal overflow.

Remaining plan:
- Revisit mobile edit entry points when the catalog table is converted to mobile cards.

### `/dashboard/orders/new`

Current state after 2026-05-08 order-builder stepper refactor:
- The wide `min-w-[820px]` order-builder table was removed.
- The page now uses four Ukrainian steps: `Вибір товарів`, `Кількість`, `Перевірка`, and `Посилання`.
- Product selection is searchable and card-based; each product card is a large selectable target and the input list contains active products only from the existing application use case.
- The quantity step shows selected products only, with 44 px plus/minus controls, numeric inputs, inline validation messages, and line totals.
- The review step keeps the total and create-link action close to the selected-item summary.
- The link step displays the generated token-based public URL with copy and quick-open actions.
- The existing order creation server action, use case, product snapshot behavior, and public-token URL behavior are unchanged.
- Focused unit coverage checks product selection/search, quantity validation, summary review, link display, and Ukrainian labels.
- Playwright E2E creates a multi-product owner order link at 390 px and asserts no page-level horizontal overflow through the builder steps.

Remaining plan:
- Keep monitoring long product names, SKUs, and generated URLs in mobile screenshots as more catalog/order pages move to card layouts.

### `/dashboard/orders`

Current state:
- Filters occupy a long block on phone widths.
- Order table has `min-w-[980px]`; sample table rendered about 1,090 px.
- Page-level overflow appeared at 768x1024.

Plan:
- Collapse filters behind a mobile disclosure or split into primary search plus secondary filters.
- Render order cards on mobile with order id, status, customer, phone, delivery, payment, total, tags, and open action.
- Keep URL-backed filters and server-side read model unchanged.
- Keep desktop table for wide screens.

### `/dashboard/orders/[orderId]`

Current state:
- About 3,750-3,810 px tall at phone widths.
- Product and audit tables each use `min-w-[720px]` and horizontal scrolling.
- Page-level overflow appeared at 768x1024.
- Detail forms for tags/status/retry stack heavily.

Plan:
- Add a compact order summary header with status, total, customer, and primary actions.
- Convert product table to mobile item cards.
- Convert audit table to a timeline/card list on mobile.
- Group customer, delivery, payment, and shipment details into collapsible or scan-friendly sections.
- Keep tag/status/payment/shipment actions in existing use-case-backed components, but improve mobile layout and target sizes.

### `/o/[token]`

Current state:
- Card-based public order review works well at audited viewports.
- Primary CTA is 40 px high.

Plan:
- Keep the card pattern as the reference for owner table-to-card work.
- Raise CTA height to at least 44 px.
- Preserve token-only public access and retry payment behavior.

### `/o/[token]/delivery`

Current state:
- No horizontal overflow.
- The form is about 990-1,030 px tall on phone widths.
- Controls are 40 px high.

Plan:
- Consider the delivery stepper after owner dashboard tables/forms are fixed.
- Raise touch target heights.
- Keep Nova Post as the only active MVP carrier.
- Keep city/warehouse lookup through route handlers and carrier use cases, not direct provider calls from UI.

## Testing Checklist

Before implementing each UI refactor slice:
- Read `AGENTS.md`, `spec.md`, and this document.
- Confirm all user-facing text added by the slice is Ukrainian.
- Confirm roles remain only `owner` and `user`; do not introduce any other dashboard role copy.
- Confirm no database schema change is needed.

Component and unit checks:
- Add or update focused UI tests for important Ukrainian labels.
- Test mobile card variants and empty states where possible.
- Test that server-action messages remain visible through `aria-live`.
- Do not weaken coverage thresholds.

Playwright checks:
- Use the viewport matrix: 360x740, 390x844, 430x932, 768x1024, 1440x900.
- For each changed page, assert no page-level horizontal overflow.
- Verify product cards, order cards, order-builder selection, mobile filters, and mobile navigation are usable by role/label queries.
- Verify desktop tables still render on wide screens.
- Verify public pages still expose only token-scoped order data.

Required commands before claiming an implementation milestone complete:

```bash
pnpm lint
pnpm typecheck
pnpm test:coverage
pnpm test:e2e
pnpm build
```
