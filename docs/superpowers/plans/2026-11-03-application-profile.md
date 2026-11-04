# Application Profile Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a per-user profile (personal data, search preferences, several CVs, bullet-by-bullet extra context with AI weighting, cover letter prompt and examples) with its own AI quota feature.

**Architecture:** New Prisma models plus a `PROFILE` value in `AiFeature` with its own daily counter. Business logic lives in `lib/profile/*` services, AI access in a new provider under `lib/ai`, session-only routes under `app/api/profile/*`, TanStack Query hooks, and a new `/profile` page under the console route group.

**Tech Stack:** Next.js 15 App Router, Prisma 7 (Postgres, `Bytes`), zod 4, openai 6.48.0 (Responses API), TanStack Query 5, react-hook-form, shadcn/ui (base-ui), vitest.

**Spec:** `docs/superpowers/specs/2026-11-03-application-profile-design.md`

## Global Constraints

- npm only. No new dependencies. No new code comments of any kind (inline, block, JSDoc, TODO).
- Never run `git commit` or `git push`. There are no commit steps in this plan; the user commits manually.
- Never run tests, typecheck, lint, build, Prisma migrations or Playwright. Each task ends with a "Verification (user runs)" command list instead. Implementers write the tests but do not execute them.
- Before editing any existing symbol, run GitNexus `impact({target, direction: "upstream"})` and report the blast radius; warn on HIGH or CRITICAL.
- Never edit an applied migration. Migration is applied by the user to dev only (`npm run db:migrate`); never touch production.
- CV file: PDF only, at most 4 MB (`CV_MAX_BYTES = 4 * 1024 * 1024`), at most 5 per account (`CV_MAX_COUNT = 5`). Exactly one primary CV whenever at least one CV exists.
- Cover letter examples: at most 3 per user, each of `vacancyText` and `letterText` at most 4000 characters. Context item text: 1 to 1000 characters after trim.
- "Remind later" hides the CV update hint for 7 days (`CV_HINT_SNOOZE_DAYS = 7`) or until a newer SUBSTANTIAL item is created, whichever comes first.
- AI calls for the profile go through `runGatedAiCall` with `feature: AiFeature.PROFILE`; the existing mock-provider branch (`requireAiAccessApproved`) is reused. Manual editing of the profile must work with no AI access.
- CV, phone and address are visible only to their owner: explicit `select` that omits `fileData` in every list or default query, never logged, never returned by admin endpoints, deleted with the user (`onDelete: Cascade`).
- Routes accept the app session only (`checkSession`); nothing extension-facing in this plan.
- All new UI text exists in EN and UK (`lib/i18n/messages/{en,uk}`), UK typed against `Messages`.
- Prose and copy contain no dash characters used as punctuation. Reuse installed shadcn primitives and `--gh-*` tokens; `motion/react` only if animation is needed, respecting `prefers-reduced-motion`. Preserve existing mobile behavior; new screens must work at narrow width.
- Do not touch `JobApplication` fields, existing routes' behavior, `extension/`, or documentation files.

## Review Focus

- Upload is not a PDF (wrong magic bytes, correct extension), exceeds 4 MB, or is the 6th CV: rejected with a clear error and nothing stored (T5, T10).
- Another user's CV, item or example id in any URL: 404, never 403, never data (T5, T6, T9, T10, T11).
- AI quota exhausted, access missing or provider failure while saving an item or CV: the data still saves, item weight stays null, no banner counts it (T8, T11).
- Deleting the primary CV while others remain promotes the most recently created one; deleting the last CV leaves none and clears all item weights (T5).
- Whitespace-only, over-length or injection-style item text ("ignore previous instructions") never breaks scoring: rejected by validation, or passed to the model only inside the data block, never inside `instructions` (T4, T6, T7).

---

### Task 1: Schema and migration

**Files:**
- Modify: `prisma/schema.prisma`
- Create: `prisma/migrations/20261103100000_add_application_profile/migration.sql`

**Interfaces:**
- Produces (Prisma enums): `SalaryPeriod { HOUR MONTH YEAR }`, `EmploymentType { FULL_TIME PART_TIME CONTRACT }`, `WorkFormat { REMOTE ONSITE HYBRID }`, `ProfileContextWeight { COVERED SUBSTANTIAL MINOR }`; `AiFeature` gains `PROFILE`.
- Produces (models, all user-owned with `userId`, `onDelete: Cascade`, `@@index([userId])`, cuid ids, `createdAt`/`updatedAt` per repo convention):
  - `UserProfile` (`userId @unique`): `firstName, lastName, contactEmail, phone, addressStreet, addressPostalCode, addressCity, addressRegion, addressCountry` (all `String?`), `salaryAmount Int?`, `salaryCurrency String?`, `salaryPeriod SalaryPeriod?`, `employmentTypes EmploymentType[]`, `workFormats WorkFormat[]`, `coverLetterPrompt String?`, `cvHintSnoozedAt DateTime?`.
  - `UserCv`: `label String`, `language String?`, `isPrimary Boolean @default(false)`, `fileName String`, `fileSize Int`, `fileData Bytes`, `extractedText String?`; partial unique `@@unique([userId], where: { isPrimary: true })` following the `AiAccessRequest` partial-index syntax already in the schema.
  - `ProfileContextItem`: `text String`, `weight ProfileContextWeight?`, `impact Int?`.
  - `CoverLetterExample`: `vacancyText String`, `letterText String`.
  - `User` gains relations `profile UserProfile?`, `cvs UserCv[]`, `profileContextItems ProfileContextItem[]`, `coverLetterExamples CoverLetterExample[]`.
  - Quota columns: `AiGlobalLimits.profileGenerationLimit Int @default(50)`, `AiUserLimit.profileGenerationLimit Int?`, `AiUsageDaily.profileGenerationCount Int @default(0)`.

- [ ] **Step 1: Edit `prisma/schema.prisma`** exactly as above, following the file's formatting.
- [ ] **Step 2: Write `migration.sql`** by hand: `CREATE TYPE` for the four enums, `ALTER TYPE "AiFeature" ADD VALUE 'PROFILE'` (pattern: `20260809132233_add_ai_access_control_foundation`), `CREATE TABLE` for the four models with FKs and the partial unique index, `ALTER TABLE` adding the three quota columns.
- [ ] **Step 3: Verification (user runs):** `npx prisma validate`, then `npm run db:migrate` (dev database), then `npm run db:generate`. Expected: validate passes, migration applies, client regenerates with `PROFILE` in `AiFeature`.

---

### Task 2: PROFILE quota on the server

**Files:**
- Modify: `lib/ai/access-control.ts`, `lib/admin/settings.ts`, `lib/admin/users.ts`, `app/api/admin/settings/route.ts`, `app/api/admin/users/[id]/limits/route.ts`, `app/api/ai-usage/route.ts`, `lib/api-types.ts`, `lib/api.ts`, `lib/ai-quota.ts`, `lib/admin-limits.ts`, `lib/i18n/api-errors.ts`
- Test: `lib/ai/access-control.test.ts`, `lib/ai-quota.test.ts`, `lib/admin/settings.test.ts`, `lib/admin/users.test.ts`, `app/api/admin/settings/route.test.ts`, `app/api/admin/users/[id]/limits/route.test.ts`, `app/api/ai-usage/route.test.ts`, `lib/i18n/api-errors.test.ts`

**Interfaces:**
- Consumes: Task 1 columns and `AiFeature.PROFILE`.
- Produces:
  - `AiAccessErrorCode` adds `"PROFILE_LIMIT_REACHED"`; `aiAccessErrorStatus("PROFILE_LIMIT_REACHED")` returns 429.
  - `AiUsageStatus` and `AiUsageStatusResponse` gain `profile: AiQuotaStatus` (`{ used, limit, exhausted }` and `pendingRequest` per the response type).
  - `reserveAiQuota` and `rollbackAiReservation` use an exhaustive `switch` on `AiFeature`; PROFILE checks `profileGenerationCount < limit` (global default or user override, no bonus) and the shared token limit; it never touches vacancy or HR counters.
  - `resolveAiQuotaReason(usage, feature)` accepts `"VACANCY_GENERATION" | "HR_GENERATION" | "PROFILE"`; `AiQuotaReasonCode` gains `"PROFILE_LIMIT_REACHED"`.
  - Admin settings and per-user limits accept and return `profileGenerationLimit` (global) and `profileGenerationLimit` override (user). `QuotaField` gains `"profile"`. No `AiRequestType` change: users cannot request more profile usage (my call, keeps scope bounded).

- [ ] **Step 1: Write failing tests** (names and key assertions):
  - `access-control.test.ts`: "reserves PROFILE without incrementing vacancy or hr counters"; "throws PROFILE_LIMIT_REACHED when profile count is at limit while vacancy quota is untouched"; "PROFILE still obeys the shared token limit (TOKEN_LIMIT_REACHED)"; "rollback of a PROFILE reservation decrements only profile count and tokens"; "getAiUsageStatus includes profile used/limit/exhausted".
  - `ai-quota.test.ts`: "resolveAiQuotaReason returns PROFILE_LIMIT_REACHED for feature PROFILE when exhausted".
  - Admin and route tests: "settings round-trips profileGenerationLimit", "user limits override accepts profileGenerationLimit and null to clear", "ai-usage response includes profile".
  - `api-errors.test.ts`: "maps PROFILE_LIMIT_REACHED to a translation key".
- [ ] **Step 2: Implement** the changes listed in Interfaces. In `access-control.ts` replace the binary vacancy-else-HR branches (`reserveAiQuota`, `rollbackAiReservation`, `throwSpecificReservationError`, `loadEffectiveLimitsAndUsage`) with exhaustive handling so a missing case is a compile error. Add the `PROFILE_LIMIT_REACHED` entry to `CODE_KEYS` in `lib/i18n/api-errors.ts` (key defined in Task 3).
- [ ] **Step 3: Verification (user runs):** `npx vitest run lib/ai lib/ai-quota.test.ts lib/admin app/api/admin app/api/ai-usage lib/i18n/api-errors.test.ts` and `npm run typecheck`. Expected: pass; typecheck failures listing admin UI files are resolved by Task 3.

---

### Task 3: PROFILE quota in admin and notices (UI and copy)

**Files:**
- Modify: `components/ai/ai-quota-notice.tsx`, `components/admin/settings/settings-section.tsx`, `components/admin/users/user-limits-dialog.tsx`, `components/admin/users/user-row.tsx`, `components/admin/users/users-section.tsx`, `lib/i18n/messages/en/ai.ts`, `lib/i18n/messages/uk/ai.ts`, `lib/i18n/messages/en/admin.ts`, `lib/i18n/messages/uk/admin.ts`, `lib/i18n/messages/en/errors.ts`, `lib/i18n/messages/uk/errors.ts`
- Test: `components/admin/settings/settings-section.test.tsx`, `components/admin/users/users-section.test.tsx`

**Interfaces:**
- Consumes: Task 2 DTO fields and `PROFILE_LIMIT_REACHED`.
- Produces: i18n keys `ai.quota.profileTitle`, `admin.limits.profileField`, `admin.users.columns.profile`, `admin.settings.profileDescription`, `errors.codes.profileLimit`; admin settings, user limits dialog and users table each show a Profile field/column wired to `profileGenerationLimit`; `AiQuotaNotice` renders copy for `PROFILE_LIMIT_REACHED`. Update `admin.settings.tokensDescription` so it no longer says "across both features".

- [ ] **Step 1: Write failing tests:** settings section renders and submits a profile limit field; users table shows a profile column with used/limit.
- [ ] **Step 2: Implement** the UI and EN/UK copy (UK must satisfy the `Messages` type).
- [ ] **Step 3: Verification (user runs):** `npx vitest run components/admin lib/i18n` and `npm run typecheck`. Expected: pass and a clean typecheck.

---

### Task 4: Profile limits, schemas and personal data service

**Files:**
- Create: `lib/profile/limits.ts`, `lib/profile/schemas.ts`, `lib/profile/default-cover-letter-prompt.ts`, `lib/profile/profile-service.ts`, `lib/profile/examples-service.ts`
- Test: `lib/profile/schemas.test.ts`, `lib/profile/profile-service.test.ts`, `lib/profile/examples-service.test.ts`

**Interfaces:**
- Produces:
  - `limits.ts` exports the constants from Global Constraints plus `CONTEXT_ITEM_MAX_LENGTH = 1000`, `COVER_LETTER_EXAMPLE_MAX_COUNT = 3`, `COVER_LETTER_EXAMPLE_MAX_LENGTH = 4000`, `COVER_LETTER_PROMPT_MAX_LENGTH = 4000`, `CV_HINT_SNOOZE_DAYS = 7`, `CV_HINT_IMPACT_SUM_THRESHOLD = 6`, `CV_HINT_SINGLE_ITEM_IMPACT = 5`, `CONTEXT_SCORE_BATCH_SIZE = 5`.
  - `schemas.ts` (zod, `.strict()`): `updateProfileSchema`, `createContextItemSchema`, `updateContextItemSchema`, `updateCvMetaSchema`, `setCvTextSchema`, `createExampleSchema`, `updateExampleSchema`, and `type UpdateProfileInput`.
  - `default-cover-letter-prompt.ts`: `export const DEFAULT_COVER_LETTER_PROMPT: string` composed from spec section 6: lively and concrete, first person, no filler or cliches, 150 to 250 words, two sentence opening then the most relevant achievements, closing of two lines, every fact traceable to the CV or context items, sign with the profile name.
  - `profile-service.ts`: `getProfile(userId: string): Promise<ProfileDTO>` (defaults when no row, `coverLetterPrompt` null means "use default", `defaultCoverLetterPrompt` always included) and `updateProfile(userId: string, input: UpdateProfileInput): Promise<ProfileDTO>` (upsert).
  - `examples-service.ts`: `listExamples(userId): Promise<CoverLetterExampleDTO[]>`, `createExample(userId, input): Promise<CoverLetterExampleDTO>` (throws `ProfileInputError("EXAMPLE_LIMIT")` at 3), `updateExample(userId, id, input): Promise<CoverLetterExampleDTO | null>`, `deleteExample(userId, id): Promise<boolean>` (null and false mean not found for that user).
  - `export class ProfileInputError extends Error { constructor(readonly code: ProfileInputErrorCode, message?: string) }` with `type ProfileInputErrorCode = "CV_LIMIT" | "CV_TOO_LARGE" | "CV_NOT_PDF" | "EXAMPLE_LIMIT"`, defined in `lib/profile/errors.ts` (create it here).
  - DTO types are added to `lib/api-types.ts` in Task 12; services return plain objects matching them.

- [ ] **Step 1: Write failing tests:**
  - schemas: "rejects context item that is only whitespace", "rejects context item over 1000 chars", "trims context item", "rejects salary period outside HOUR MONTH YEAR", "accepts empty employmentTypes", "rejects example letterText over 4000 chars", "rejects unknown keys".
  - `DEFAULT_COVER_LETTER_PROMPT` "mentions 150 and 250 and forbids invented facts".
  - profile service: "returns defaults and the default prompt when no profile row exists", "upsert scopes by userId", "empty string prompt resets to null".
  - examples: "rejects the 4th example with EXAMPLE_LIMIT", "update/delete of another user's example returns null/false".
- [ ] **Step 2: Implement** the files above using the `prisma` mocks-per-file pattern from `lib/hr-questions-service.test.ts` for tests.
- [ ] **Step 3: Verification (user runs):** `npx vitest run lib/profile` and `npm run typecheck`. Expected: pass.

---

### Task 5: CV service

**Files:**
- Create: `lib/profile/cv-service.ts`
- Test: `lib/profile/cv-service.test.ts`

**Interfaces:**
- Consumes: `ProfileInputError`, limits, Task 6 `invalidateContextItemWeights(userId: string, tx?: Prisma.TransactionClient): Promise<void>`.
- Produces (all take `userId` first, never select `fileData` except `getCvFile`):
  - `validateCvFile(file: { size: number; bytes: Uint8Array }): void` (throws `CV_TOO_LARGE` above 4 MB, `CV_NOT_PDF` unless the bytes start with `%PDF-`).
  - `listCvs(userId): Promise<CvDTO[]>` ordered primary first then `createdAt` desc.
  - `createCv(userId, input: { label: string; language: string | null; fileName: string; bytes: Uint8Array }): Promise<CvDTO>` (throws `CV_LIMIT` at 5; first CV becomes primary).
  - `replaceCvFile(userId, cvId, input: { fileName: string; bytes: Uint8Array }): Promise<CvDTO | null>` (clears `extractedText`; invalidates weights when that CV is primary).
  - `updateCvMeta(userId, cvId, input: { label?: string; language?: string | null; isPrimary?: true }): Promise<CvDTO | null>` (making primary demotes the old one in one transaction and invalidates weights).
  - `deleteCv(userId, cvId): Promise<boolean>` (primary deleted promotes the most recently created remaining CV; invalidates weights whenever the primary changed or none remains).
  - `setCvText(userId, cvId, text: string): Promise<CvDTO | null>`.
  - `getCvFile(userId, cvId): Promise<{ fileName: string; bytes: Buffer } | null>`.
  - `getPrimaryCvText(userId): Promise<string | null>`.

- [ ] **Step 1: Write failing tests:** "rejects non PDF bytes even with .pdf name", "rejects a file of 4 MB plus one byte", "accepts exactly 4 MB", "first CV becomes primary", "6th CV throws CV_LIMIT and stores nothing", "listCvs select omits fileData", "making another CV primary leaves exactly one primary and invalidates weights", "deleting primary promotes most recently created", "deleting the last CV invalidates weights and leaves none primary", "replacing a non primary CV does not invalidate weights", "other user's cvId returns null/false for every function".
- [ ] **Step 2: Implement** with Prisma transactions where two rows change.
- [ ] **Step 3: Verification (user runs):** `npx vitest run lib/profile/cv-service.test.ts` and `npm run typecheck`.

---

### Task 6: Context items service

**Files:**
- Create: `lib/profile/context-items-service.ts`
- Test: `lib/profile/context-items-service.test.ts`

**Interfaces:**
- Produces:
  - `listContextItems(userId): Promise<ContextItemDTO[]>` newest first.
  - `createContextItem(userId, input: { text: string }): Promise<ContextItemDTO>` (weight and impact null).
  - `updateContextItem(userId, id, input: { text: string }): Promise<ContextItemDTO | null>` (text change resets weight and impact to null).
  - `deleteContextItem(userId, id): Promise<boolean>`.
  - `invalidateContextItemWeights(userId: string, tx?: Prisma.TransactionClient): Promise<void>` (sets weight and impact to null for all the user's items).

- [ ] **Step 1: Write failing tests:** "new item has null weight and impact", "editing text resets weight", "other user's id returns null/false", "invalidate nulls weight and impact for the user only", "list is newest first".
- [ ] **Step 2: Implement.**
- [ ] **Step 3: Verification (user runs):** `npx vitest run lib/profile/context-items-service.test.ts`.

---

### Task 7: Profile AI provider

**Files:**
- Create: `lib/ai/profile-provider.ts`, `lib/ai/get-profile-provider.ts`, `lib/ai/providers/openai-profile-provider.ts`, `lib/ai/providers/mock-profile-provider.ts`
- Test: `lib/ai/providers/openai-profile-provider.test.ts`, `lib/ai/get-profile-provider.test.ts`

**Interfaces:**
- Consumes: pattern from `lib/ai/hr-questions-provider.ts`, `providers/openai-hr-questions-provider.ts`, `get-hr-questions-provider.ts` (error kinds, `buildResponseParams` shared by `responses.inputTokens.count` and `responses.parse`, `store: false`, wire zod schema mirror, `AI_PROVIDER` factory).
- Produces in `profile-provider.ts`:
  - `type ProfileAiOperation<I, O> = { readonly maxOutputTokens: number; countInputTokens(input: I): Promise<number>; run(input: I, options?: { onUsage?: (usage: AiUsageReport) => void }): Promise<O> }`
  - `interface ProfileAiProvider { readonly name: "mock" | "openai"; extractCv: ProfileAiOperation<{ fileName: string; pdfBase64: string }, CvExtractionResult>; scoreContextItem: ProfileAiOperation<{ cvText: string; itemText: string }, ContextScoreResult>; suggestCvUpdates: ProfileAiOperation<{ cvText: string; items: { id: string; text: string }[] }, CvSuggestionsResult> }`
  - `CvExtractionResult = { text: string; identity: { firstName: string | null; lastName: string | null; email: string | null; phone: string | null; city: string | null } }`; `ContextScoreResult = { weight: "COVERED" | "SUBSTANTIAL" | "MINOR"; impact: number | null }` (zod refine: impact 1 to 5 when SUBSTANTIAL, null otherwise); `CvSuggestionsResult = { suggestions: { itemId: string; bullet: string }[] }`.
  - `class ProfileAiProviderError extends Error { constructor(message: string, readonly kind: "configuration" | "rate_limit" | "timeout" | "network" | "invalid_result" = "invalid_result") }`.
  - `getProfileProvider(): ProfileAiProvider` reading `AI_PROVIDER`.
- Note: PDF input uses the Responses API `input_file` content part with `file_data` (base64 data URL) and `filename`; the current providers pass `input` as a plain string, so `input` becomes an array of `{ role: "user", content: [...] }` for `extractCv` only.

- [ ] **Step 1: Check current docs before writing code:** run `npx ctx7@latest library openai "Responses API PDF input_file"` then `npx ctx7@latest docs <id> "input_file file_data base64 pdf structured output"` and confirm the exact request shape and whether the model `gpt-5-nano-2025-08-07` accepts PDFs. If it does not, stop and report options (a different model constant for `extractCv` only, or dropping PDF input in favor of the pasted-text path) instead of guessing.
- [ ] **Step 2: Write failing tests** (pattern: `openai-hr-questions-provider.test.ts`):
  - "extractCv count and parse share model, instructions, input and text format".
  - "extractCv sends the PDF as an input_file part with filename".
  - "scoreContextItem returns SUBSTANTIAL with impact 1 to 5" and "rejects SUBSTANTIAL without impact as invalid_result".
  - "scoreContextItem puts itemText only inside the tagged data input, never in instructions" (use an injection string).
  - "maps RateLimitError, timeout and connection errors to ProfileAiProviderError kinds".
  - factory: "returns mock for AI_PROVIDER=mock, openai for openai, throws configuration error otherwise".
- [ ] **Step 3: Implement** the provider files. Prompts treat CV text and item text as untrusted data inside XML-like tags; scoring instructions define COVERED, SUBSTANTIAL (new technology or role, results with numbers, measurable impact) and MINOR (does not change the CV picture). The mock provider returns deterministic fixtures (identity from first lines, weight SUBSTANTIAL impact 3 when text contains a digit, else MINOR).
- [ ] **Step 4: Verification (user runs):** `npx vitest run lib/ai/providers/openai-profile-provider.test.ts lib/ai/get-profile-provider.test.ts` and `npm run typecheck`.

---

### Task 8: AI orchestration (import, scoring, hint, suggestions)

**Files:**
- Create: `lib/profile/cv-import-service.ts`, `lib/profile/context-scoring-service.ts`, `lib/profile/cv-update-hint.ts`
- Test: `lib/profile/cv-import-service.test.ts`, `lib/profile/context-scoring-service.test.ts`, `lib/profile/cv-update-hint.test.ts`

**Interfaces:**
- Consumes: Tasks 5, 6, 7, `runGatedAiCall`, `requireAiAccessApproved`, `AiAccessError`.
- Produces:
  - `type ProfileAiSkipReason = AiAccessErrorCode | "PROVIDER_FAILED" | "NO_CV_TEXT"`.
  - `importCvText(userId: string, cvId: string): Promise<{ status: "extracted"; identity: CvIdentitySuggestionsDTO } | { status: "skipped"; reason: ProfileAiSkipReason }>` (loads file via `getCvFile`, gated `extractCv`, stores text with `setCvText`; never throws for AI problems).
  - `scorePendingContextItems(userId: string, options: { limit: number }): Promise<{ scored: number; remaining: number; skipped: ProfileAiSkipReason | null }>` (newest unscored first, uses `getPrimaryCvText`, one gated `scoreContextItem` call per item, stops at the first quota or provider failure, keeps unscored items null).
  - `evaluateCvUpdateHint(input: { items: { weight: string | null; impact: number | null; createdAt: Date }[]; snoozedAt: Date | null; now: Date }): CvUpdateHintDTO` (pure). Visible when the sum of `impact` over SUBSTANTIAL items is at least 6 or any SUBSTANTIAL item has impact 5, and not snoozed. Snoozed means `snoozedAt` within 7 days and no SUBSTANTIAL item created after `snoozedAt`.
  - `getCvUpdateHint(userId): Promise<CvUpdateHintDTO>`, `snoozeCvUpdateHint(userId): Promise<CvUpdateHintDTO>`.
  - `suggestCvUpdates(userId): Promise<{ status: "ok"; suggestions: { itemId: string; bullet: string }[] } | { status: "skipped"; reason: ProfileAiSkipReason }>` (sends only SUBSTANTIAL items).

- [ ] **Step 1: Write failing tests:**
  - import: "stores extracted text and returns identity suggestions without writing them to the profile", "returns skipped with AI_ACCESS_REQUIRED and stores nothing when access is missing", "returns skipped PROVIDER_FAILED on provider error and keeps the CV".
  - scoring: "scores newest items first up to limit", "stops at PROFILE_LIMIT_REACHED and leaves the rest null", "returns NO_CV_TEXT when the primary CV has no text", "item with null weight after provider failure stays null".
  - hint: "visible when SUBSTANTIAL impact sum is 6", "visible for a single impact 5 item", "MINOR and COVERED never make it visible however many", "unscored items are ignored", "hidden for 7 days after snooze", "reappears when a newer SUBSTANTIAL item exists after snooze", "reappears after 7 days".
  - suggestions: "sends only SUBSTANTIAL items".
- [ ] **Step 2: Implement** following the call-site pattern in `lib/hr-questions-service.ts` (mock provider branch versus `runGatedAiCall`).
- [ ] **Step 3: Verification (user runs):** `npx vitest run lib/profile` and `npm run typecheck`.

---

### Task 9: API routes for profile and examples

**Files:**
- Create: `app/api/profile/route.ts`, `app/api/profile/examples/route.ts`, `app/api/profile/examples/[id]/route.ts`
- Test: `app/api/profile/route.test.ts`, `app/api/profile/examples/route.test.ts`, `app/api/profile/examples/[id]/route.test.ts`

**Interfaces:**
- Consumes: Task 4 services and schemas; route skeleton from `app/api/settings/auto-ignore/route.ts` (`runtime = "nodejs"`, `dynamic = "force-dynamic"`, `checkSession`, `jsonError`, `zodErrorResponse`, `Cache-Control: no-store`).
- Produces: `GET /api/profile` returns `ProfileDTO`; `PATCH /api/profile` body `UpdateProfileInput` returns `ProfileDTO`; `GET /api/profile/examples` returns `CoverLetterExampleDTO[]`; `POST` returns 201; `PATCH` and `DELETE` on `[id]` return 404 for another user's id; `EXAMPLE_LIMIT` maps to 409.

- [ ] **Step 1: Write failing tests** (pattern: `app/api/applications/route.test.ts`): 401 and 403 before touching Prisma, invalid JSON 400, strict schema rejects unknown keys, scoped by `userId`, 404 for foreign example, 409 on the 4th example, responses carry `Cache-Control: no-store`.
- [ ] **Step 2: Implement** the three route files. Do not log request bodies.
- [ ] **Step 3: Verification (user runs):** `npx vitest run app/api/profile`.

---

### Task 10: API routes for CVs

**Files:**
- Create: `app/api/profile/cvs/route.ts`, `app/api/profile/cvs/[id]/route.ts`, `app/api/profile/cvs/[id]/file/route.ts`, `app/api/profile/cvs/[id]/text/route.ts`
- Test: matching `route.test.ts` next to each

**Interfaces:**
- Consumes: Tasks 5 and 8.
- Produces:
  - `GET /api/profile/cvs` returns `CvDTO[]`.
  - `POST /api/profile/cvs` (multipart: `file`, `label`, optional `language`) returns 201 `CvUploadResultDTO = { cv: CvDTO; textStatus: "extracted" | "missing"; identitySuggestions: CvIdentitySuggestionsDTO | null; skippedReason: string | null }`; validates with `validateCvFile` before any write, then `importCvText`; AI problems never fail the upload.
  - `PATCH /api/profile/cvs/[id]` JSON `{ label?, language?, isPrimary? }` returns `CvDTO`; `DELETE` returns 204.
  - `PUT /api/profile/cvs/[id]/file` (multipart `file`) replaces the file and re-runs `importCvText`, returns `CvUploadResultDTO`; `GET` streams `application/pdf` with `Content-Disposition: attachment` and `Cache-Control: private, no-store`.
  - `PUT /api/profile/cvs/[id]/text` JSON `{ text }` returns `CvDTO`.
  - Errors: `CV_NOT_PDF` 415, `CV_TOO_LARGE` 413, `CV_LIMIT` 409, foreign id 404.

- [ ] **Step 1: Write failing tests:** "413 for a file over 4 MB and nothing stored", "415 for non PDF bytes with a .pdf name", "409 on the 6th CV", "upload succeeds with textStatus missing and skippedReason when AI access is missing", "identitySuggestions are returned but the profile is not modified", "404 for another user's cv on PATCH, DELETE, file GET, file PUT, text PUT", "file GET sets private no-store and attachment headers", 401 before Prisma.
- [ ] **Step 2: Implement** reading `request.formData()`; enforce the size check on `file.size` before reading bytes.
- [ ] **Step 3: Verification (user runs):** `npx vitest run app/api/profile/cvs`.

---

### Task 11: API routes for context items and CV update hint

**Files:**
- Create: `app/api/profile/context-items/route.ts`, `app/api/profile/context-items/[id]/route.ts`, `app/api/profile/context-items/score/route.ts`, `app/api/profile/cv-update-hint/route.ts`, `app/api/profile/cv-update-hint/snooze/route.ts`, `app/api/profile/cv-update-hint/suggestions/route.ts`
- Test: matching `route.test.ts` next to each

**Interfaces:**
- Consumes: Tasks 6 and 8.
- Produces: `GET`/`POST /api/profile/context-items` (POST creates, then runs `scorePendingContextItems(userId, { limit: CONTEXT_SCORE_BATCH_SIZE })` and returns `{ item: ContextItemDTO; scoring: { scored: number; remaining: number; skipped: string | null } }` with 201, item saved even when scoring is skipped); `PATCH`/`DELETE` on `[id]` (PATCH also triggers scoring, same response shape; 404 for foreign id); `POST .../score` runs a batch and returns `{ scored, remaining, skipped }`; `GET /api/profile/cv-update-hint` returns `CvUpdateHintDTO`; `POST .../snooze` returns `CvUpdateHintDTO`; `POST .../suggestions` returns the `suggestCvUpdates` result.

- [ ] **Step 1: Write failing tests:** "POST saves the item and returns 201 even when scoring is skipped for quota", "POST returns scoring.skipped PROFILE_LIMIT_REACHED without failing", "PATCH resets weight and re-scores", "foreign id 404", "score route returns remaining count", "suggestions route returns skipped when the user has no AI access", 401 before Prisma.
- [ ] **Step 2: Implement.**
- [ ] **Step 3: Verification (user runs):** `npx vitest run app/api/profile/context-items app/api/profile/cv-update-hint`.

---

### Task 12: Client data layer

**Files:**
- Modify: `lib/api-types.ts`, `lib/api.ts`, `lib/query-keys.ts`
- Create: hooks in `hooks/`, one per file, `"use client"`, patterned on `use-auto-ignore-settings.ts` and `use-update-auto-ignore-settings.ts`: `use-profile.ts`, `use-update-profile.ts`, `use-cvs.ts`, `use-upload-cv.ts`, `use-replace-cv-file.ts`, `use-update-cv.ts`, `use-delete-cv.ts`, `use-set-cv-text.ts`, `use-context-items.ts`, `use-create-context-item.ts`, `use-update-context-item.ts`, `use-delete-context-item.ts`, `use-score-context-items.ts`, `use-cv-update-hint.ts`, `use-snooze-cv-update-hint.ts`, `use-suggest-cv-updates.ts`, `use-cover-letter-examples.ts`, `use-create-cover-letter-example.ts`, `use-update-cover-letter-example.ts`, `use-delete-cover-letter-example.ts`
- Test: `lib/query-keys.test.ts` only if one already exists; otherwise none (hooks are thin)

**Interfaces:**
- Produces DTO types in `lib/api-types.ts`: `ProfileDTO` (`firstName, lastName, contactEmail, phone: string | null`; `address: { street, postalCode, city, region, country: string | null }`; `salary: { amount: number | null; currency: string | null; period: "HOUR" | "MONTH" | "YEAR" | null }`; `employmentTypes: ("FULL_TIME" | "PART_TIME" | "CONTRACT")[]`; `workFormats: ("REMOTE" | "ONSITE" | "HYBRID")[]`; `coverLetterPrompt: string | null`; `defaultCoverLetterPrompt: string`), `CvDTO` (`id, label, language: string | null, isPrimary, fileName, fileSize, hasText, createdAt, updatedAt`), `CvIdentitySuggestionsDTO`, `CvUploadResultDTO`, `ContextItemDTO` (`id, text, weight: "COVERED" | "SUBSTANTIAL" | "MINOR" | null, impact: number | null, createdAt, updatedAt`), `ContextItemSaveResultDTO` (`{ item, scoring: { scored, remaining, skipped } }`), `CvUpdateHintDTO` (`{ visible: boolean; substantialCount: number; snoozed: boolean }`), `CoverLetterExampleDTO`, plus payload types.
- Produces in `lib/api.ts`: one function per route (`getProfile`, `updateProfile`, `getCvs`, `uploadCv(formData: FormData)`, `replaceCvFile(id, formData)`, ...). Add a private `requestMultipart<T>` that omits the JSON `Content-Type` and reuses the same `ApiError` parsing as `request`; do not change `request` behavior.
- Produces in `queryKeys`: `profile: { root: () => ["profile"] as const, detail: () => ["profile","detail"] as const, cvs: () => ["profile","cvs"] as const, contextItems: () => ["profile","context-items"] as const, cvUpdateHint: () => ["profile","cv-update-hint"] as const, examples: () => ["profile","examples"] as const }`. Existing keys untouched.
- Mutation cache rules: CV changes invalidate `cvs`, `contextItems` and `cvUpdateHint`; item create, update, delete and score invalidate `contextItems` and `cvUpdateHint`; profile update sets the `detail` cache from the response.

- [ ] **Step 1: Add DTOs, API functions and query keys** as specified.
- [ ] **Step 2: Add the hooks** following the exact conventions above (`staleTime: 60_000` for queries).
- [ ] **Step 3: Verification (user runs):** `npm run typecheck`, `npx eslint hooks lib/api.ts lib/api-types.ts lib/query-keys.ts`.

---

### Task 13: i18n namespace and nav key

**Files:**
- Create: `lib/i18n/messages/en/profile.ts`, `lib/i18n/messages/uk/profile.ts`
- Modify: `lib/i18n/messages/en/index.ts`, `lib/i18n/messages/uk/index.ts`, `lib/i18n/messages/en/nav.ts`, `lib/i18n/messages/uk/nav.ts`
- Test: existing `lib/i18n/translate.test.ts` covers key parity (no new test file)

**Interfaces:**
- Produces: `nav.profile` and a `profile` namespace with these groups: `profile.personal.*` (field labels, address fields), `profile.search.*` (salary amount, currency, period options, employment types, work formats), `profile.cv.*` (upload, replace, primary, delete, textMissing, pasteText, identitySuggestions, errors for 413, 415, 409), `profile.context.*` (title, add, saveAndAddAnother, save, empty, notScored, weightCovered, weightSubstantial, weightMinor, scoringSkipped), `profile.hint.*` (title, body with `{count}`, showSuggestions, remindLater), `profile.letter.*` (promptTitle, resetToDefault, examplesTitle, addExample, vacancyText, letterText, limitReached), `profile.ai.unavailable` (shown when AI features are skipped), `profile.save.*`. Ukrainian plurals include one, few, many, other.

- [ ] **Step 1: Write both dictionaries** (UK typed as `Messages["profile"]`) and register them in both `index.ts` files; add `nav.profile` in both `nav.ts`.
- [ ] **Step 2: Verification (user runs):** `npx vitest run lib/i18n` and `npm run typecheck`.

---

### Task 14: Profile page, navigation and form sections

**Files:**
- Create: `app/(protected)/(console)/profile/page.tsx`, `components/profile/profile-page.tsx`, `components/profile/personal-section.tsx`, `components/profile/search-preferences-section.tsx`, `components/profile/cover-letter-section.tsx`, `lib/profile/profile-form.ts`
- Modify: `components/console/pipeline-navigation-rail.tsx`
- Test: `lib/profile/profile-form.test.ts`

**Interfaces:**
- Consumes: Tasks 12 and 13.
- Produces:
  - `page.tsx`: server component, `metadata.title = "Profile · Job Tracker"`, renders `<ProfilePage />`.
  - `ProfilePage()` client shell: stacked sections in order hint banner (Task 16), personal, search preferences, CVs (Task 15), context items (Task 16), cover letter. Reads `useProfile()`; skeleton while loading.
  - `lib/profile/profile-form.ts`: zod `profileFormSchema`, `profileFormValuesFromProfile(profile: ProfileDTO): ProfileFormValues`, `profileFormValuesToPayload(values: ProfileFormValues): UpdateProfilePayload` (empty strings become null), patterned on `lib/application-form.ts`.
  - Sections use react-hook-form with `zodResolver`, `Field`, `FieldLabel`, `Input`, `Select`, `Textarea`, `Checkbox` groups for multi select (no switch, radio or popover components installed), toast via `sonner`, errors via `getApiErrorMessage`.
  - `CoverLetterSection`: textarea showing the effective prompt, "Reset to default" sends `coverLetterPrompt: null`; examples list with add (two textareas), delete; add disabled with explanation at 3.
  - Rail: `<RailLink href="/profile" label={t("nav.profile")} ... />` with a lucide icon, active when the pathname starts with `/profile`.
- Run the `ui-ux-pro-max` skill once for this screen group before writing components (project UI rule); follow `.claude/rules/game-hub-ui.md` tokens.

- [ ] **Step 1: Write failing tests** for `profile-form.ts`: "empty strings map to null in the payload", "salary amount parsed to integer or null", "values round trip from a ProfileDTO", "rejects negative salary".
- [ ] **Step 2: Implement** the files and the nav link (GitNexus impact first for `PipelineNavigationRail`).
- [ ] **Step 3: Verification (user runs):** `npx vitest run lib/profile/profile-form.test.ts`, `npm run typecheck`, then `npm run dev` and open `/profile`: forms save, nav link highlights, narrow width is usable.

---

### Task 15: CV section

**Files:**
- Create: `components/profile/cv-section.tsx`, `components/profile/cv-upload-dialog.tsx`, `components/profile/identity-suggestions.tsx`
- Test: `components/profile/identity-suggestions.test.tsx`

**Interfaces:**
- Consumes: Task 12 hooks (`useCvs`, `useUploadCv`, `useReplaceCvFile`, `useUpdateCv`, `useDeleteCv`, `useSetCvText`) and `useUpdateProfile`.
- Produces:
  - `CvSection()`: list of CVs (label, language, fileName, size, primary badge), actions: upload (disabled at 5 with explanation), replace file, set as primary, rename and language, download link to `/api/profile/cvs/{id}/file`, delete with `alert-dialog` confirmation (extra warning when deleting the primary).
  - `CvUploadDialog`: label, optional language, PDF file input (client pre-check of size and type; server remains authoritative). After a result with `textStatus: "missing"` it shows the reason from `getApiErrorMessage`/`profile.ai.unavailable` and a textarea to paste CV text (`useSetCvText`).
  - `IdentitySuggestions({ suggestions: CvIdentitySuggestionsDTO; current: ProfileDTO; onApply: (patch: Partial<UpdateProfilePayload>) => void; onDismiss: () => void })`: shows proposed values per field with checkboxes, never overwrites a field that already has a value unless the user ticks it, applies only ticked fields.

- [ ] **Step 1: Write failing tests** for `IdentitySuggestions`: "fields already filled in the profile start unticked", "apply passes only ticked fields", "dismiss does not call onApply".
- [ ] **Step 2: Implement** the three components.
- [ ] **Step 3: Verification (user runs):** `npx vitest run components/profile/identity-suggestions.test.tsx`, `npm run typecheck`, manual: upload a PDF, see suggestions, replace, switch primary, delete primary and see promotion, try a renamed `.txt` and a 5 MB file.

---

### Task 16: Context items section and CV update banner

**Files:**
- Create: `components/profile/context-items-section.tsx`, `components/profile/cv-update-hint-banner.tsx`
- Test: `components/profile/context-items-section.test.tsx`, `components/profile/cv-update-hint-banner.test.tsx`

**Interfaces:**
- Consumes: Task 12 hooks (`useContextItems`, `useCreateContextItem`, `useUpdateContextItem`, `useDeleteContextItem`, `useScoreContextItems`, `useCvUpdateHint`, `useSnoozeCvUpdateHint`, `useSuggestCvUpdates`).
- Produces:
  - `ContextItemsSection()`: list newest first, each row with text, a weight badge (COVERED, SUBSTANTIAL, MINOR, or "not scored yet"), edit and delete. "+ Add item" opens one input field. Two buttons: "Save" saves and closes; "Save and add another" saves and immediately opens a fresh empty field while the saved item appears in the list. Buttons disabled while the mutation is pending (prevents duplicate submits). On failure the typed text stays. When `scoring.skipped` is set, a quiet note explains scoring is paused. On mount and after saves, if unscored items remain and scoring was not skipped, call `useScoreContextItems` to finish the batch.
  - `CvUpdateHintBanner()`: renders nothing unless `useCvUpdateHint().data?.visible`; shows title, body with `{count}`, buttons "Show what to add to the CV" (calls `useSuggestCvUpdates`, lists `bullet` suggestions with copy buttons, never edits the CV) and "Remind me later" (snooze).
- Design reference: the three states approved in the brainstorming mockup; final look follows the app's Game Hub tokens.

- [ ] **Step 1: Write failing tests** (jsdom component tests; copy the environment setup used by an existing `*.test.tsx` such as `components/admin/settings/settings-section.test.tsx`, mocking hooks):
  - section: "Save closes the field after the item is saved", "Save and add another keeps the field open and empty and shows the saved item", "a failed save keeps the typed text", "buttons are disabled while saving", "unscored items show the not scored badge".
  - banner: "renders nothing when hint.visible is false", "remind later calls snooze", "show suggestions lists bullets and does not call any CV update".
- [ ] **Step 2: Implement** both components using `Button`, `Input`, `Badge` and shadcn primitives; no new dependencies.
- [ ] **Step 3: Verification (user runs):** `npx vitest run components/profile`, `npm run typecheck`, `npm run lint`, manual: add several items, see weights appear, exhaust the profile quota (set the limit to 0 in admin) and confirm items still save as "not scored yet", snooze the banner and confirm it stays hidden.

---

## Self-review notes

- Spec coverage: sections 3.1 to 3.5 (T4, T5, T6, T9, T10, T14, T15), section 4 UI (T14 to T16), section 5 weighting and hint with impact scale for the "one very heavy item" rule (T7, T8, T16), section 6 prompt (T4, T14), section 7 constraints (Global Constraints, T2, T3), section 8 decisions (Bytes and 4 MB in T1 and T5, cached text in T5 and T8, pasted text fallback in T10 and T15, unscored state in T6 and T8, primary semantics in T5, snooze in T4 and T8, routes session only in T9 to T11, prompt null means default in T4, example caps in T4, new quota feature in T1 to T3).
- Calls made while planning (not in the spec): added a nullable `impact` 1 to 5 to items so "one very heavy item" is expressible; no "request more usage" flow for PROFILE; default global profile limit 50 per day; PROFILE shares the existing daily token limit; extension strings untouched because the extension does not call profile AI.
