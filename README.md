# Hisaab PWA

A mobile-first personal expense and remittance tracker that installs as an
app. Salary comes in **QAR** (Qatar); money sent to family is tracked in
**PKR** (Pakistan).

**Stack:** Next.js 16 (App Router, Turbopack) · TypeScript · Tailwind CSS v4 ·
shadcn/ui (Base UI) · Supabase (Postgres + Auth + RLS) · TanStack Query ·
react-hook-form + zod · Vitest

## Features

| Page | What it does |
| --- | --- |
| Sign up / Log in | Phone number (+974 / +92) and a 6-digit PIN. No SMS. |
| Dashboard | Salary, Balance, Expenses, Sent, Personal and Family Savings for any month |
| Profile | Name, phone, PIN change, salary with live PKR conversion and history |
| Expenses | Daily / Weekly / Monthly tabs with totals |
| Sent | Sends with charity/debt/installments/others allocations, locked exchange rate, family split table |
| Charity, Installments, Others | Pool cards (Allocated / Used / Remaining) fed from the Sent page; Others adds many rows at once |
| Debt | Taken / Given tabs with one row per person still owed; **History** (everyone incl. cleared, Excel-style month columns); **person page** with every debt and installment and a running balance |
| Personal / Family Savings | Saved amounts deducted from the balance |
| Settings | Default currency, theme, number format (1,234,567 or 12,34,567), refresh rate, delete data/account |

## Setup

### 1. Install

```bash
npm install
cp .env.example .env.local
```

Fill in `.env.local` from Supabase Dashboard → Project Settings → API:

| Variable | Value |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | `https://<project-ref>.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | `sb_publishable_…` (or set `NEXT_PUBLIC_SUPABASE_ANON_KEY`) |
| `EXCHANGE_RATE_API_URL` | Optional. Defaults to `https://open.er-api.com/v6/latest/QAR` |

The service-role key is never used. Don't add it to this app.

### 2. Database

1. Supabase Dashboard → **SQL Editor → New query**, then run each file in
   `supabase/migrations/` **in order** (paste the whole file → **Run**):
   1. `20261017000000_init.sql`: tables, RLS, views, functions
   2. `20261018000000_debt_people.sql`: groups debts by person (migrates existing debts)

   (CLI alternative: `supabase link` then `supabase db push`.)
2. **Authentication → Sign In / Providers → Email**:
   - **Enable Email provider: ON**
   - **Confirm email: OFF** → **Save**

   The app maps a phone number to a hidden login address such as
   `97455123456@expense.local` with the PIN as the password, so no email or
   SMS is ever sent. If "Confirm email" stays on, signup fails.

### 3. Run

```bash
npm run dev      # http://localhost:3000
```

## Scripts

| Command | Purpose |
| --- | --- |
| `npm run dev` | Development server |
| `npm run build` / `npm start` | Production build and server |
| `npm test` | Unit tests (balance, pools, debt payments, currency, validation) |
| `npm run typecheck` | TypeScript check |
| `npm run lint` | ESLint |
| `npm run icons` | Regenerate PWA icons from `scripts/generate-icons.mjs` |

If `npm run build` runs out of memory, limit build workers:
`NEXT_BUILD_CPUS=2 npm run build` (PowerShell: `$env:NEXT_BUILD_CPUS=2; npm run build`).

## Deploy to Vercel

1. Push the project to a GitHub repository.
2. In Vercel: **Add New → Project** → import the repository. The framework
   preset is detected as Next.js; keep the default build settings.
3. Under **Environment Variables**, add `NEXT_PUBLIC_SUPABASE_URL`,
   `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` and (optionally)
   `EXCHANGE_RATE_API_URL` for Production and Preview.
4. **Deploy**.
5. In Supabase → **Authentication → URL Configuration**, set **Site URL** to
   your Vercel URL (e.g. `https://expense-tracker.vercel.app`).
6. Open the site on your phone and install it:
   - **Android (Chrome):** tap **Install** in the banner, or menu → *Install app*.
   - **iPhone (Safari):** Share → **Add to Home Screen**.

## How it works

### Architecture

```
src/
  app/
    (auth)/         login, signup, auth server actions
    (app)/          signed-in pages + actions.ts (all data writes)
    api/rate/       GET exchange rate
    offline/        page shown by the service worker when offline
    manifest.ts     PWA manifest
  components/
    app/            shell, navigation, cards, tables, pool components
    form/           form dialog, money/select/category fields
    ui/             shadcn/ui components
  lib/
    calc/           pure business logic (balance, pools, debts) + tests
    validation/     zod schemas shared by forms and server actions
    rates/          swappable exchange-rate provider + cached lookup
    supabase/       browser, server and proxy clients
    queries.ts      TanStack Query read hooks + useAction for writes
  proxy.ts          route protection (Next 16's name for middleware)
supabase/migrations/ SQL schema, RLS policies, views, functions
public/sw.js        service worker
```

- **Reads** go from the browser straight to Supabase; Row Level Security
  restricts every query to the signed-in user's rows.
- **Writes** go through server actions in `src/app/(app)/actions.ts`, which
  re-validate input with zod and map database errors to friendly messages.
- **Security in depth:** RLS on every table, `user_id` defaulting to
  `auth.uid()`, composite foreign keys so a payment can't point at another
  user's debt, check constraints on amounts and allocations, and a trigger that
  blocks debt overpayment.

### Business rules

- **Balance** = Salary − Expenses − Sent − Personal Savings − Family Savings
  for the selected month; 0 until a salary is saved. A salary applies from its
  month until a newer one is saved.
- **Sends** lock the QAR→PKR rate at save time (`rate_qar_pkr`), so history
  never changes. Allocations can't exceed the amount; the rest is the family
  portion.
- **Pools** (charity, debt, installments, others): allocated from sends at each
  send's rate; entries are deducted; going over shows a warning but is allowed.
  The debt pool is used by repayments of debts you **took**.
- **Debts are grouped by person** (`debt_people`, names unique ignoring case).
  A person can lend or borrow many times; payments belong to the person and
  side (taken/given), so installments reduce their total. Adding a debt with
  an existing name asks "Is this the same person?". Fully paid people leave
  the Debt page but stay in History.
- **Debt payments** can never exceed what's remaining for that person
  (checked in the UI, server and by a database trigger).

### Exchange rate

`GET /api/rate` fetches QAR→PKR from open.er-api.com, cached for an hour with
Next.js `"use cache"`, and saves it to `exchange_rates` via the throttled
`record_exchange_rate()` function. If the provider fails, it returns the last
saved rate with `stale: true` and the UI shows "Using last known rate (date)".
To change provider, edit `src/lib/rates/provider.ts`.

### PWA

- `src/app/manifest.ts` → `/manifest.webmanifest` (standalone, maroon theme,
  192/512/maskable icons); Apple touch icon and meta tags in the root layout.
- `public/sw.js` precaches the offline page and icons, serves hashed static
  assets cache-first, and falls back to `/offline` for navigations without a
  connection. It never caches `/api/*` or Supabase requests.
- The service worker registers in production builds only (`npm run build &&
  npm start` to test locally).

> **Why not Serwist?** Next 16 builds with Turbopack and enables Cache
> Components. Serwist's Turbopack integration relies on route segment config
> (`dynamic = "force-static"`) that Cache Components rejects, so a small
> hand-written worker is used instead.

## Notes for contributors

- Next.js 16 renamed `middleware.ts` to `proxy.ts`.
- `cacheComponents` is on: server code that reads cookies, or client code that
  reads the current date during render, must sit inside `<Suspense>`. The
  signed-in layout wraps everything in one boundary.
- `src/lib/database.types.ts` mirrors the migration. Regenerate it with the
  Supabase CLI if you change the schema.
- Add shadcn/ui components with `npx shadcn@latest add <name>`. The shadcn
  package isn't a dependency; its Tailwind helpers live in
  `src/styles/shadcn-tailwind.css`.
- `vendor/braces` is a locally patched copy of `braces` (no upstream fix for
  GHSA-vfj7-8cjw-p6xm yet), wired in via `overrides`. See `vendor/README.md`.
