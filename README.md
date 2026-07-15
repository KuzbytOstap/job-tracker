# Job Tracker

## Overview

Job Tracker is a personal, single-user Kanban application for tracking job applications from first contact through offer. It provides a Jira-style status board, focused per-status pages, status history, and funnel statistics.

## Features

- Jira-style status board
- Focused status pages
- Date-grouped applications
- Global search and sorting
- Create and edit flows
- Status pipeline
- Test-task tracking
- Status history
- Computed 21-day auto-ignore
- Reactivation
- Statistics funnel
- Responsive design
- Automatic system dark mode
- Installable web-app metadata

## Tech stack

- Next.js 15 App Router
- TypeScript
- Tailwind CSS v4
- shadcn/ui
- TanStack Query
- Motion
- Prisma 7
- PostgreSQL
- Neon
- Vitest
- Vercel

## Local setup

1. Install dependencies:

   ```bash
   npm install
   ```

2. Create a `.env` file with the required environment variables (see below).

3. Generate the Prisma client:

   ```bash
   npm run db:generate
   ```

4. Apply migrations to your local/development database:

   ```bash
   npm run db:migrate
   ```

5. Seed the database with sample data (optional):

   ```bash
   npm run db:seed
   ```

6. Start the development server:

   ```bash
   npm run dev
   ```

## Environment variables

```env
DATABASE_URL="postgresql://..."
DIRECT_URL="postgresql://..."
APP_SECRET="added during the privacy-gate step"
```

- `DATABASE_URL` — the connection string used by the running application at runtime (Prisma Client via `@prisma/adapter-pg`). Use the Neon **pooled** connection string. Server-only; never exposed to the browser.
- `DIRECT_URL` — the connection string used by Prisma CLI commands (`migrate`, `studio`). Use the Neon **direct, non-pooled** connection string. Server-only; never exposed to the browser.
- `APP_SECRET` — reserved for the upcoming privacy-gate/authentication step. Not yet used by the application.

## Database commands

- `npm run db:generate` — regenerate the Prisma Client from `prisma/schema.prisma`.
- `npm run db:migrate` — create and apply a migration against the development database (`prisma migrate dev`).
- `npm run db:migrate:deploy` — apply committed migrations to a target database without generating new ones (`prisma migrate deploy`). Safe for production.
- `npm run db:seed` — seed the database with sample data (`prisma/seed.ts`). Development use only.
- `npm run db:studio` — open Prisma Studio against `DIRECT_URL`.

## Quality commands

- `npm run test:run` — run the Vitest suite once.
- `npm run lint` — run ESLint.
- `npm run typecheck` — run the TypeScript compiler in `--noEmit` mode.
- `npm run build` — produce a production build.

## Auto-ignore rule

An application in a non-terminal status becomes **effectively** `IGNORED` once more than 21 days have passed since its `lastActivityAt` timestamp. Exactly 21 days does not trigger auto-ignore — the threshold must be exceeded.

`OFFER`, `REJECTED`, and a stored `IGNORED` status are terminal and are never overridden by the auto-ignore computation.

The auto-ignore status is computed on read (in the API response as `effectiveStatus` / `isAutoIgnored`) and never written back to the stored `status` field. There is no cron job or background process involved.

Reactivating an application bumps `lastActivityAt` to the current time so it is no longer auto-ignored, without creating a fake entry in its status history.

## PWA behavior

The app ships a web app manifest and app icons, so it supports "Add to Home Screen" and standalone display where the browser allows it. There is no service worker, and the application does not support offline use.

## Deployment overview

1. Push the repository to GitHub.
2. Create or select a Neon production database.
3. Configure the Vercel project's environment variables (`DATABASE_URL`, and `DIRECT_URL` if running migrations from Vercel).
4. Run production migrations with `npm run db:migrate:deploy` against the production database.
5. Deploy the application on Vercel.

## Privacy warning

This application currently has **no authentication**. Anyone with the deployment URL can view and modify the tracker's data. Do not share the production URL publicly before the privacy gate is implemented.
