---
name: job-tracker-change
description: Implement a focused production-safe change in the Job Tracker without broad repository exploration.
disable-model-invocation: true
argument-hint: "<task>"
---

Implement only this task:

$ARGUMENTS

Project facts:
- Production multi-user Next.js and TypeScript application.
- Prisma with PostgreSQL.
- TanStack Query handles server state and caches.
- ApplicationListItemDTO is for board and list views.
- Full ApplicationDTO is for application details.
- Heavy fields must not be added to the list endpoint.
- PATCH concurrency uses expectedUpdatedAt.
- HR_CALL AI questions are generated through a separate follow-up request.
- Apply edits in their intended final form; do not create temporary explanatory comments or cleanup-only follow-up edits.

Workflow:
- Follow CLAUDE.md and any applicable path-scoped rules in .claude/rules.
- If exact files are named, read only those files.
- If exact files are unknown, use targeted repository search first; use the code-locator subagent only if the required flow is still ambiguous.
- Use GitNexus only for unfamiliar cross-cutting flows, high-risk refactors, dependency impact, or complex debugging. Never run GitNexus impact analysis for routine local UI edits.
- Preserve the existing architecture, production behavior, and stored data.
- Keep database, API, validation, hooks, and UI responsibilities separated.
- Do not create large monolithic components.
- Do not perform broad repository exploration.
- Implement directly once enough context is known.
- Do not refactor or format unrelated code.
- Do not update documentation unless explicitly requested.
- Do not run verification commands.
- Stop after the requested change.

Return only:
- modified files;
- concise implementation summary;
- manual checks;
- unresolved issues.
