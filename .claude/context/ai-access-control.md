# AI Access & Quota System — Context

Planning/implementation context for adding per-user AI access approval and daily
quotas on top of the existing AI features. Source: full AI-architecture audit (AI
call graph traced via GitNexus, 2026-08-09).

## Current auth baseline

- Google registration is open to any valid Google account.
- Auth.js uses `PrismaAdapter` with JWT sessions.
- `session.user.id` is the persisted `User.id`.
- `JobApplication.userId` is required; all application data is isolated by
  `session.user.id`.
- The multi-user auth migration is **complete** — do not reimplement it, do not
  reintroduce `ALLOWED_EMAIL` or any pre-migration pattern.

## Current AI architecture

Only two real AI operations exist in the codebase:

- **VACANCY_GENERATION** — `POST /api/applications/extract`
  (`lib/ai/providers/openai-application-extraction-provider.ts`)
- **HR_GENERATION** — `POST /api/applications/[id]/hr-questions`
  (`lib/ai/providers/openai-hr-questions-provider.ts`, invoked from
  `lib/hr-questions-service.ts:generateVacancySpecificHrQuestions`)

Both use model `gpt-5-nano-2025-08-07` via a shared `getOpenAIClient()` singleton
(`lib/ai/openai-client.ts`), `AI_PROVIDER` env-switched between `openai` and `mock`.

Key facts for quota design:
- OpenAI SDK retries are disabled (`OPENAI_MAX_RETRIES = 0`) — one logical call
  never fans out into multiple billed calls via retry.
- Deterministic core HR questions (`ensureCoreHrQuestionsForTransition`) are
  **AI-free** and consume no AI quota — only the follow-up vacancy-specific
  enhancement call is a real AI operation. This is unchanged by Phase 2 and
  the function itself was never modified.
- Quota enforcement (access check, token counting, reservation, usage recording)
  lives **around the two actual provider call sites** — the
  `provider.extractApplication(...)` call in the extract route and the
  `provider.generateAdditionalQuestions(...)` call in
  `generateVacancySpecificHrQuestions` — not at route-level middleware and not
  inside the shared `getOpenAIClient()` (which stays feature-agnostic).
- The previously possible **concurrent duplicate-provider-call race** in HR
  generation (read state → decide to call AI → persist unconditionally, letting
  two concurrent requests both get billed) is closed — see "HR enhancement lease"
  below.

## Implemented: DB foundation (Phase 1) ✅

- `User.role` (`USER` | `ADMIN`) and `User.aiAccessStatus` (`NOT_REQUESTED` |
  `PENDING` | `APPROVED` | `REJECTED` | `SUSPENDED`) added to `User`.
- `AiGlobalLimits` — singleton row (`id = 1`), defaults
  `vacancyGenerationLimit = 10`, `hrGenerationLimit = 10`, `tokenLimit = 20000`,
  loaded via a safe upsert (`upsert({ where: { id: 1 }, create: {}, update: {} })`).
- `AiUserLimit` — optional per-user permanent overrides (null fields fall back
  to the global defaults).
- `AiUsageDaily` — per-user/UTC-day aggregate: `vacancyGenerationCount`,
  `hrGenerationCount`, `tokenCount`, plus same-day bonus columns
  (`vacancyGenerationBonus`, `hrGenerationBonus`, `tokenBonus`) that add on top
  of the effective limit for that day only.
- `AiUsageEvent` — per-call audit row: `feature`, `model`, `inputTokens`,
  `outputTokens`, `totalTokens`, optional `applicationId`.
- `AiAccessRequest` — request-more-usage records (`AI_ACCESS` | `VACANCY_LIMIT`
  | `HR_LIMIT` | `TOKEN_LIMIT`), one pending request per type per user
  (partial unique index on `status = 'PENDING'`). `AI_ACCESS` is read/written
  starting Phase 3; the usage-limit types starting Phase 4; all four are
  decided by admins starting Phase 5.
- `JobApplication.hrEnhancementClaimedAt` / `hrEnhancementClaimToken` — the
  HR-enhancement lease fields, see below.

## Implemented: quota/reservation layer (Phase 2) ✅

All in `lib/ai/access-control.ts` unless noted.

- **`requireAiAccessApproved(userId)`** — throws `AiAccessError` unless
  `aiAccessStatus === APPROVED` (`AI_SUSPENDED` for `SUSPENDED`,
  `AI_ACCESS_REQUIRED` otherwise). Called directly by both the extract route
  and `generateVacancySpecificHrQuestions` on the **mock** provider path —
  mock calls are access-gated but never reserve or consume quota.
- **`runGatedAiCall(...)`** — the single entry point real (`AI_PROVIDER=openai`)
  calls go through, from both `POST /api/applications/extract` and
  `generateVacancySpecificHrQuestions`. Sequence:
  1. `provider.countInputTokens(input)` — calls the OpenAI Responses
     `input_tokens` counting endpoint with the **exact same request params**
     (model, instructions, input, structured-output schema, tools, reasoning)
     that generation will send, via a shared `buildResponseParams(input)`
     builder per provider — no separate estimate, no duplicated request
     construction. A counting failure aborts before any reservation or
     provider call.
  2. `reserveAiQuota(...)` — atomically reserves `exactInputTokens +
     maxOutputTokens` (a real ceiling: `max_output_tokens` is enforced
     server-side by OpenAI) against the vacancy/HR feature counter **and**
     the shared token counter in one guarded `updateMany` (`WHERE count <
     limit AND tokenCount <= limit - reserve`), the same atomic-claim idiom
     `ensureCoreHrQuestionsForTransition` already used. Concurrent requests
     serialize through Postgres' row lock, so they can never jointly exceed
     either limit.
  3. Provider call runs. On **failure**, `rollbackAiReservation(...)` undoes
     the reservation (call never happened, nothing was spent).
  4. On **success**, `finalizeAiUsage(...)` reconciles the reservation down
     (or up) to the real `response.usage.{input,output,total}_tokens` and
     writes the `AiUsageEvent`, both in one `prisma.$transaction`. If this
     finalize step itself fails, the reservation is **not** rolled back —
     the provider call already happened and cost real tokens, so quota stays
     consumed (fail closed) and the error is logged, not thrown.
- **Structured errors** — `AiAccessError` carries a machine-readable `code`:
  `AI_ACCESS_REQUIRED`, `AI_SUSPENDED`, `VACANCY_LIMIT_REACHED`,
  `HR_LIMIT_REACHED`, `TOKEN_LIMIT_REACHED`. `aiAccessErrorStatus(code)` maps
  these to `403` (access/suspended) or `429` (any limit reached). The extract
  route always maps `AiAccessError` to a structured JSON response
  (`{ error, details: { code } }`); `generateVacancySpecificHrQuestions`
  re-throws it (instead of swallowing it like other provider failures) so
  `POST /api/applications/[id]/hr-questions` can do the same — the
  already-persisted, AI-free core questions are unaffected either way.
- **HR enhancement lease** — `JobApplication.hrEnhancementClaimedAt` +
  `hrEnhancementClaimToken` (`lib/hr-questions-service.ts`). Before calling
  the provider, a random per-attempt token is atomically claimed
  (`updateMany WHERE hrEnhancementClaimToken IS NULL OR hrEnhancementClaimedAt
  < now() - 2min`), closing the concurrent-duplicate-call race. Release is
  scoped to that exact token (`WHERE hrEnhancementClaimToken = <token>`), so
  a slow/crashed holder can never clear a newer holder's claim — and the
  2-minute staleness window makes the lease recoverable after a crash instead
  of a permanent stuck lock. Released on provider/access failure; left set on
  a genuine (possibly zero-question) success.
- **Mock providers** — implement `countInputTokens()` as a stub returning `0`
  (interface conformance only; never actually called, since the mock path
  bypasses `runGatedAiCall` entirely).

## Implemented: user AI-access request UX (Phase 3) ✅

- **`GET /api/ai-access`** — returns `{ status }`, the current user's
  `aiAccessStatus`, via `getAiAccessStatus(userId)`
  (`lib/ai/access-requests.ts`).
- **`POST /api/ai-access/requests`** — creates an `AI_ACCESS` request via
  `requestAiAccess(userId)`. Only a `NOT_REQUESTED` user can succeed;
  `PENDING`/`APPROVED`/`REJECTED`/`SUSPENDED` all get `409` (`AiAccessRequestError`,
  code `NOT_ELIGIBLE`). The `NOT_REQUESTED → PENDING` transition and the
  `AiAccessRequest` row are written atomically in one `prisma.$transaction`: a
  guarded `User.updateMany({ where: { aiAccessStatus: NOT_REQUESTED } })`
  serializes concurrent callers through Postgres' row lock, so only one ever
  flips the status and creates the request. The DB's partial unique index
  (`status = 'PENDING'`, Phase 1) is the backstop — a `P2002` violation on the
  request insert is mapped to the same `NOT_ELIGIBLE` error.
- **`requireAiAccessApproved` / `runGatedAiCall` stay the sole source of
  truth** for whether an AI call is actually allowed; the request flow only
  ever moves `aiAccessStatus` to `PENDING` and never grants access itself.
- **UI** (`components/ai/ai-access-notice.tsx`, `hooks/use-ai-access-status.ts`,
  `hooks/use-request-ai-access.ts`), applied to both AI entry points (vacancy
  extraction panel, HR_CALL enhancement):
  - `NOT_REQUESTED` — AI stays visible but locked, with a "Request AI access"
    action that calls the endpoint above.
  - `PENDING` — visible but locked, shown as awaiting approval.
  - `APPROVED` — unchanged existing AI behavior (subject to Phase 2 quotas).
  - `REJECTED` — AI entry points hidden entirely (extraction panel renders
    nothing; no notice in the HR question section).
  - `SUSPENDED` — shown as unavailable/disabled, no AI action offered.
  - The HR_CALL automatic enhancement call is additionally skipped
    client-side (`shouldAutoGenerateHrQuestions`) once the status is known
    and not `APPROVED` — a client-side optimization only; the server gate is
    unchanged and still rejects unauthorized calls.

## Product rules

- Base Job Tracker remains fully usable without AI.
- AI access states: `NOT_REQUESTED`, `PENDING`, `APPROVED`, `REJECTED`, `SUSPENDED`.
  - `NOT_REQUESTED`: AI visible but locked, with a "Request AI access" action.
  - `PENDING`: visible but locked, pending state shown.
  - `APPROVED`: AI enabled, subject to quotas.
  - `REJECTED`: AI UI hidden entirely.
  - `SUSPENDED`: AI disabled by admin (post-approval).
- **Implemented** (Phase 3, see above) — all five states are handled in the UI
  for both AI entry points; `NOT_REQUESTED → PENDING` is live end-to-end.

## Default daily limits

- 10 `VACANCY_GENERATION` actions/day.
- 10 `HR_GENERATION` actions/day.
- 20,000 total AI tokens/day.
- Limits are independent: exhausting one feature counter blocks only that feature;
  exhausting the token budget blocks all AI.
- UI must explain exactly which limit was exhausted and when it resets.
- **Implemented** — these are the live `AiGlobalLimits` defaults (Phase 1) and
  are enforced independently by `reserveAiQuota` (Phase 2). The "UI must
  explain which limit was exhausted and when it resets" requirement is
  implemented by `AiQuotaNotice` (Phase 4).

## Request more usage

- Users can request more usage once a quota is exhausted.
- Request types: `AI_ACCESS`, `VACANCY_LIMIT`, `HR_LIMIT`, `TOKEN_LIMIT`.
- Only one pending request per type per user at a time.
- Admin approval of a quota request normally grants a **temporary bonus for the
  current day only**.
- Admin can separately configure **permanent per-user overrides**.
- **Implemented** (Phase 4) — `GET /api/ai-usage` + `POST /api/ai-usage/requests`
  (`lib/ai-quota.ts`, `lib/ai/access-requests.ts`); UI via `AiQuotaNotice`,
  shown at both AI entry points once the relevant quota is exhausted.

## Limit configuration

- Global defaults are admin-configurable.
- Per-user permanent overrides fall back to global defaults when null.
- Daily temporary bonuses are separate from (additive to) permanent overrides.

## Usage accounting

- Maintain a fast per-user/day aggregate for enforcement checks.
- Maintain detailed per-call AI usage events for audit/analytics.
- Record actual input/output/total provider tokens per call.
- Feature counters count successful AI operations only.
- Quota checks + reservations must be concurrency-safe (atomic claim before the
  provider call, not a check-then-write race).
- Mock provider (`AI_PROVIDER=mock`) calls must never consume real token quota.
- **Implemented** — `AiUsageDaily` is the fast aggregate, `AiUsageEvent` is the
  per-call audit trail, both written by `finalizeAiUsage` (Phase 2, see above).
  Feature counters only stay incremented for a successful call (a failed call
  is rolled back); reservation is a single atomic guarded `updateMany`; mock
  calls never call `runGatedAiCall` at all.

## Admin (Phase 5) ✅

- `User.role` supports `USER` and `ADMIN`.
- Admin authorization is based **only** on the persisted `User.role === ADMIN`,
  re-checked server-side on every call via **`requireAdmin()`**
  (`lib/admin/require-admin.ts`) — never a JWT claim or hardcoded email (that
  pattern is exactly what the completed auth migration removed). Every
  `/api/admin/*` route calls it first.
- **Implemented** — `lib/admin/{ai-requests,users,settings}.ts` +
  `app/api/admin/**`:
  - `GET/PATCH /api/admin/ai-requests[/[id]]` — lists requests (pending
    first) and decides one: approve/reject `AI_ACCESS` (flips
    `aiAccessStatus`), or approve (with `grantedAmount` + optional
    `decisionNote`) / reject a usage-limit request.
    - Usage-limit **approval** requires the request's `quotaDate` to still be
      today's UTC quota day — a stale request returns `STALE_REQUEST` and can
      never be approved. **Rejection** is always allowed while a request is
      still `PENDING`, stale or not (it never touches `AiUsageDaily`), so a
      stale request can be rejected but never approved.
    - The status flip and any `AiUsageDaily` bonus write happen in one
      `prisma.$transaction` behind a guarded `updateMany`
      (`WHERE status = PENDING`); a losing concurrent decision matches zero
      rows and fails closed — approval is atomic and can never double-grant.
  - `GET /api/admin/users` — role, `aiAccessStatus`, today's usage, effective
    limits (`override ?? globalDefault`, plus today's bonus), and the raw
    overrides, for every user.
  - `POST /api/admin/users/[id]/suspend|restore` — guarded
    `APPROVED → SUSPENDED` / `SUSPENDED → APPROVED` transitions only.
  - `PATCH /api/admin/users/[id]/limits` — sets/clears permanent per-user
    overrides (`null` clears a field back to the global default).
  - `GET/PATCH /api/admin/settings` — reads/updates the `AiGlobalLimits`
    singleton.

## Admin UI (Phase 6) ✅

- **Implemented** — `/admin` (`app/(protected)/admin/page.tsx`) is
  server-gated: it calls `requireAdmin()` and redirects (`/sign-in`
  unauthenticated, `/` forbidden) before any admin markup renders — admin
  controls are never exposed client-side to a non-admin.
- `AdminShell` (`components/admin/`) has three sections:
  - **Requests** — pending `AI_ACCESS` requests (approve/reject with an
    optional decision note); pending usage-limit requests (quick `+5`/`+10`
    grants, a custom-amount dialog, or reject — a stale request is visually
    marked and never offers approve, only reject); recent decided-request
    history.
  - **Users** — name/email, AI access status with suspend/restore, and each
    user's current usage vs. effective limit per feature (vacancy/HR/tokens)
    with an inline override/bonus breakdown so the base-vs-effective
    relationship is legible; an "Edit limits" dialog sets or clears
    permanent overrides.
  - **Settings** — edits the three `AiGlobalLimits` defaults.
- Built per the existing Game Hub visual language (see
  `.claude/rules/game-hub-ui.md`) — `data-job-tracker-theme="game-hub"`,
  existing `--gh-*` tokens/surfaces, existing shadcn/ui primitives; no new
  visual system. Built using the `ui-ux-pro-max` skill and 21st.dev MCP for
  admin/dashboard pattern research, as directed.
- Server responses stay authoritative — actions invalidate/refetch React
  Query state rather than assume optimistic outcomes.

## Implementation order

1. ~~DB foundation and admin role.~~ ✅ Done — see "Implemented: DB foundation".
2. ~~Central AI quota/reservation/usage layer.~~ ✅ Done — see "Implemented:
   quota/reservation layer".
3. ~~User AI-access request UX.~~ ✅ Done — see "Implemented: user AI-access
   request UX".
4. ~~Exhausted-quota UX + "Request more usage".~~ ✅ Done — see "Request more
   usage" and "Default daily limits".
5. ~~Admin APIs.~~ ✅ Done — see "Admin (Phase 5)".
6. ~~Admin UI using ui-ux-pro-max + 21st.dev.~~ ✅ Done — see "Admin UI
   (Phase 6)".
7. Concurrency/security audit and production rollout. ← only phase remaining.
