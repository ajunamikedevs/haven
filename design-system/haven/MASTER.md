# Haven Design System (Master)

Source of truth for Haven's UI. Derived from UI/UX Pro Max data (products #97 Recipe & Cooking,
#106 Grocery & Shopping List, #137 Family Calendar & Chores; style #19 Soft UI Evolution;
landing pattern #1/#31; typography #13 Friendly SaaS) and the Haven brand brief. Where the two
disagree, the brand brief wins.

## Direction
Warm, calm, quietly modern: a well-organized kitchen table at the start of the week.
Soft UI Evolution: soft layered shadows, rounded surfaces, clear hierarchy, measured contrast.
Friendly, never childish; no 3D/clay effects, no gradients, no emoji icons.

## Color tokens (semantic → light / dark)
| Token | Light | Dark | Use |
|---|---|---|---|
| `--bg` | #FBF9F7 | #1D1B19 | Page |
| `--surface` | #FFFFFF | #2A2724 | Cards, sheets |
| `--surface-2` | #F3EDE6 | #262320 | Warm Sand panels |
| `--line` | #E8E2DB | #3A3632 | Borders |
| `--text` | #2C2A28 | #F1ECE6 | Body text |
| `--text-muted` | #6B6560 | #B3ABA3 | Secondary text (≥4.5:1 on bg) |
| `--primary` | #A65D40 | #D08A6B | Primary buttons, active state (Hearth Clay, deepened for 4.9:1 with white) |
| `--on-primary` | #FFFFFF | #1D1B19 | Text on primary |
| `--primary-ink` | #8A4A31 | #E3A386 | Clay-colored text/links |
| `--secondary` | #8FA38A | #8FA38A | Meal highlights, success (Soft Sage) |
| `--secondary-ink` | #4E6249 | #A9BDA4 | Sage-colored text |
| `--gold` | #D4A574 | #D4A574 | Premium / suggested highlight |
| `--warn-*` | #FBF1E4 / #7A5424 | #3A2E20 / #E8C08E | Busy-evening notes |
| `--danger` | #B4533F | #E08A78 | Destructive actions |

Member colors (white initials, all ≥5:1): #A65D40, #4F6A85, #8A5A7A, #5C7356, #8A6428, #5B6B8C, #7A5C4A.
Every member color is paired with an initial; color is never the only signal.
Grocery sections each get a color dot plus a text label.

## Typography
- Headings: Plus Jakarta Sans 600–800 (Friendly SaaS pairing; stands in for Satoshi/General Sans).
- Body/UI: Inter 400–600.
- Scale: display clamp(32–52) · title clamp(26–32) · h2 22 · section 18 · body 16 · small 14 · caption 13. Line height 1.5 body.

## Space, radius, elevation
- Spacing (4/8 rhythm): 4, 8, 12, 16, 20, 24, 32, 48, 64.
- Radius: sm 10 · md 14 · lg 20 · xl 28 · full.
- Shadow: sm `0 1px 2px` · md `0 1px 2px + 0 6px 18px` (cards) · lg `0 18px 50px` (sheets).

## Motion
- fast 150ms (press, check), base 220ms (sheet enter, toast), exits faster than entrances.
- Press feedback: `transform: scale(.98)` (no layout shift).
- `prefers-reduced-motion`: all transitions/animations off; content renders in final state.

## Components & rules
- Buttons: one primary per screen; ≥48px tall primary, ≥44px all targets, ≥8px gaps.
- Sheets (dinner, event): native `<dialog>`, bottom sheet on phones with grab handle; Esc/backdrop closes; focus returns to the control that opened it.
- Toasts: polite live region; auto-dismiss 3.5s, or 6s with an action; pause on hover/focus.
- Destructive single actions (clear dinner, remove person, remove item, uncheck all) act at once with **Undo**. Bulk resets (clear week, restore example) use an in-page confirm.
- Empty states always name what will appear and offer the next action.
- Icons: one stroke family (1.8px, round caps), sizes 16/20/24; decorative icons `aria-hidden`.

## Landing pattern
Hero (value prop + product preview, primary CTA) → Problem → Features (4 cards) → How it works (3 real steps) → CTA → Footer. Sticky nav carries the CTA. No invented testimonials or stats.

## Anti-patterns to avoid
Gradients, glassmorphism, emoji icons, muted low-contrast gray text, hover-only affordances,
layout-shifting press states, placeholder-only labels, silent destructive actions.
