# Job Application Tracker

A full-stack TypeScript application for tracking job applications. This
repository is a **monorepo** managed with npm workspaces.

> **Status: Phase 2 — database layer.**
> On top of the Phase 1 foundation, the server now has Prisma + PostgreSQL: a
> schema (User / Application / Interview), a migration, a singleton Prisma
> Client, and a temporary `GET /db-check` route to prove the DB connection. The
> API layer, auth, and AI features under _Planned_ are **not built yet**.

## Stack

| Area      | Technology                                              |
| --------- | ------------------------------------------------------- |
| Frontend  | React 18, TypeScript, Vite, Tailwind CSS v3             |
| Backend   | Node.js, Express, TypeScript                            |
| Database  | PostgreSQL via Prisma 6 (`@prisma/client`)              |
| Tooling   | npm workspaces, ESLint 9 (flat config), Prettier, `tsx` |
| _Planned_ | tRPC, JWT auth, Anthropic API                           |
| _Planned_ | Docker, GitHub Actions, Railway                         |

## Repository layout

```
.
├── client/              # React + Vite + Tailwind frontend
│   └── src/             # App.tsx, main.tsx, index.css
├── server/              # Express + TypeScript API
│   ├── prisma/
│   │   ├── schema.prisma # models: User, Application, Interview + Status enum
│   │   └── migrations/   # versioned SQL migrations (created by you — see below)
│   ├── .env.example      # copy to server/.env (DATABASE_URL, PORT, NODE_ENV)
│   └── src/
│       ├── index.ts      # entry: starts the HTTP server
│       ├── app.ts        # builds/configures the Express app
│       ├── config/env.ts # loads server/.env, centralized config
│       ├── db/prisma.ts   # singleton Prisma Client (@prisma/client)
│       └── routes/
│           ├── health.ts  # GET /health
│           └── dbCheck.ts # GET /db-check  (TEMPORARY, Phase 2)
├── tsconfig.base.json   # strict TS options shared by both workspaces
├── eslint.config.mjs    # one flat ESLint config for the whole repo
├── .env.example         # CLIENT env (VITE_*) — copy to .env
└── package.json         # workspaces + root scripts
```

## Prerequisites

- **Node.js >= 20** (developed on Node 22)
- **npm >= 9** (ships with recent Node; provides workspace support)
- **PostgreSQL** running locally, with an **empty database** created (this project
  assumes one named `job_tracker`). Any local Postgres works (pgAdmin, Postgres.app,
  Docker, etc.). Docker/managed Postgres come in a later phase.

## Install

From the repo root, install **all** workspace dependencies with one command
(npm workspaces hoist shared deps into the root `node_modules`):

```bash
npm install
```

> On install, the server's `postinstall` runs `prisma generate`, which builds the
> Prisma Client into `node_modules` (imported as `@prisma/client`). It needs no database.

## Database setup (Phase 2)

The server reads its config from **`server/.env`** (git-ignored). Both the running
server and the Prisma CLI use this one file.

**1. Create `server/.env` from the example and set your real credentials:**

```bash
cp server/.env.example server/.env
```

Then edit `server/.env` and set `DATABASE_URL` to your local Postgres connection
string. The shape is:

```
DATABASE_URL="postgresql://USER:PASSWORD@localhost:5432/job_tracker?schema=public"
```

- `USER` / `PASSWORD` — your local Postgres role and its password
- `localhost:5432` — the default Postgres host/port
- `job_tracker` — the empty database you created

**2. Create and apply the first migration** (run from the `server/` workspace):

```bash
npm run db:migrate --workspace=server -- --name init
```

This runs `prisma migrate dev`, which:

- creates `server/prisma/migrations/<timestamp>_init/migration.sql` (the versioned
  SQL that creates the `User`, `Application`, `Interview` tables + `Status` enum),
- applies it to your database,
- regenerates the Prisma Client.

The migration SQL is committed to git so the schema history is reproducible.

> **`prisma migrate dev` vs `prisma db push`:** `migrate dev` creates a durable,
> reviewable SQL migration file and records it in a `_prisma_migrations` table —
> use it so schema changes are versioned and deployable (`prisma migrate deploy`)
> in later phases. `db push` shoves the schema straight into the DB with **no**
> migration file or history — handy for throwaway prototyping, but not what we want
> for a schema we intend to keep.

**3. Verify the connection end to end:**

```bash
npm run dev            # from the root: starts client + server together
curl http://localhost:4000/db-check
# {"users":0}
```

`GET /db-check` runs a trivial `prisma.user.count()`. Getting `{"users":0}` proves
the app talks to Postgres. (This route is temporary and will be removed in a later
phase.)

### Handy Prisma scripts (run with `--workspace=server`)

| Command       | What it does                                      |
| ------------- | ------------------------------------------------- |
| `db:migrate`  | `prisma migrate dev` — create + apply a migration |
| `db:generate` | `prisma generate` — regenerate the client         |
| `db:studio`   | `prisma studio` — browse your data in the browser |

## Run in development

Start the API and the frontend together from the root:

```bash
npm run dev
```

- **API** → http://localhost:4000 (hot-reloaded by `tsx watch`)
- **Client** → http://localhost:5173 (Vite HMR)

The Vite dev server proxies `/api/*` to the API on port 4000, so the browser talks
to a single origin in development (no CORS setup needed).

## Other scripts (run from the root)

| Command                | What it does                                       |
| ---------------------- | -------------------------------------------------- |
| `npm run build`        | Type-check + build client, then compile the server |
| `npm run lint`         | ESLint across both workspaces                      |
| `npm run format`       | Format the repo with Prettier                      |
| `npm run format:check` | Check formatting without writing                   |

## Endpoints

With the API running:

```bash
curl http://localhost:4000/health     # {"status":"ok"}
curl http://localhost:4000/db-check    # {"users":0}   (TEMPORARY, Phase 2)
```

## Planned (future phases — not yet implemented)

tRPC API layer · JWT multi-user auth · Anthropic AI features · Docker + Docker
Compose · GitHub Actions CI · Railway deployment.
