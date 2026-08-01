# Job Tracker — Project Story & Overview

This document captures *why* Job Tracker exists and how the shipped product maps
back to that original idea. For setup, environment variables, and deployment
steps, see [`README.md`](../README.md) in the repository root — this file is
about intent and design, not commands.

## Origin

The project started after a round of job applications sent across several
platforms (Djinni, DOU, LinkedIn, robota.ua, and direct outreach), when
keeping track of "who did I apply to, and what happened since" stopped being
manageable in a person's head or a spreadsheet.

The original ask, in plain terms:

- Log each application: company, position, platform, optional link.
- Track it through a pipeline of statuses: applied → HR replied → HR call →
  technical interview → (optional) test task → offer, with rejection possible
  at any point.
- Flag a test task with a checkbox/status rather than losing it as a generic
  step.
- If an application sits untouched for 21 days, it should fall into an
  "ignored" bucket automatically — no manual bookkeeping.
- Separate views per status, with sorting.
- Backed by a real database, not local-only storage.
- Deployed somewhere reachable from a phone, so applications can be logged or
  checked on the go.
- No login, no admin panel — this is a single-user tool.
- All of it on a free tier — no recurring cost for a personal utility.

Two existing tools were considered and set aside: Huntr (free up to 40
applications) and Teal (free tier available), because neither offers the
21-day auto-ignore rule, and Huntr's cap is easy to hit during an active
search. Building a small, purpose-fit tool was judged worth it — both to get
exactly this workflow and as an additional project on the stack used day to
day at work.

## From idea to build plan

The idea was broken into a sequence of prompts before implementation began,
in this order: data model and stack setup → applications API → dashboard UI →
Kanban board replacing status tabs → drag-and-drop board interactions →
statistics/funnel view and relative dates → dark mode and PWA polish →
production deployment. The commit history in this repository follows that
same sequence.

One deliberate reframe from the original ask: the "no login" requirement
(no *registration* flow, no accounts to manage) was kept, but a privacy gate
was flagged as necessary before sharing the deployment URL with anyone — an
unauthenticated Kanban board containing salary expectations and company
notes is otherwise readable by anyone who finds the link. The gate that
shipped is Google sign-in restricted to a single allowed email, not the
originally-sketched URL-embedded secret key; see
[Status](#status--whats-left) below.

## What was built

### Data model

A single `JobApplication` row per application, plus an append-only
`StatusChange` log for history (`prisma/schema.prisma`):

- `company`, `position`, `platform` (`DJINNI` / `DOU` / `LINKEDIN` /
  `ROBOTA_UA` / `DIRECT` / `OTHER`), `link`, `salaryExpectation`, `notes`.
- `jobPostingText`, `coverLetterText` — optional archival copies of the
  pasted source materials, saved only on a manual Save (see README's
  "Source materials are stored with the application").
- `status` — one of `APPLIED`, `HR_REPLIED`, `HR_CALL`, `TECH_INTERVIEW`,
  `TEST_TASK`, `OFFER`, `REJECTED`, `IGNORED`.
- `hasTestTask` / `testTaskDone` — the test task is modeled as a **branch**,
  not a pipeline rung: an application enters `TEST_TASK` only from `HR_CALL`
  or `TECH_INTERVIEW` and returns to `TECH_INTERVIEW` when the task is
  resolved (`lib/status-transitions.ts`). This matches how test tasks
  actually happen in practice — they interrupt the pipeline rather than
  extend it.
- `appliedAt`, `lastActivityAt`, `createdAt`, `updatedAt` — `lastActivityAt`
  is the field the auto-ignore rule reads.

### Auto-ignore, computed rather than scheduled

This was the one piece of "must work correctly" logic in the original ask,
and the implementation choice matters: `effectiveStatus()`
(`lib/status.ts`) computes whether an application should read as `IGNORED`
**at request time**, by comparing `lastActivityAt` against a 21-day
threshold. It is never written back to the stored `status` column.

- No cron job, no scheduled function, no worker — nothing to configure or
  pay for on a free-tier host, and nothing that can silently stop running.
- `OFFER`, `REJECTED`, and an explicitly-set `IGNORED` are terminal and are
  never overridden by the computation.
- Any edit or status change bumps `lastActivityAt`, so an application being
  actively worked stays out of `IGNORED` without extra logic.
- Reactivating an auto-ignored application just bumps `lastActivityAt` again
  — no fake history entry is created for the auto-ignore itself, since it
  was never a real status change.

### Interfaces

- **Kanban board** (`components/board/`) — one column per status, with
  drag-and-drop moves (`@dnd-kit`). Backward moves or moves into
  `REJECTED`/`IGNORED` ask for confirmation before committing
  (`lib/drag-drop-transitions.ts`); forward moves along the primary pipeline
  apply immediately.
- **Dashboard / list view** (`components/dashboard/`) — date-grouped list
  with search and sort (`newest`, `oldest`, `activity`, `company`).
- **Focused status pages** (`app/status/[status]/page.tsx`) — a per-status
  view, addressing the "separate pages per status" requirement directly.
- **Statistics** (`components/board/stats-*`, `lib/stats.ts`) — total count,
  waiting-for-reply, replied-or-further, interviews-or-further, offers, and a
  simple conversion funnel (applied → replied → interviews → offers), each
  stage clickable through to its status page.
- **Detail / create / edit flows** (`components/applications/`) — status
  pipeline visualization, status history, test-task controls, and
  terminal-status (reject/restore) actions, built with React Hook Form + Zod
  (`lib/validation.ts`).

### Stack and hosting

Next.js 15 (App Router) + TypeScript + Tailwind CSS v4 + shadcn/ui on the
frontend; TanStack Query for data fetching/caching; Prisma 7 with
`@prisma/adapter-pg` against Neon Postgres. This satisfies the "real
database" requirement while staying on Vercel's free Hobby tier and Neon's
free tier — no payment involved. The manifest and app icons
(`app/manifest.ts`) make the board installable to a phone home screen,
answering the "usable from a phone" requirement without building a native
app.

## Status & what's left

- Core tracking, pipeline, board, statistics, dark mode, and PWA metadata are
  built (see `README.md` for the full feature list and how to run/deploy).
- **Privacy gate is implemented.** The earlier reserved `APP_SECRET`
  approach (a URL-embedded key) was replaced with Google sign-in via
  Auth.js, restricted to a single email in the server-only `ALLOWED_EMAIL`
  variable — see `README.md`'s Authentication section for the enforcement
  details (double allowlist check, protected route group, per-route 401/403
  in every API handler). The deployment is only actually private once real
  `AUTH_SECRET`/`AUTH_GOOGLE_ID`/`AUTH_GOOGLE_SECRET`/`ALLOWED_EMAIL` values
  are configured, both locally and on Vercel.
- The AI-assisted "paste a job posting, auto-fill the form" feature is
  **implemented**, behind a provider-agnostic extraction interface
  (`AI_PROVIDER=mock` for dev/tests, `AI_PROVIDER=openai` with GPT-5 nano for
  production) — see `README.md`'s "AI-assisted form filling" section.
- Drag-and-drop board interactions are **implemented**
  (`hooks/use-application-drag-and-drop.ts`, `lib/drag-drop-transitions.ts`,
  and the `components/board/` components), including confirmation for backward
  moves and moves into `REJECTED`/`IGNORED`.

## Architecture notes

A few cross-cutting decisions worth knowing before touching the data flow:

- **Lightweight list vs. full detail.** The list endpoint
  (`GET /api/applications`) returns a slim `ApplicationListItemDTO`
  (`lib/api-types.ts`) — only the columns the Kanban cards, mobile lists,
  filters, sorting, and drag-and-drop need, via a Prisma `select`
  (`APPLICATION_LIST_ITEM_SELECT` in `lib/applications.ts`). The heavy fields
  (job posting, cover letter, notes, HR questions, status history) are fetched
  only when a card is opened, through `GET /api/applications/[id]`, which
  returns the full `ApplicationDTO`. React Query caches the two shapes under
  separate keys (`lib/query-keys.ts`); mutations return the full DTO and are
  projected back down to list items for the list caches
  (`toApplicationListItem` in `lib/cache-updates.ts`).
- **Concurrency-safe updates.** `PATCH /api/applications/[id]` reads the
  current row *inside* the transaction and applies a conditional write, so a
  `StatusChange` is never derived from a stale read. Clients send the
  last-seen `updatedAt` as an optimistic-concurrency token
  (`expectedUpdatedAt`); a mismatch returns **409 Conflict**, and the update /
  move hooks recover by invalidating and refetching the affected application
  instead of keeping stale optimistic state.
- **HR_CALL question flow, split for latency.** The status change into
  `HR_CALL` saves the deterministic core question set synchronously
  (`ensureCoreHrQuestionsForTransition`) so the response is never delayed by
  OpenAI. The slower, best-effort vacancy-specific enhancement runs as a
  separate follow-up request (`POST /api/applications/[id]/hr-questions` →
  `generateVacancySpecificHrQuestions`), triggered by the client after the
  move; it is idempotent and an OpenAI failure never rolls back the saved
  status change.
- **Shared OpenAI client error.** `getOpenAIClient()` throws a feature-neutral
  `OpenAIConfigurationError` (`lib/ai/openai-client.ts`); the extraction and
  HR-question providers each re-map it into their own domain error, so neither
  feature ever receives the other's error type.
