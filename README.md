# Job Application Tracker

A full-stack TypeScript application for tracking job applications. This
repository is a **monorepo** managed with npm workspaces.

> **Status: Phase 6 — file uploads.**
> On top of the PIPELINE board (Phases 1–5.5), each application can now carry a
> **CV and cover letter** stored in **Cloudinary**, with drag-and-drop upload,
> progress, remove-with-confirmation, and a quiet 📎 on the board card. A `.txt`
> job description can be imported straight into the form. The AI features under
> _Planned_ are **not built yet**.

## Stack

| Area      | Technology                                               |
| --------- | -------------------------------------------------------- |
| Frontend  | React 18, TypeScript, Vite, Tailwind CSS v3              |
| UI        | Design tokens (CSS vars), IBM Plex fonts, Framer Motion  |
| Backend   | Node.js, Express, TypeScript                             |
| API       | tRPC v11 + Zod + superjson, TanStack Query on the client |
| Auth      | JWT (`jsonwebtoken`) + `bcryptjs` password hashing       |
| Database  | PostgreSQL via Prisma 6 (`@prisma/client`)               |
| Files     | Cloudinary (`raw`) + `multer`, server-side only          |
| Tooling   | npm workspaces, ESLint 9 (flat config), Prettier, `tsx`  |
| _Planned_ | Anthropic API, Excel export                              |
| _Planned_ | Docker, GitHub Actions, Railway                          |

## Repository layout

```
.
├── client/              # React + Vite + Tailwind frontend
│   └── src/
│       ├── index.css     # DESIGN TOKENS (CSS vars) + fonts + base — single source
│       ├── trpc.ts       # tRPC React client + inferred RouterOutputs/Inputs types
│       ├── main.tsx      # providers; superjson + JWT header on the tRPC link
│       ├── App.tsx       # auth gate: auth screen when logged out, else the board
│       ├── lib/          # status metadata, date format, motion tokens, token store
│       └── components/
│           ├── AuthForm.tsx      # polished login / register
│           ├── ui/               # Button, fields, Modal, feedback (tokens only)
│           ├── board/            # Board, FunnelBar (signature), Column, Card
│           └── application/      # ApplicationForm, ApplicationDetail, InterviewSection
├── server/              # Express + TypeScript API
│   ├── prisma/
│   │   ├── schema.prisma # models: User, Application, Interview + Status enum
│   │   └── migrations/   # versioned SQL migrations (created by you — see below)
│   ├── .env.example      # copy to server/.env (DATABASE_URL, JWT_SECRET, PORT, NODE_ENV)
│   └── src/
│       ├── index.ts      # entry: starts the HTTP server
│       ├── app.ts        # Express app; mounts tRPC at /api/trpc
│       ├── config/env.ts # loads server/.env, centralized config
│       ├── db/prisma.ts   # singleton Prisma Client (@prisma/client)
│       ├── auth/
│       │   ├── password.ts # bcryptjs hash / verify
│       │   └── jwt.ts       # sign / verify JWT (7-day expiry)
│       ├── uploads/
│       │   ├── fileRules.ts  # type/size rules — shared with the client
│       │   └── cloudinary.ts # ONLY place credentials are used (upload/destroy)
│       ├── trpc/
│       │   ├── trpc.ts     # initTRPC: router, publicProcedure, protectedProcedure
│       │   ├── context.ts  # per-request context: ctx.prisma + ctx.user (from JWT)
│       │   └── routers/
│       │       ├── _app.ts        # root appRouter + exported AppRouter type
│       │       ├── auth.ts         # register / login / me
│       │       ├── applications.ts # CRUD + attachFile/removeFile, scoped to ctx.user.id
│       │       └── interviews.ts   # CRUD, scoped through the parent application
│       └── routes/
│           ├── health.ts  # GET /health
│           ├── uploads.ts # POST /api/uploads/:applicationId/:kind (multipart)
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

Also set **`JWT_SECRET`** (used to sign auth tokens — see Phase 4 below) to a long
random string:

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"
```

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

> **Note:** `DateTime` fields currently serialize as **ISO strings** over the wire
> (no data transformer yet); a `superjson` transformer will be added when the UI
> renders dates. As of Phase 4 the `applications`/`interviews` procedures require
> authentication (below) and are scoped to the logged-in user.

## Authentication (Phase 4)

Multi-user auth with JWTs. Passwords are hashed with **bcryptjs** — never stored in
plaintext, never returned to the client.

**Flow**

1. `auth.register` / `auth.login` verify credentials and return a **signed JWT**
   (7-day expiry) plus `{ id, email }`.
2. The client stores the token (in memory + `localStorage`) and attaches it to every
   tRPC request as an `Authorization: Bearer <token>` header.
3. The tRPC **context** reads that header, verifies the token, looks the user up, and
   sets `ctx.user` (or `null`).
4. **`protectedProcedure`** throws `UNAUTHORIZED` when `ctx.user` is null and narrows
   the type so `ctx.user` is non-null downstream. All `applications` and `interviews`
   procedures are protected and filter by `ctx.user.id`, so users only ever see and
   edit **their own** data.

**Setup:** make sure `JWT_SECRET` is set in `server/.env` (see Database setup above).

> **Security notes (honest trade-offs):**
>
> - **Token in `localStorage`** is readable by any script on the page, so an XSS bug
>   could steal it. An httpOnly cookie is more secure but needs CSRF handling —
>   deferred.
> - **7-day expiry** because there's no refresh-token flow yet; production would pair
>   a short-lived access token with a refresh token.
> - Login returns a **generic** "invalid email or password" so attackers can't probe
>   which emails are registered.

### Verify Phase 4

1. `npm run dev`, open http://localhost:5173 — you should see the **login / register**
   form.
2. **Register** a user (email + password ≥ 8 chars). You land on the dashboard with an
   empty list; click **"Add test application"** — it appears.
3. In **pgAdmin**, confirm the new `Application.userId` matches your new `User` row
   (not `dev@local.test`).
4. Click **Log out** → back to the form. **Register a different** user.
5. The second user's list is **empty** — you do **not** see the first user's
   application. In pgAdmin, each `Application.userId` points to its own owner.

## UI — PIPELINE (Phase 5)

A dark operations console for one engineer's job search.

**Design tokens are the single source of truth.** All colours, radii, spacing,
and motion values are CSS custom properties in `client/src/index.css` (documented
in a block at the top), scoped under `:root[data-theme='dark']` with **role-based**
names (`--color-background`, `--color-surface`, `--color-signal`, …). `tailwind.config.js`
maps semantic classes (`bg-surface`, `text-signal`, `rounded-card`, `gap-md`,
`duration-fast`) onto those vars, so **components never hardcode a hex/px/ms** and a
second theme would be a values-only change (no theme toggle is built yet).

**The board.** One column per `Status`; the signature **pipeline funnel** at the top
summarises the whole search (counts derived client-side from `applications.list` — no
extra endpoint). Cards show company, role, applied date, and a match-score ring.

**Moving a card** uses a native status `<select>` on the card (keyboard/screen-reader
accessible, touch-native, 44px targets) — not drag-and-drop. The change is
**optimistic** (the card moves instantly, rolls back on error) and **Framer Motion**
animates the card _travelling_ to its new column (`layout` + `layoutId`). Framer Motion
is used **only** for the card travel and modal enter/leave; all other motion
(hover/focus, skeletons, buttons) is plain CSS. Everything respects
`prefers-reduced-motion` (animations degrade to instant).

**Everything else:** create/edit form with inline validation, a right slide-over detail
view with interview add/edit/delete and delete-with-confirmation, loading skeletons, and
inline error messages.

### Verify Phase 5

1. `npm run dev`, open http://localhost:5173 — the **PIPELINE** auth screen.
2. Register/log in → the **board**. Click **+ New**, fill the form (try submitting empty
   to see inline errors), create an application — it appears in its column.
3. On a card, change the **status dropdown** — the card **animates to the new column**
   and persists (refresh to confirm).
4. Click a card → the **detail slide-over**; add an **interview round**; **Edit** or
   **Delete** (with confirmation).
5. Narrow the window to phone width — columns scroll horizontally; tab through with the
   keyboard to see focus rings. Enable OS "reduce motion" — transitions become instant.

## File uploads (Phase 6)

Attach a **CV** and a **cover letter** to any application. The files live in
**Cloudinary**; PostgreSQL stores only metadata (filename, URL, size, upload date,
and Cloudinary's `public_id`).

### Setup

Add your Cloudinary credentials to **`server/.env`** (copy the keys from
`server/.env.example`; the file is git-ignored):

```
CLOUDINARY_CLOUD_NAME=your-cloud-name
CLOUDINARY_API_KEY=000000000000000
CLOUDINARY_API_SECRET=your-api-secret
```

Find all three on your Cloudinary dashboard under **Account Details / API Keys**.
Until they're set, uploads fail with a clear message naming the missing variables.

> **The API secret never reaches the browser.** It's read only by
> `server/src/uploads/cloudinary.ts`, from `server/.env` — a file Vite never loads,
> with no `VITE_` prefix (Vite only exposes `VITE_*` variables). The browser posts
> files to **our** API, and this server does the Cloudinary call. The alternative —
> unsigned browser-to-Cloudinary uploads — would have to publish the cloud name and
> an upload preset, letting anyone upload to the account.

### Accepted files

| Rule       | Value                                                      |
| ---------- | ---------------------------------------------------------- |
| Types      | **PDF, DOCX, XLSX, TXT**                                   |
| Max size   | **5MB**                                                    |
| Validation | file **extension** _and_ declared **MIME type** must agree |

Extension alone is trivially renamed, and the MIME type is client-supplied too, so
neither is trusted on its own — requiring them to match raises the bar. (Files are
stored as Cloudinary `raw` resources and never executed; the real containment is
that plus the size cap and the ownership check.) `application/octet-stream` is
tolerated for `.docx`/`.xlsx` only, because Windows and several browsers genuinely
report that for Office documents. The rules live in one place —
`server/src/uploads/fileRules.ts` — imported by both the server and the client, so
the message you see before uploading is the one the server would give you.

### Why uploads aren't a tRPC procedure

tRPC serialises its inputs as JSON. Binary could only ride that as base64: ~33%
bigger, the whole file held twice in memory, and no upload-progress events. So the
work is split:

```
browser ──multipart POST──►  /api/uploads/:applicationId/:kind   (Express + multer)
                             auth → ownership → size/type → Cloudinary
                                        │
                                        └─► returns { fileName, url, publicId, fileSize }
                                                        │
browser ──tRPC mutation──►  applications.attachFile  ───┘   (writes the database)
```

**The boundary:** the Express route moves _bytes_ and returns metadata; **tRPC owns
every database write**, so the app keeps one type-safe data layer. Auth and the
ownership check run _before_ multer, so an anonymous or non-owner request never
streams a byte into the process.

Removal (`applications.removeFile`) deletes from Cloudinary **first**, then clears
the columns — if storage deletion fails the row is left pointing at the file rather
than orphaning it. Replacing an attachment destroys the file it supersedes, and
deleting an application removes its files too.

### Stored files are private

Attachments are CVs — personal data — so they are **not** publicly readable: fetching
a stored Cloudinary URL directly returns `401`. Viewing one goes through
`applications.fileUrl`, which checks that you own the application and then signs a
**download link that expires after five minutes**. The signature is computed on the
server with the API secret, so nothing long-lived is ever handed to the browser.

> If you'd rather serve files from plain public URLs, allow `raw` delivery under
> Cloudinary → Settings → Security. Be deliberate about it: it makes every uploaded
> CV readable by anyone who has (or guesses) the URL.

### TXT job-description import (not an attachment)

The job-description field has its own drop zone (same visual language as the
attachment zones): **drop a `.txt` file anywhere on the field, or browse for one**.
It's read **in the browser** and its text fills the textarea, where you can edit it
before saving. Nothing is uploaded: the text belongs in the `jobDescription` column,
which is what Phase 7's AI scoring will read.

### Attachments while creating (Phase 6.5)

The create form stages a CV and cover letter _before_ the application exists: files
are held in memory (validated for type and size the moment you pick them), then
uploaded once the application has an id. If the application is created but an upload
fails, **the application is kept** — your typed details are worth more than the
attachment — and a single toast names what failed while the detail slide-over opens
so you can retry there.

### Verify Phase 6

1. Set the three `CLOUDINARY_*` variables in `server/.env`, then `npm run dev`.
2. Open an application → **Attachments** → drop a PDF on the **CV** zone (or _browse
   files_). Watch the progress bar; a toast confirms it, and the card on the board
   gains a 📎.
3. **Rejected oversize:** try a file over 5MB → _"File is 8MB — the limit is 5MB."_,
   no upload attempted.
4. **Rejected type:** try a `.png` → _"“.png” files aren't supported — PDF, DOCX, XLSX
   and TXT only."_
5. Click the filename or **View** — a signed, five-minute link opens the file in a
   new tab. (Pasting the raw Cloudinary URL from the database gives `401`, by design.)
6. **Remove** → confirm → toast. Check your Cloudinary **Media Library** (Folders →
   `job-tracker/<userId>/<applicationId>`): the file is gone, and the card's 📎
   disappears.
7. In **+ New**, click **Import .txt** and pick a `.txt` — the job description fills in
   and stays editable.

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

Anthropic AI features (match scoring, cover-letter generation) · Excel export ·
Docker + Docker Compose · GitHub Actions CI · Railway deployment.
