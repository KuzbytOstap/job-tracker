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
  (partial unique index on `status = 'PENDING'`). Not yet read or written by
  any code path — schema only, ahead of Phase 3/4.
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

## Product rules

- Base Job Tracker remains fully usable without AI.
- AI access states: `NOT_REQUESTED`, `PENDING`, `APPROVED`, `REJECTED`, `SUSPENDED`.
  - `NOT_REQUESTED`: AI visible but locked, with a "Request AI access" action.
  - `PENDING`: visible but locked, pending state shown.
  - `APPROVED`: AI enabled, subject to quotas.
  - `REJECTED`: AI UI hidden entirely.
  - `SUSPENDED`: AI disabled by admin (post-approval).

## Default daily limits

- 10 `VACANCY_GENERATION` actions/day.
- 10 `HR_GENERATION` actions/day.
- 20,000 total AI tokens/day.
- Limits are independent: exhausting one feature counter blocks only that feature;
  exhausting the token budget blocks all AI.
- UI must explain exactly which limit was exhausted and when it resets.
- **Implemented** — these are the live `AiGlobalLimits` defaults (Phase 1) and
  are enforced independently by `reserveAiQuota` (Phase 2). The "UI must
  explain..." requirement is still open (Phase 4).

## Request more usage

- Users can request more usage once a quota is exhausted.
- Request types: `AI_ACCESS`, `VACANCY_LIMIT`, `HR_LIMIT`, `TOKEN_LIMIT`.
- Only one pending request per type per user at a time.
- Admin approval of a quota request normally grants a **temporary bonus for the
  current day only**.
- Admin can separately configure **permanent per-user overrides**.

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

## Admin

- `User.role` supports `USER` and `ADMIN`.
- Admin authorization must be server-side via `role` — never a hardcoded email
  check (that pattern is exactly what the completed auth migration removed).
- Admin needs: pending access/usage requests; approve/reject; suspend/restore AI;
  today's vacancy/HR/token usage; global defaults; per-user permanent overrides;
  temporary daily bonuses.

## Admin UI

- Preserve the current Game Hub visual language (see
  `.claude/rules/game-hub-ui.md`).
- When admin UI implementation begins, use the `ui-ux-pro-max` skill and the
  21st.dev MCP for admin/dashboard patterns.
- Reuse existing shadcn/ui components — don't create duplicate primitives.

## Implementation order

1. ~~DB foundation and admin role.~~ ✅ Done — see "Implemented: DB foundation".
2. ~~Central AI quota/reservation/usage layer.~~ ✅ Done — see "Implemented:
   quota/reservation layer".
3. User AI-access request UX.
4. Exhausted-quota UX + "Request more usage".
5. Admin APIs.
6. Admin UI using ui-ux-pro-max + 21st.dev.
7. Concurrency/security audit and production rollout.
