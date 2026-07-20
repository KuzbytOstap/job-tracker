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

## AI-assisted form filling

The "Add application" form has a **Fill from job posting** panel: paste a job posting (and optionally a cover letter for context), click **Analyze posting**, and the extracted values prefill the form's Company, Position, Platform, Vacancy link, Salary expectation, and Notes fields. You stay in control — **Analyze** never creates or saves anything by itself; nothing is persisted until you review the form and click **Add application** yourself.

Extraction is served by `POST /api/applications/extract`, protected by the same `checkSession()` authentication as every other API route, behind a provider-agnostic interface (`ApplicationExtractionProvider`) selected at runtime by `AI_PROVIDER`. That endpoint is read/analyze-only — it never writes to the database, regardless of provider.

### Source materials are stored with the application

The pasted job posting and cover letter (`jobPostingText` / `coverLetterText` on `JobApplication`) are saved as part of the application record, but only when you manually click **Add application** (create) or **Save changes** (edit) — never on Analyze, and never on a failed create/extraction. Both fields are optional and nullable:

- applications created before this feature, and any created without pasting source text, have `jobPostingText`/`coverLetterText` set to `null`;
- either value can be viewed and edited later from the application's **Source materials** section (visible on the detail view when at least one is set, editable from the edit form);
- clearing a source-text field and saving stores `null`, not an empty string;
- both fields are rendered as plain text (line breaks preserved, no HTML/Markdown interpretation) and are never included in toasts, logs, query keys, or URLs.

### Development mode — mock provider

Set `AI_PROVIDER="mock"` (the default in `.env.example`):

- it makes **no external network requests** and costs nothing to run;
- **no `OPENAI_API_KEY` is required**;
- it only prefills the create form — it never auto-submits or creates an application;
- the Analyze request itself never persists the pasted job posting or cover letter anywhere (not stored by the extraction endpoint, not written to `localStorage` or the URL) — see [Source materials are stored with the application](#source-materials-are-stored-with-the-application) for what happens once you actually click Save;
- fixture markers remain available for manual testing (see below).

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

### Production — OpenAI provider

Set `AI_PROVIDER="openai"` and a server-only `OPENAI_API_KEY` to switch extraction to the real OpenAI-backed provider (`lib/ai/providers/openai-application-extraction-provider.ts`):

- it uses **GPT-5 nano**, pinned to the exact snapshot `gpt-5-nano-2025-08-07` in server code — there is no `OPENAI_MODEL` environment variable, so the model can't be accidentally switched to something more expensive;
- it calls the OpenAI **Responses API** with **strict structured output** (JSON Schema derived from the same Zod shape as the mock provider, then re-validated through the canonical `applicationExtractionResultSchema`);
- it still **only prefills the existing form fields** — nothing is ever saved automatically;
- the pasted job posting and cover letter are sent to OpenAI for the single Analyze request only, and are **not stored** by OpenAI (`store: false`) or by the extraction endpoint itself — see [Source materials are stored with the application](#source-materials-are-stored-with-the-application) for what a manual Save then persists;
- the mock provider **remains available** for local development and is what automated tests always use;
- `OPENAI_API_KEY` is **server-only** — it is never read by client components and never sent to the browser. There is no `NEXT_PUBLIC_OPENAI_API_KEY`.

`OPENAI_API_KEY` is only required when `AI_PROVIDER="openai"`; the app builds, tests, and runs fine under `AI_PROVIDER="mock"` with no key configured at all.

### Vercel

Add `AI_PROVIDER` and (in production) `OPENAI_API_KEY` as environment variables on the Vercel project. As with all other environment variables, changing them requires a redeploy to take effect.

### Cost safety

- automated tests always run with the mock provider and the real `openai` SDK fully mocked — they make zero network requests and never touch a real API key;
- there are no automatic paid retries or fallbacks: the OpenAI client is created with `maxRetries: 0`, and the app never silently falls back from `openai` to `mock` (or vice versa) on failure;
- one **Analyze posting** click performs at most one OpenAI request; the button is disabled while a request is pending;
- avoid switching your local `.env` to `AI_PROVIDER="openai"` for routine UI testing — use the mock provider instead, and only exercise the real provider for the specific manual checks you intend to pay for.

## HR interview question preparation

When an application transitions **for the first time** from any other status into the existing **HR call** status, the app automatically prepares a set of interview questions and stores it on the application:

- a deterministic list of common HR questions (`HR_CORE_QUESTIONS` in `lib/hr-interview-questions.ts`) is always saved immediately, before any AI call;
- if the application has meaningful context — a non-empty `jobPostingText`, `coverLetterText`, or `notes` — the AI provider is asked for up to six additional vacancy-specific questions, which are merged in after the core list;
- with no meaningful context (or when company/position are the only known details), no AI request is made and the core-only set is saved;
- the merged set is persisted on the application (`hrInterviewQuestions`, `hrQuestionsGeneratedAt`), so opening the application later never triggers another AI request;
- moving out of HR call and back again does **not** regenerate questions — the stored set is left as-is;
- if AI generation fails, times out, or returns invalid output, the status change still succeeds and the core questions are kept; no error is surfaced for the AI step;
- there is at most one automatic AI request per application for this feature, enforced server-side by an atomic claim on `hrInterviewQuestions` (whichever concurrent status-change request flips it from unset to set is the only one that generates), independent of which UI (Kanban drag-and-drop, mobile pipeline, or the detail view) triggered the move.

The generated questions are shown on the application's detail view once they exist, and remain visible even after the application moves to a later status. They are never shown on Kanban or mobile pipeline cards, and there's no UI to create, edit, or regenerate them — interview scheduling and reminders are a separate future feature.

The AI step reuses the same `AI_PROVIDER` mock/OpenAI setup, pinned model, and cost-safety guarantees described above ([AI-assisted form filling](#ai-assisted-form-filling)) via a separate provider (`lib/ai/providers/openai-hr-questions-provider.ts` / `lib/ai/providers/mock-hr-questions-provider.ts`) — it does not modify the existing vacancy-extraction request or its behavior.

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
