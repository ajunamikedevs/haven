# Haven SaaS: build plan (milestone 1)

Plan for taking Haven from `haven.html` to a paid app, following `docs/fable-build-prompt.md`.
Status: **approved by the owner on 2026-11-17**, including the eight changes in §1.

## 1. Where the brief needs to change

These come from reading the AgentaOS skill and docs (`docs.agentaos.ai/llms-full.txt`) and the current Vercel platform notes. Each needs a yes/no from the owner.

| # | Brief says | What's actually true | Proposed change |
|---|---|---|---|
| 1 | Billing page lets people switch monthly ↔ annual | AgentaOS refuses a plan change across billing intervals (returns 400). `changePlan` only works between plans with the same interval | To switch, cancel at period end and subscribe to the other plan when access ends. The billing page explains this in one line. No mid-period switch |
| 2 | "Manage billing: … use whatever AgentaOS offers (hosted portal or APIs)" | There is no buyer-facing portal and no documented way for a buyer to update their card | Build our own billing page: plan, next renewal date, cancel, receipts list. If a renewal fails and retries run out, the recovery path is a fresh checkout |
| 3 | Cancel "takes effect at period end" with implied undo | Resuming a scheduled cancel exists only in the AgentaOS dashboard; the SDK has no resume method | In-app: no "resume" button. After a cancel is scheduled we say "access until <date>; subscribe again any time after" |
| 4 | Local development of billing | `successUrl` must be https and `https://localhost` is refused; webhooks are not delivered to localhost | Billing is developed and tested against Vercel **preview deployments** (plus unit tests with signed sample events) |
| 5 | We send a payment receipt email | AgentaOS, as merchant of record, already emails a receipt for every paid cycle | We don't send receipts. Our emails: magic link, trial ending (3 days before, and on the day), payment failed, subscription cancelled |
| 6 | Custom analytics events through Vercel Web Analytics | Week-4 and week-8 retention needs per-household cohorts, which Web Analytics can't query; custom events may also need a paid plan (not verified) | Web Analytics for page views only. The seven product events go into our own `product_events` table (household id, event, timestamp, no content), and retention is a SQL query |
| 7 | Hosting on Vercel | Vercel's free Hobby plan is for non-commercial use. A paid product needs **Vercel Pro** (about $20/month) | Owner confirms Pro before go-live. Building on Hobby during development is fine |
| 8 | Refund policy page | A refund sends no webhook from AgentaOS | Refunds are handled by the owner in the AgentaOS dashboard; access is adjusted by hand (rare). The policy page says how to ask |

Not a change, but worth knowing: the folder is `app/` as decided, and Next.js also uses a folder called `app` for routes, so routes live at `app/src/app/`. The Vercel project's root directory is set to `app`.

## 2. Stack

- **Next.js** (App Router, TypeScript strict) on Vercel, Node.js 24, Fluid Compute. Exact version is resolved when scaffolding (current stable); I'll read the version-matched docs bundled in `node_modules/next/dist/docs/` before writing framework code rather than relying on memory.
- **Postgres on Neon**, provisioned through the Vercel Marketplace. **Drizzle ORM** with SQL migrations checked in.
- **Auth: Better Auth** with the Drizzle adapter: email magic link plugin + Google provider, sessions in our Postgres. Google is switched on once the owner adds the OAuth client; until then magic link works alone.
- **Email: Resend** (transactional only), provisioned through the Marketplace if available there. Templates are plain React email components in the repo.
- **Payments: `@agentaos/pay`** on the server, Pattern B from the AgentaOS skill (server-created checkout carrying our household id).
- **Errors: Sentry** (Marketplace). Chosen over Vercel's built-in observability because it covers browser errors as well as server ones, and lets us scrub payloads. `beforeSend` strips request bodies, emails and household content.
- **Scheduled work:** one daily Vercel scheduled function for trial emails.
- **Tests:** Vitest (logic), Playwright (flows), GitHub Actions for CI.
- **Styling:** the prototype's CSS custom properties and component rules moved into `src/styles/` (tokens.css + component stylesheets, CSS modules where a component owns its styles). No utility framework. Fonts via `next/font` (Plus Jakarta Sans, Inter).

I'll load the Vercel `marketplace`, `auth`, `vercel-storage` and `env-vars` skills at the Foundation milestone before provisioning anything, as the platform notes require.

## 3. Data model

All tables have `id` (uuid), `created_at`. Every household-scoped table has `household_id` with an index and `ON DELETE CASCADE`.

- `user`, `session`, `account`, `verification`: Better Auth's own tables.
- `households`: `owner_user_id` (unique: one household per account), `name`, `time_zone` (IANA), `week_of` (date, Monday), `welcomed`, `is_example`, `trial_ends_at`.
- `subscriptions`: `household_id` (unique), `agentaos_subscription_id` (unique), `plan` (`monthly`|`annual`), `status` (AgentaOS's eight values), `current_period_end`, `cancel_at_period_end`, `last_event_at`.
- `checkout_sessions`: `household_id`, `session_id` (unique), `plan`, `status` (`pending`|`completed`|`expired`), used to tie a checkout to a household and for idempotency.
- `webhook_events`: `event_id` or `session_id`+`type` (unique), `received_at`: makes handlers safe to run twice.
- `members`: `name`, `role`, `color`, `position`.
- `events`: `day` (0–6), `time` (nullable), `title`, `note`, `member_id` (nullable = Everyone, `ON DELETE SET NULL`), `done`, `repeat`.
- `dinners`: `day` (unique per household), `lib_id`, `name`, `minutes`, `effort`, `tags` (text[]), `cooked`, `ingredients` (jsonb array of `[name, qty, unit, aisle]`, exactly the prototype's shape, since ingredients are only ever read with their dinner).
- `grocery_checks`: `item_key` (`name|unit`, unique per household).
- `extras`: `name`, `got`.
- `share_links`: `kind` (`list`|`week`), `token_hash` (SHA-256 of a 32-byte random token; the token itself is shown once in the URL and never stored), `revoked_at`, `last_opened_at`.
- `undo_log`: `household_id`, `payload` (jsonb: the rows a destructive action removed or changed), `expires_at` (10 minutes). Powers Undo across requests.
- `product_events`: `household_id`, `name`, `at`. No content.

The 12-meal library, aisle words and effort labels stay in code (`src/lib/meals.ts`).

## 4. Logic ported from the prototype (pure functions, unit-tested)

`src/lib/` gets one module each, lifted from `haven.html` and typed:
`grocery.ts` (merge by `name|unit`, quantities, `guessAisle`, list as text), `heads-up.ts` (the rules and their order, max 3), `week.ts` (Monday-based week in the household's time zone, today index, rollover, busy evening = event at 17:00 or later), `fill.ts` (fill open nights), `wrap-up.ts` (stats, what carries over), `access.ts` (trial / active / read-only), `import.ts` (validate and map a `haven.v1` object).

Time-zone handling uses `Intl.DateTimeFormat` with the household zone on the server and passes "today" to the client, so server and client never disagree about what day it is.

## 5. Routes

Public: `/` (landing), `/signin`, `/terms`, `/privacy`, `/refunds`, `/s/[token]` (shared list or week, `noindex`), `/offline`.

Signed in (`/(app)` group, household loaded once in the layout):
`/week`, `/grocery`, `/household`, `/settings` (time zone, share links, export, delete account), `/billing`.

API / handlers: `/api/auth/[...all]` (Better Auth), `/api/webhooks/agentaos`, `/api/cron/trial-emails`, `/api/export`.

Writes are **server actions**, each starting with the same two checks: `requireHousehold()` (session → household; every query filtered by that id) and `requireWriteAccess()` (refuses when read-only). Sheets stay native `<dialog>` elements in client components; lists update optimistically and reconcile with the server result. Undo calls `undo(action_id)`, which replays the saved rows from `undo_log`.

Old prototype links: the landing page reads `#s=…`, `#week`, `#grocery`, `#household` on load. `#s=` renders the snapshot read-only with an "old link" note; the others redirect to the matching route.

## 6. Billing design

- **Products (test mode):** "Haven Monthly" $5 USD/month and "Haven Annual" $48 USD/year, no AgentaOS trial. Their ids go in env vars. The existing Content Engine product is not touched.
- **Trial:** `households.trial_ends_at = created_at + 14 days`, no card.
- **Access rule (`access.ts`)**, the only place this is decided:
  full access if `now < trial_ends_at`, or subscription status is `active` / `trialing`, or `past_due` (AgentaOS is still retrying the card), or `canceled` with `now < current_period_end`. Otherwise read-only.
- **Subscribe:** server action creates a checkout with `linkId`, `buyerEmail`, `metadata.customerId = household id`, success URL `/billing/return`; stores the `sessionId` as pending; redirects.
- **Return page:** never unlocks by itself. It calls `checkouts.retrieve(sessionId)`, and only a `completed` status for a session we created for this household updates the subscription.
- **Webhook** (`X-AgentaOS-Signature`, verified with `webhooks.verify` against the raw body; 400 on failure; duplicate deliveries ignored through `webhook_events`):
  - `checkout.session.completed` → first payment: link subscription id to the household. Renewals arrive without our id, so they're matched on the stored subscription id.
  - `subscription.created` / `subscription.renewed` / `subscription.updated` / `subscription.canceled` → update status, period end, cancel flag.
  - `subscription.payment_failed` → mark `past_due`/`unpaid`, send our "payment failed" email once per failure.
  - Out-of-order protection: ignore an event older than `last_event_at`; a nightly reconcile compares against `subscriptions.list()` (there is no `retrieve`).
- **Cancel:** `subscriptions.cancel(id)` (period end). Billing page shows "access until <date>".
- **Receipts:** `subscriptions.invoices(id)` listed on the billing page with links to the PDF.
- **Read-only mode:** banner "Your trial has ended. Subscribe to keep planning." with the two plans; all write actions refuse on the server; shared links keep working read-only (ticks refused with a gentle message).

## 7. Share links, import, PWA, security

- **Share links:** created in the app (same buttons as today), listed and revocable in Settings. `/s/[token]` hashes the token and looks it up. List view allows ticking without sign-in: the action takes token + item key only, checks the link is live and the household has write access, and is rate-limited (Vercel Firewall rule on `/s/*` writes, plus a per-link counter in Postgres). Responses contain only list or week data: no email, no ids beyond what's needed.
- **Import:** after first sign-in the client checks `localStorage['haven.v1']`; if present it shows one prompt. The object is validated field by field on the server (lengths, types, day ranges, max counts) before anything is inserted.
- **PWA:** manifest, icons, a small hand-written service worker: cache-first for static assets, network-first for pages with a cached copy of the last `/week` and `/grocery` for offline reading. Offline writes are refused with "You're offline. This will work again when you're connected."
- **Security:** server actions (built-in origin checks) for all mutations; `httpOnly`, `secure`, `sameSite=lax` session cookies; CSP (no nonces: Partial Prerendering can't carry them, so inline scripts are allowed and everything else is locked to this origin; see next.config.ts); rate limits on sign-in and share endpoints; secrets only in Vercel env vars; webhook signature verification; no household content in logs or Sentry.
- **Account:** export everything as JSON; delete account (cancels the subscription first, then removes the household and user).

## 8. Milestones

Same order as the brief; the checkpoints are unchanged.

1. **Plan** (this document). **STOP.**
2. **Foundation:** scaffold, tokens and base components, Better Auth (magic link, Google behind a flag), Neon + Drizzle migrations, household creation, Vercel project with preview deploys, CI skeleton.
3. **Parity:** This Week, dinner sheet, events, grocery, household, wrap-up, quick capture, Heads up, Undo, landing page. Ported logic with unit tests first, then screens.
4. **Share links and import.**
5. **Billing:** trial, AgentaOS test products, checkout, webhook, read-only mode, billing page, emails, daily job. **STOP** with a full test-mode purchase shown.
6. **Launch pieces:** legal drafts, export/delete, PWA, product events, Sentry, security headers.
7. **Hardening:** full suite green, Lighthouse ≥ 90 mobile, accessibility pass against `MASTER.md`. Open the PR. **STOP.**
8. **Go-live:** only when told.

## 9. What I need from the owner

Before Foundation (milestone 2):
- Answers to the eight items in §1.
- OK to create: a Vercel project linked to this repo, a Neon database, a Resend account, a Sentry project (all have free tiers; nothing is charged at this stage).

Before Billing (milestone 5):
- An AgentaOS **test** API key (`sk_test_…`) and the webhook signing secret, added to Vercel env vars by the owner (Settings → Developers in AgentaOS). I don't handle these values.
- OK to create the two test products.

Any time before launch:
- Google OAuth client id and secret in Vercel env vars.
- The address emails should come from (needs a domain to send from; until one exists, magic links can only go to the owner's own address on Resend's test sender, which is enough for development but **not for launch**).

That last point means a domain is needed before real users can sign up by email, even if the app itself stays on a Vercel URL.
