# Job Application Tracker

A full-stack TypeScript application for tracking job applications. This
repository is a **monorepo** managed with npm workspaces.

> **Status: Phase 3 — type-safe API layer (tRPC).**
> On top of Phases 1–2, the server exposes an end-to-end type-safe API with
> tRPC v11: `applications` and `interviews` routers (full CRUD, Zod-validated)
> backed by Prisma. The React client calls them through generated hooks with
> types inferred straight from the server — no hand-written API types. Auth, AI,
> and file uploads under _Planned_ are **not built yet**.

## Stack

| Area      | Technology                                              |
| --------- | ------------------------------------------------------- |
| Frontend  | React 18, TypeScript, Vite, Tailwind CSS v3             |
| Backend   | Node.js, Express, TypeScript                            |
| API       | tRPC v11 + Zod, TanStack Query (React) on the client    |
| Database  | PostgreSQL via Prisma 6 (`@prisma/client`)              |
| Tooling   | npm workspaces, ESLint 9 (flat config), Prettier, `tsx` |
| _Planned_ | JWT auth, Anthropic API, file uploads                   |
| _Planned_ | Docker, GitHub Actions, Railway                         |

## Repository layout

```
.
├── client/              # React + Vite + Tailwind frontend
│   └── src/
│       ├── trpc.ts       # tRPC React client (imports AppRouter TYPE from server)
│       ├── main.tsx      # mounts tRPC + React Query providers
│       └── App.tsx       # proof-of-life: list + "Add test application"
├── server/              # Express + TypeScript API
│   ├── prisma/
│   │   ├── schema.prisma # models: User, Application, Interview + Status enum
│   │   └── migrations/   # versioned SQL migrations (created by you — see below)
│   ├── .env.example      # copy to server/.env (DATABASE_URL, PORT, NODE_ENV)
│   └── src/
│       ├── index.ts      # entry: starts the HTTP server
│       ├── app.ts        # Express app; mounts tRPC at /api/trpc
│       ├── config/env.ts # loads server/.env, centralized config
│       ├── db/prisma.ts   # singleton Prisma Client (@prisma/client)
│       ├── trpc/
│       │   ├── trpc.ts     # initTRPC: router + publicProcedure
│       │   ├── context.ts  # per-request context (provides ctx.prisma)
│       │   └── routers/
│       │       ├── _app.ts        # root appRouter + exported AppRouter type
│       │       ├── applications.ts # CRUD (list/byId/create/update/delete)
│       │       └── interviews.ts   # CRUD by application
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

## API layer — tRPC (Phase 3)

The client and server share types with **zero** hand-written API definitions:

```
Prisma models  ->  tRPC routers (server)  ->  export type AppRouter
                                                     |   (type-only import)
                                                     v
                    React Query hooks (client)  <-  createTRPCReact<AppRouter>()
```

1. **Routers** (`server/src/trpc/routers/`) define procedures. Each validates its
   input with **Zod** and runs a **Prisma** query via `ctx.prisma` — the singleton
   provided by `context.ts`.
2. The root router's **type** is exported: `export type AppRouter = typeof appRouter`
   (the type, never the value).
3. The client does `import type { AppRouter }`. The bundler **erases** this import
   (no server code reaches the browser), but TypeScript uses it to infer every
   procedure's inputs and outputs. Change a model or a Zod schema and mismatched
   client calls stop compiling.
4. `@trpc/react-query` exposes each procedure as a **TanStack Query** hook —
   `trpc.applications.list.useQuery()`, `trpc.applications.create.useMutation()`.
   React Query caches results; after a mutation the client `invalidate()`s the list
   so it refetches.

tRPC is mounted at **`/api/trpc`**, reusing the existing Vite `/api` proxy — the
browser calls a same-origin URL and Vite forwards it to the server.

> **No auth yet:** `applications.create` needs a `userId`, so until Phase 4 it
> attaches every application to an auto-provisioned `dev@local.test` user. Also,
> `DateTime` fields currently serialize as **ISO strings** over the wire (no data
> transformer yet); a `superjson` transformer will be added when the UI renders
> dates.

### Verify Phase 3

1. `npm run dev` (starts client + server together).
2. Open http://localhost:5173 — you should see **"No applications yet."**
3. Click **"Add test application"** — a row (`Test Co — Test Role [APPLIED]`)
   appears immediately, no page reload.
4. Confirm it persisted: in **pgAdmin** open `job_tracker` → `Application` (or run
   `npm run db:studio --workspace=server`). You'll also see one `dev@local.test`
   row in `User`.

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
curl http://localhost:4000/db-check    # {"users":N}   (TEMPORARY, Phase 2)
curl http://localhost:4000/api/trpc/applications.list   # {"result":{"data":[...]}}
```

## Planned (future phases — not yet implemented)

JWT multi-user auth · Anthropic AI features · file uploads · Docker + Docker
Compose · GitHub Actions CI · Railway deployment.
