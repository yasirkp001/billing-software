# Hi Wood Billing

Billing & operations management system for **Hi Wood**, built phase-wise.

**Stack:** Next.js (App Router) · TypeScript · Tailwind CSS · SQLite + Prisma · JWT auth (HTTP-only cookies)

---

## Phase status

- ✅ **Phase 1 — Foundation** *(current)*
  - Authentication (JWT in HTTP-only cookie, route middleware)
  - Dashboard with live counts
  - Customers (CRUD)
  - Vehicles (CRUD)
  - Drivers (CRUD)
- ⏳ **Phase 2** — Booking, Trip Sheet, Invoice, Billing calculations
- ⏳ **Phase 3** — Payments, Customer Ledger, Outstanding, Expenses
- ⏳ **Phase 4** — Reports, Settings, User Roles, Backup

---

## Getting started

### 1. Configure environment

Copy the example env file (Prisma and Next.js both read `.env`):

```bash
cp .env.example .env
```

| Variable | Description |
| --- | --- |
| `DATABASE_URL` | SQLite file path. Default `file:./dev.db` (lives in `prisma/`). |
| `JWT_SECRET` | Long random string used to sign auth tokens |
| `SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD` / `SEED_ADMIN_NAME` | Default admin account |

### 2. Install & create the database

```bash
npm install          # also runs `prisma generate`
npm run db:push      # creates prisma/dev.db from the schema
```

### 3. Run

```bash
npm run dev
```

Open <http://localhost:3000>.

### 4. Create the admin account (first time only)

Visit <http://localhost:3000/api/seed> once. It creates the admin user from your
`SEED_ADMIN_*` env values (only if no users exist yet). Then log in at `/login`.

> Default dev login: **admin@hiwood.com** / **admin123**

### Useful scripts

| Command | What it does |
| --- | --- |
| `npm run dev` | Start the dev server |
| `npm run build` | Production build (runs `prisma generate` first) |
| `npm run db:push` | Sync the SQLite database with `prisma/schema.prisma` |
| `npm run db:studio` | Open Prisma Studio to browse/edit data |

---

## Project structure

```
prisma/
  schema.prisma           # Database models (User, Customer, Vehicle, Driver)
  dev.db                  # SQLite database file (git-ignored)
src/
  app/
    (dashboard)/          # Authenticated app shell (sidebar + topbar)
      dashboard/          # Overview with live counts
      customers/ vehicles/ drivers/   # CRUD modules
    api/
      auth/               # login / logout / me
      seed/               # one-time admin seed
      customers/ vehicles/ drivers/   # REST endpoints
    login/                # Public login page
  components/
    crud/                 # Reusable table + form engine (ResourceManager)
    ui/                   # Button, Field, Modal primitives
    AppShell / Sidebar / Topbar
  lib/
    db.ts                 # Prisma client singleton
    jwt.ts                # Edge-safe JWT sign/verify (used by middleware)
    auth.ts               # Cookie/session helpers
    api.ts                # Response helpers + auth guard
    crud.ts               # Generic Prisma REST handlers + field coercion
    resources.ts          # Per-resource Prisma delegate + field specs
  middleware.ts           # Protects /dashboard, /customers, /vehicles, /drivers
```

## How the CRUD modules work

Each module is just configuration:

- **Schema** — a model in `prisma/schema.prisma`.
- **API** — a few lines wiring the Prisma delegate + field spec (`lib/resources.ts`)
  into the generic handlers in `lib/crud.ts` (list with search, create, get, update,
  delete — all auth-guarded, with type coercion).
- **UI** — a page that passes `columns` + `fields` to `components/crud/ResourceManager`,
  which renders the table, search box, and add/edit modal.

Adding a new module in later phases is mostly repeating this pattern.

## Deployment

Deploy to [Vercel](https://vercel.com): import the repo and set the env vars in the
project settings.

> **Note on SQLite:** a SQLite file is great for local/single-server use, but it does
> **not** persist on Vercel's serverless filesystem. For cloud hosting, either run on a
> persistent server (e.g. a VPS with a volume), use [Turso](https://turso.tech)
> (SQLite-compatible, edge), or switch the Prisma `datasource` to Postgres. The app code
> stays the same — only `schema.prisma` and `DATABASE_URL` change.
# BILLINGHIWOOD
# HI-WOOD-BILLING-
# HIWOODBILLING
# billing-software
