# Haven (app)

The paid Haven app: Next.js, Postgres and AgentaOS billing. The plan is in [PLAN.md](PLAN.md), the brief in
[../docs/fable-build-prompt.md](../docs/fable-build-prompt.md), and the design system in
[../design-system/haven/MASTER.md](../design-system/haven/MASTER.md). The prototype it grew from is `../haven.html`.

## Run it locally

Needs Node.js 24. No accounts or database install are needed: without `DATABASE_URL` the app uses PGlite
(Postgres running in-process, stored in `.data/`), and without `RESEND_API_KEY` sign-in emails are printed
to the terminal and saved to `.data/outbox.jsonl`.

```bash
cp .env.example .env.local   # then set BETTER_AUTH_SECRET
npm install
npm run db:migrate
npm run dev
```

## Checks

| Command | What it does |
|---|---|
| `npm run typecheck` | TypeScript, strict |
| `npm run lint` | ESLint |
| `npm test` | Unit tests for the logic in `src/lib` |
| `npm run test:e2e` | Playwright flows at phone and desktop sizes (starts its own server on port 3210) |
| `npm run db:generate` | Write a migration after changing `src/db/schema.ts` |

## Where things are

- `src/lib/`: the product's rules as pure functions (grocery list, Heads up, week and time zone, wrap-up,
  access), plus sign-in (`auth.ts`) and the data access layer (`dal.ts`). All household data goes through `dal.ts`.
- `src/db/`: schema and connection. Migrations are in `drizzle/`.
- `src/app/`: routes. `(app)/` is the signed-in area.
- `e2e/`: end-to-end tests.
