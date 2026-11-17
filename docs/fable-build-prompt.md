# Build prompt: Haven, from prototype to shippable SaaS

You are taking Haven from a working single-file prototype to a paid, production-ready SaaS. Work in this repository (`ajunamikedevs/haven`). Read this whole brief before writing code, then work milestone by milestone, stopping at each checkpoint marked **STOP**.

## 1. What Haven is

Haven is a household scheduling and dinner-planning app for **the one person in a home who keeps everything in their head**. Its job is to take on the *noticing* (anticipating, suggesting, deciding, closing loops) so that person stops being the household project manager. It is not a chore tracker.

Product principles (also in `design-system/haven/MASTER.md`; every feature is checked against them):
- **Organizer first.** One person signs in and pays. Everyone else in the home gets links. Nobody else needs an account or an app.
- **Haven notices, people don't nag.** Nudges come from Haven, never from one person to another. No streaks, scores or per-person tallies.
- **Close loops quietly.** Past days count as done without anyone ticking them; the weekly wrap-up resets instead of auditing.
- **One field to capture.** Adding to the grocery list never asks for amounts, owners, dates or categories.
- **Dinners first.** Onboarding asks for one thing: this week's dinners.

## 2. What exists today

- `haven.html`: the whole prototype (vanilla HTML/CSS/JS, hash routing, `localStorage` key `haven.v1`). **This is the functional spec.** Every feature in it must exist in the new app, with the same behaviour and copy unless this brief says otherwise.
- `index.html`: built from `haven.html` by `build.sh`; served by GitHub Pages at https://ajunamikedevs.github.io/haven/.
- `design-system/haven/MASTER.md`: the design system: tokens (light and dark), Plus Jakarta Sans + Inter, spacing, radius, motion, component rules, product principles. **The new app must follow it exactly.** Port the CSS tokens from `haven.html`, don't reinvent them.

Features in the prototype (all must carry over):
- Landing page: hero with product preview, problem section, the four stages (anticipate, find options, decide, monitor), how it works, CTA, footer.
- **This Week:** greeting, welcome card (dinners first), **Heads up** strip (max 3 items, tappable, calm line when empty), Tonight card, progress card with grocery button and share, sticky day strip, colour legend, 7 day cards with events (tick done, edit) and a dinner slot.
- **Dinner sheet:** type your own meal (optional ingredients), or pick from the 12-meal library with effort filters, busy-evening note, "Suggest one", per-meal ingredient toggle; clear with Undo. **Fill open nights** in one tap.
- **Events:** add/edit/delete, day, time, who (member or Everyone), note, **Repeats every week**.
- **Grocery list:** built from planned dinners (merged quantities, sorted by aisle with guessed aisles for typed items), hand-added items, tick off (ticked items sink), uncheck all with Undo, copy as text, send list link.
- **Household:** rename (live), role/age, add, remove (their events become Everyone, with Undo), colours assigned automatically.
- **Weekly wrap-up:** stats, repeating plans carried forward, start next week (Undo).
- **Quick capture:** "Add to list" in the header, one field, stays open.
- Undo toasts for single destructive actions; confirm dialogs for bulk resets; focus returns to the opener; 44px minimum targets; reduced motion respected.

## 3. Decisions already made (don't revisit)

| Area | Decision |
|---|---|
| Stack | Next.js (App Router, TypeScript) + Postgres (Neon via the Vercel Marketplace) on Vercel |
| Where | New folder `app/` in this repo, on a branch, delivered as a PR to `main` |
| Merchant of record | **AgentaOS** (account is verified, payouts connected, currently in **test mode**) |
| Pricing | One plan for the whole household: **$5/month or $48/year, in USD** |
| Trial | **14 days, no card upfront**, full access. When it ends without a subscription the account goes **read-only** (all data kept, can view, can't edit) until they subscribe |
| Sign-in | Email magic link **and** Google |
| Household members | **Links only, no accounts.** Only the organizer signs in and pays |
| Emails | Account and billing only: magic links, trial ending (3 days before, and on the day), payment receipt, payment failed, subscription cancelled. No marketing or reminder emails |
| Domain | Vercel URL for now; keep everything domain-agnostic (env var for base URL) |
| Prototype data | Offer to import a saved `haven.v1` week from the browser on signup; GitHub Pages site redirects to the new app at launch |
| Also required for launch | Terms, privacy and refund pages; installable PWA; privacy-friendly product analytics; error monitoring |

## 4. Architecture

- **Next.js App Router**, TypeScript strict, server components by default, server actions or route handlers for writes. Keep client JS small; the app must feel instant on a mid-range phone.
- **Database:** Postgres on Neon. Use a typed query layer or ORM with migrations checked into the repo (Drizzle is a good fit). Every query that touches household data must be scoped to the signed-in user's household on the server. Never trust an id from the client without that check.
- **Auth:** a library that stores users and sessions in our own Postgres, with email magic links and Google OAuth (Better Auth or Auth.js). Magic-link emails go through a transactional email provider (Resend is fine).
- **Time:** weeks run Monday to Sunday in the **household's time zone** (captured at signup from the browser, editable in settings). "Today", "tonight", busy evenings (an event at 17:00 or later) and week rollover all use that zone, on server and client alike.
- **Styling:** port the CSS custom properties and component styles from `haven.html` (CSS modules or a global stylesheet; no utility-class rewrite that drifts from the tokens). Light and dark themes as in the prototype.
- Use the Vercel skills and MCP tools available in your session for project setup, environment variables, storage and deployment rather than guessing CLI flags.

### Data model (starting point; adjust if you have a good reason, and say why)

- `users`: auth identity (email, name, Google id), created_at.
- `households`: id, owner_user_id, name, time_zone, week_of (Monday date of the current planning week), welcomed, is_example, trial_ends_at, created_at.
- `subscriptions`: household_id, agentaos_subscription_id, agentaos_customer_id, plan (`monthly` | `annual`), status, current_period_end, cancel_at_period_end, updated_at.
- `members`: household_id, name, role, color, position.
- `events`: household_id, day (0–6), time (nullable), title, note, member_id (nullable = Everyone), done, repeat.
- `dinners`: household_id, day, lib_id (nullable), name, minutes, effort, tags, cooked; `dinner_ingredients`: name, qty, unit, aisle.
- `grocery_checks`: household_id, item_key, checked_at (ingredients from dinners, keyed like the prototype's `name|unit`).
- `extras`: household_id, name, got, created_at (hand-added items).
- `share_links`: id, household_id, kind (`list` | `week`), token (random, at least 128 bits), created_at, revoked_at.
- `analytics_events` only if the analytics choice needs server storage (see §8).

The meal library stays in code, not the database.

## 5. Billing with AgentaOS

Load the **`agentaos` skill** before touching payments and use the `agenta_*` MCP tools (or the `agenta` CLI). **Confirm how AgentaOS reports subscription changes to an app (webhooks, signature verification, event names, retries) from its skill or docs. Don't guess field names or event types.** If something you need isn't documented, STOP and ask.

- In **test mode**, create two Haven products: subscription "Haven Monthly" ($5, USD, monthly) and "Haven Annual" ($48, USD, yearly). The account already has an unrelated product ("A&M Content Engine — Founding Tier", USDC); leave it untouched. No AgentaOS trial on these products, because the trial runs in-app with no card.
- **Upgrade flow:** a Billing page and an "upgrade" prompt during and after the trial lead to an AgentaOS checkout for the chosen plan, tied to the household (pass our household id or customer reference however AgentaOS supports it). Success and cancel URLs return to the app.
- **Source of truth:** store the subscription state from verified AgentaOS events in `subscriptions`. Handlers must be idempotent and verify signatures. Never unlock access just because the success URL was reached; reconcile with AgentaOS first.
- **Access rule** (one server-side function used everywhere): full access if the trial is active **or** the subscription is active / in its paid period; otherwise read-only. Read-only means every write action is refused on the server, and the UI shows a calm banner with "Subscribe to keep planning". Share links keep showing the last state.
- **Manage billing:** switch monthly/annual, cancel (takes effect at period end), see invoices/receipts. Use whatever AgentaOS offers (hosted portal or the subscription/invoice APIs) and say which you used.
- Emails for receipts: if AgentaOS already sends receipts as merchant of record, don't duplicate them. Only send our own trial and failure emails.
- **Never switch AgentaOS to live mode or create live products yourself. STOP and ask.**

## 6. Share links (upgrade from the prototype's snapshots)

The prototype encoded a snapshot in the URL fragment. Replace it with **live, revocable links**: `/s/<token>`.
- `list` links show the current grocery list (what's left to buy), and recipients can tick items off **without signing in**. Ticks write back to the household so the organizer sees them (this is the "closed loop"). `week` links show the current week, read-only.
- Organizer can see and revoke their links in Settings, and create a new one.
- Rate-limit unauthenticated writes; validate the token server-side; `noindex` these pages; never expose other household data or the organizer's email.
- Old fragment links (`#s=...`) from the prototype should still render their snapshot read-only, with a note that it's an old link.

## 7. Onboarding, import and the prototype

- New account: ask only the household time zone (pre-filled) and land on This Week with the **welcome card (dinners first)**. The example family is available via "Look around the example first", as in the prototype.
- **Import:** if the browser has a `haven.v1` entry in `localStorage` when the user signs up or first signs in, offer once: "Bring over the week you planned on this device?" Map it into the new tables. Validate everything; it's untrusted input.
- At launch, replace the GitHub Pages `index.html` with a page that redirects to the new app's URL while carrying the hash, so `#s=` links still resolve. Keep `haven.html` in the repo as the reference spec. **STOP and ask before changing what GitHub Pages serves.**

## 8. Launch requirements

- **Legal pages:** Terms of Service, Privacy Policy, Refund Policy, written in plain language, naming **AgentaOS as merchant of record**. Mark them clearly as drafts for the owner to review. Link them from the footer, the signup page and checkout. Do not present them as legal advice.
- **Account controls:** export all household data (JSON), delete account and data (with confirmation; cancel the subscription first or tell the user how).
- **PWA:** web manifest, icons (brand mark on Hearth Clay), service worker that caches the app shell and the current week for **offline reading**. Writes need a connection: say so gently rather than failing silently.
- **Analytics (privacy-friendly, no ads cookies):** Vercel Web Analytics for pages, plus custom events for: `signup`, `week_planned` (all 7 dinners set), `fill_open_nights`, `share_link_created`, `share_link_opened` (by a non-owner), `wrap_up_completed`, `trial_converted`. Use these for week-4 and week-8 organizer retention. Mention analytics in the privacy policy.
- **Error monitoring:** client and server errors reported (Sentry or Vercel's built-in observability; pick one and say why), with no household content or emails in payloads.
- **Security:** CSRF-safe mutations, secure session cookies, strict authorization on every query, rate limits on auth and share-link endpoints, a Content Security Policy, secrets only in Vercel env vars (never committed), and AgentaOS event signature verification.
- **Accessibility and quality bar (from MASTER.md):** 44px targets, visible focus, focus returns after sheets, labels on every field, 4.5:1 contrast in both themes, reduced motion respected, no horizontal scroll at 375px, works with keyboard only.

## 9. Testing

- Unit tests for the pure logic you port: grocery merging and aisle guessing, Heads up rules, busy-evening detection, fill open nights, week rollover and wrap-up, access rules (trial, active, past due, cancelled, read-only).
- Playwright end-to-end tests at 375px **and** desktop, in light and dark: sign up → welcome → plan dinners → grocery list → share link opened in a separate signed-out context → recipient ticks an item → organizer sees it; quick capture; repeating event → wrap-up carries it; trial expiry → read-only → AgentaOS test checkout → full access restored; cancel → access until period end.
- Billing events tested with AgentaOS **test mode**, including duplicate and out-of-order delivery.
- CI on the PR: typecheck, lint, unit, e2e. Preview deployment on Vercel for every PR.

## 10. Milestones and checkpoints

1. **Plan:** read `haven.html`, `MASTER.md` and this brief; write `app/PLAN.md` with the schema, routes, libraries chosen and anything you think this brief gets wrong. **STOP** for approval.
2. **Foundation:** Next.js app, design tokens, auth (magic link + Google), database and migrations, household creation, Vercel project with preview deploys.
3. **Parity:** every prototype feature from §2 on the server, with Undo, sheets and accessibility intact.
4. **Share links and import.**
5. **Billing:** in-app trial, AgentaOS test products and checkout, verified subscription events, read-only mode, billing page, trial/failure emails. **STOP** and show a full test-mode purchase.
6. **Launch pieces:** legal drafts, export/delete, PWA, analytics, error monitoring, security headers.
7. **Hardening:** full test suite green, Lighthouse ≥ 90 on mobile for performance, accessibility and best practices, review against MASTER.md's pre-delivery rules. Open the PR. **STOP.**
8. **Go-live (only when told):** owner switches AgentaOS to live, you create live products and set production env vars, deploy production, redirect GitHub Pages.

At each STOP, report what's done, what's verified (with test output), what's not, and any decisions you made.

## 11. Things only the owner can do (ask, don't attempt)

- Create the Google OAuth client and paste its id and secret into Vercel env vars.
- Approve creating the Vercel project, the Neon database and the email provider account, plus anything that costs money.
- Switch AgentaOS to live mode and approve live products.
- Review and approve the legal pages.
- Approve merging the PR and changing what GitHub Pages serves.

## 12. Out of scope

Chore boards, rotating handoffs, co-editor accounts, native apps, marketing or reminder emails, recipe import, AI features, multiple households per account, custom domain (later). If you think one of these is essential, raise it at a checkpoint instead of building it.

## Definition of done

A stranger can find Haven, sign up with email or Google, plan a week, send a live grocery link that someone else ticks off on their phone, use it free for 14 days, subscribe for $5/month or $48/year through AgentaOS (test mode until go-live), manage or cancel billing, export or delete their data, and install it on their phone. Every prototype behaviour still works, all tests pass in CI, and the PR is ready for review.
