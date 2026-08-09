# Multi-User Auth Migration — Context

Implementation context for migrating from single-user to multi-user Google auth with
per-user `JobApplication` ownership. Source: full auth/data-access audit,
`/Users/ostap/.claude/plans/audit-the-current-authentication-bright-breeze.md`.

## Current auth architecture

- `next-auth@5.0.0-beta.31` (Auth.js v5 beta), config entirely in `lib/auth.ts`.
- Google provider (`next-auth/providers/google`), default env var convention
  (`AUTH_GOOGLE_ID`/`AUTH_GOOGLE_SECRET`).
- Session strategy: `jwt` — no DB session persistence.
- No adapter configured. No `middleware.ts` — protection is per-route via
  `checkSession()` (10 call sites across 7 files, all rooted in `lib/auth.ts`).
- No TypeScript session augmentation exists (`session.user.id` unavailable today).

## Current ALLOWED_EMAIL enforcement

Single env var, enforced in exactly two runtime spots, both in `lib/auth.ts`:
1. `signIn` callback — blocks the OAuth handshake itself for non-matching emails.
2. `evaluateSession()` (used by `checkSession()`) — re-checks on every request.

No other allowlist mechanism exists anywhere in the repo.

## Absence of persistent users / ownership today

- No `User`/`Account`/`Session`/`VerificationToken` models in `schema.prisma`.
- `JobApplication` has no owner/`userId` field of any kind (confirmed repo-wide).
- `StatusChange` also has no owner field — only reachable via a `JobApplication`.
- Every current query is effectively global/unscoped; the whole product assumes one
  implicit owner.

## JobApplication access points requiring user scoping

- `app/api/applications/route.ts` — `GET` (list), `POST` (create)
- `app/api/applications/[id]/route.ts` — `GET`, `PATCH`, `DELETE`
- `app/api/applications/[id]/hr-questions/route.ts` — `POST`
- `app/api/stats/route.ts` — `GET` (currently unfiltered full-table scan)
- `lib/hr-questions-service.ts` — `ensureCoreHrQuestionsForTransition`,
  `generateVacancySpecificHrQuestions`
- `prisma/seed.ts` — dev-only, unconditional whole-table wipe/reseed

All are currently id-only or unfiltered; none check ownership.

## Target multi-user architecture

- Persistent `User`/`Account`/`Session`/`VerificationToken` models via
  `@auth/prisma-adapter`, wired to the existing `lib/prisma.ts` singleton.
- `JobApplication.userId` (required once migration completes), FK to `User`.
- Session strategy stays `jwt` — adapter persists `User`/`Account` on sign-in without
  switching to database sessions.
- Every access point above scoped by `userId`, ideally via one shared helper built on
  `checkSession()` rather than re-derived per route.

## Agreed safe migration sequence

1. Add `User`/`Account`/`Session`/`VerificationToken` models + wire adapter; keep
   `ALLOWED_EMAIL`. Purely additive, safe to deploy immediately.
2. Add nullable `JobApplication.userId` (after step 1's owner `User` row exists).
3. Backfill: set `userId` to the current owner's `User.id` on all existing rows.
4. User-scope every access point listed above.
5. Make `JobApplication.userId` required — only after step 3 backfill verified zero
   NULLs and step 4 is fully deployed.
6. Remove `ALLOWED_EMAIL`, allow new Google users to register.

## Critical security invariants

- `session: { strategy: "jwt" }` must stay explicit in `lib/auth.ts` — Auth.js
  defaults to `database` strategy whenever an adapter is present.
- Step 5 (`userId` required) must never run before step 3's backfill is verified
  complete and step 4 is deployed.
- `StatusChange` has no owner column; it must always be reached through an
  ownership-checked `JobApplication` lookup, never queried directly.
- No new access point may ship without going through the shared user-scoping helper.

## Production backfill requirement

Before `JobApplication.userId` can be made required, every existing production row
must be backfilled to the current owner's `User.id`, run only after that owner has
signed in post-adapter-wiring (so their `User` row exists), and verified via a
zero-NULL check before proceeding to step 5.

## Agreed decisions

- `JobApplication -> User` relation uses `onDelete: Cascade`.
- Keep Google OAuth as the sole provider and keep JWT session strategy — no move to
  database sessions.
- New Google users must remain blocked (via `ALLOWED_EMAIL` staying enforced) until
  ownership scoping (step 4) and backfill (step 3) are both complete; `ALLOWED_EMAIL`
  removal (step 6) is the last step, not concurrent with scoping work.
