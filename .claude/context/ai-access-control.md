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
- The Responses API returns `response.usage.{input_tokens,output_tokens,total_tokens}`
  today, but neither provider reads or persists it — real usage is available and
  currently discarded.
- Deterministic core HR questions (`ensureCoreHrQuestionsForTransition`) are
  **AI-free** and must never consume AI quota — only the follow-up vacancy-specific
  enhancement call is a real AI operation.
- Quota enforcement (access check, reservation, usage recording) belongs **around
  the two actual provider call sites** — the `provider.extractApplication(...)` call
  in the extract route and the `provider.generateAdditionalQuestions(...)` call in
  `generateVacancySpecificHrQuestions` — not at route-level middleware and not
  inside the shared `getOpenAIClient()` (which is deliberately feature-agnostic).
- HR generation currently has a possible **concurrent duplicate-provider-call race**:
  it reads current question state, decides to call AI, then persists unconditionally
  — two concurrent requests can both pass the check and both get billed. The
  reservation design must close this, following the atomic-claim pattern
  `ensureCoreHrQuestionsForTransition` already uses (`updateMany WHERE ... IS NULL`).

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

1. DB foundation and admin role.
2. Central AI quota/reservation/usage layer.
3. User AI-access request UX.
4. Exhausted-quota UX + "Request more usage".
5. Admin APIs.
6. Admin UI using ui-ux-pro-max + 21st.dev.
7. Concurrency/security audit and production rollout.
