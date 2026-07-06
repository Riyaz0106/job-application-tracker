# Job Application Tracker

A full-stack TypeScript application for tracking job applications. This
repository is a **monorepo** managed with npm workspaces.

> **Status: Phase 1 — monorepo foundation.**
> Only the project scaffolding exists so far: a React client, an Express API
> with a health check, and shared tooling. The database, API layer, auth, and
> AI features described below under _Planned_ are **not built yet**.

## Stack

| Area      | Technology                                              |
| --------- | ------------------------------------------------------- |
| Frontend  | React 18, TypeScript, Vite, Tailwind CSS v3             |
| Backend   | Node.js, Express, TypeScript                            |
| Tooling   | npm workspaces, ESLint 9 (flat config), Prettier, `tsx` |
| _Planned_ | tRPC, Prisma + PostgreSQL, JWT auth, Anthropic API      |
| _Planned_ | Docker, GitHub Actions, Railway                         |

## Repository layout

```
.
├── client/              # React + Vite + Tailwind frontend
│   ├── src/
│   │   ├── App.tsx       # placeholder page
│   │   ├── main.tsx      # React entry point
│   │   └── index.css     # Tailwind directives
│   ├── index.html
│   ├── vite.config.ts    # React plugin + dev proxy to the API
│   ├── tailwind.config.js
│   ├── postcss.config.js
│   └── tsconfig*.json
├── server/              # Express + TypeScript API
│   └── src/
│       ├── index.ts      # entry: starts the HTTP server
│       ├── app.ts        # builds/configures the Express app
│       ├── config/env.ts # centralized env parsing
│       └── routes/
│           └── health.ts # GET /health
├── tsconfig.base.json   # strict TS options shared by both workspaces
├── eslint.config.mjs    # one flat ESLint config for the whole repo
├── .prettierrc.json
├── .env.example         # copy to .env (git-ignored)
└── package.json         # workspaces + root scripts
```

## Prerequisites

- **Node.js >= 20** (developed on Node 22)
- **npm >= 9** (ships with recent Node; provides workspace support)

## Install

Clone the repo, then from the root install **all** workspace dependencies with a
single command (npm workspaces hoists shared deps into the root `node_modules`):

```bash
npm install
```

Optionally create your local env file (values are optional in Phase 1 — sensible
defaults apply if it's missing):

```bash
cp .env.example .env
```

## Run in development

Start the API and the frontend together from the root:

```bash
npm run dev
```

This uses `concurrently` to run both dev servers with colored, prefixed logs:

- **API** → http://localhost:4000 (hot-reloaded by `tsx watch`)
- **Client** → http://localhost:5173 (Vite HMR)

Open http://localhost:5173 — you should see the **Job Application Tracker**
placeholder page styled with Tailwind.

Run just one side if you prefer:

```bash
npm run dev:server   # API only
npm run dev:client   # frontend only
```

The Vite dev server proxies any `/api/*` request to the API on port 4000, so the
browser talks to a single origin in development (no CORS setup needed).

## Other scripts (run from the root)

| Command                | What it does                                       |
| ---------------------- | -------------------------------------------------- |
| `npm run build`        | Type-check + build client, then compile the server |
| `npm run lint`         | ESLint across both workspaces                      |
| `npm run lint:fix`     | ESLint with auto-fix                               |
| `npm run format`       | Format the repo with Prettier                      |
| `npm run format:check` | Check formatting without writing                   |

## Health check

With the API running:

```bash
curl http://localhost:4000/health
# {"status":"ok"}
```

## Planned (future phases — not yet implemented)

tRPC API layer · Prisma + PostgreSQL · JWT multi-user auth · Anthropic AI
features · Docker + Docker Compose · GitHub Actions CI · Railway deployment.
