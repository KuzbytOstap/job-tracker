# Job Tracker

## Overview

Job Tracker is a personal, single-user Kanban application for tracking job applications from first contact through offer. It provides a Jira-style status board, focused per-status pages, status history, and funnel statistics.

## Features

- Google sign-in restricted to a single allowed account
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

2. Create a `.env` file from [`.env.example`](./.env.example) and fill in real values (see [Environment variables](#environment-variables) below).

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

## Authentication

The app is single-user and gated behind Google sign-in (Auth.js). Only the Google account whose email matches the server-only `ALLOWED_EMAIL` environment variable can sign in — there is no registration flow and no other account can ever get in.

- Sessions are self-contained, signed **JWT cookies** — there is no Auth.js database adapter and no `User`/`Account`/`Session` table in `prisma/schema.prisma`. Signing in doesn't touch the database at all.
- The allowlist is checked **twice, independently**: once in the Auth.js `signIn` callback (rejects the OAuth sign-in itself for any other account, so no session is ever issued), and again on every subsequent request via a shared `checkSession()` helper (`lib/auth.ts`) that re-validates `session.user.email` against `ALLOWED_EMAIL`.
- **Every page** (`/`, `/status/*`) is server-side gated by `app/(protected)/layout.tsx`, a Server Component that redirects to `/sign-in` when not authorized — not a client-side check.
- **Every API route** (`/api/applications/*`, `/api/stats`) independently calls the same `checkSession()` helper before doing anything else. An unauthenticated request gets `401`; an authenticated request from a session that doesn't match `ALLOWED_EMAIL` gets `403`. API routes never redirect.
- `/api/auth/[...nextauth]` (the sign-in/callback/sign-out machinery) and `/sign-in` itself stay reachable while signed out, by design — they live outside the protected route group.

## Environment variables

See [`.env.example`](./.env.example) for the full list with placeholder values. All of the following are server-only and are never sent to the browser or read from client components.

```env
DATABASE_URL="postgresql://..."
DIRECT_URL="postgresql://..."
AUTH_SECRET=""
AUTH_GOOGLE_ID=""
AUTH_GOOGLE_SECRET=""
ALLOWED_EMAIL="your-email@example.com"
```

- `DATABASE_URL` — the connection string used by the running application at runtime (Prisma Client via `@prisma/adapter-pg`). Use the Neon **pooled** connection string.
- `DIRECT_URL` — the connection string used by Prisma CLI commands (`migrate`, `studio`). Use the Neon **direct, non-pooled** connection string.
- `AUTH_SECRET` — random value Auth.js uses to sign/encrypt session JWTs. Generate one with:
  ```bash
  npx auth secret
  # or
  openssl rand -base64 33
  ```
- `AUTH_GOOGLE_ID` / `AUTH_GOOGLE_SECRET` — credentials from a Google Cloud OAuth 2.0 Client ID (see below). Read automatically by the `Google` provider — nothing else to configure.
- `ALLOWED_EMAIL` — the single Google account email allowed to sign in.

### Google OAuth setup

1. In [Google Cloud Console](https://console.cloud.google.com/), create (or reuse) a project, then go to **APIs & Services → Credentials → Create Credentials → OAuth client ID**.
2. Application type: **Web application**.
3. Add an authorized redirect URI for local development:
   ```
   http://localhost:3000/api/auth/callback/google
   ```
4. Once deployed, add the production equivalent too:
   ```
   https://YOUR-PRODUCTION-DOMAIN/api/auth/callback/google
   ```
5. Copy the generated **Client ID** and **Client secret** into `AUTH_GOOGLE_ID` and `AUTH_GOOGLE_SECRET` in your local `.env`.

### Vercel

Add `AUTH_SECRET`, `AUTH_GOOGLE_ID`, `AUTH_GOOGLE_SECRET`, and `ALLOWED_EMAIL` as environment variables on the Vercel project (alongside `DATABASE_URL`/`DIRECT_URL`). Changing them requires a redeploy to take effect.

## AI-assisted form filling — development mode

The "Add application" form has a **Fill from job posting** panel: paste a job posting (and optionally a cover letter for context), click **Analyze posting**, and the extracted values prefill the form's Company, Position, Platform, Vacancy link, Salary expectation, and Notes fields. You stay in control — nothing is auto-saved, and you review and click **Add application** yourself.

The current implementation uses a **deterministic mock provider** (`AI_PROVIDER="mock"`):

- it makes **no external network requests** and costs nothing to run;
- it only prefills the create form — it never auto-submits or creates an application;
- the pasted job posting and cover letter are **not persisted** anywhere (not sent in the create payload, not stored in the database, not written to `localStorage` or the URL);
- a real OpenAI-backed provider is a **future separate step** — it is not implemented yet.

Extraction is served by `POST /api/applications/extract`, protected by the same `checkSession()` authentication as every other API route.

For local testing, embed one of these markers anywhere in the pasted job posting text to select a fixture:

| Marker | Behavior |
| --- | --- |
| `[mock:complete]` | Returns a complete fixture with all fields filled |
| `[mock:partial]` | Returns only a few fields; the rest are `null` |
| `[mock:linkedin]` | Returns a LinkedIn-style fixture (`platform: LINKEDIN`) |
| `[mock:djinni]` | Returns a Djinni-style fixture (`platform: DJINNI`) |
| `[mock:dou]` | Returns a DOU-style fixture (`platform: DOU`) |
| `[mock:error]` | Throws a controlled error, to test the UI's error state |

With no marker, the default complete fixture is returned. Set `AI_MOCK_DELAY_MS` (milliseconds) to add an artificial delay so the loading state is easy to see manually — leave it at `0` for tests and normal development.

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
3. Configure the Vercel project's environment variables: `DATABASE_URL` (and `DIRECT_URL` if running migrations from Vercel), plus `AUTH_SECRET`, `AUTH_GOOGLE_ID`, `AUTH_GOOGLE_SECRET`, and `ALLOWED_EMAIL` (see [Google OAuth setup](#google-oauth-setup)).
4. Run production migrations with `npm run db:migrate:deploy` against the production database.
5. Deploy the application on Vercel.

## Privacy

The app is gated behind Google sign-in restricted to a single allowed email (see [Authentication](#authentication)) — but that protection is only active once real values are set for `AUTH_SECRET`, `AUTH_GOOGLE_ID`, `AUTH_GOOGLE_SECRET`, and `ALLOWED_EMAIL`. Until those are configured (locally and on the deployment), don't treat the app as private, and don't share the production URL.
