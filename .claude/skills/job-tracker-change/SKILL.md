---
name: Job Tracker focused change
description: Implement a focused production-safe change in the Job Tracker without broad repository exploration.
disable-model-invocation: true
argument-hint: "<task>"
---

Implement only this task:

$ARGUMENTS

Project facts:
- Production single-user Next.js and TypeScript application.
- Prisma with PostgreSQL.
- TanStack Query handles server state and caches.
- ApplicationListItemDTO is for board and list views.
- Full ApplicationDTO is for application details.
- Heavy fields must not be added to the list endpoint.
- PATCH concurrency uses expectedUpdatedAt.
- HR_CALL AI questions are generated through a separate follow-up request.

Rules:
- Do not analyze the whole repository.
- If exact files are unknown, use the code-locator subagent first.
- Use GitNexus only for narrow symbol, dependency, and flow discovery.
- Read only files required by the discovered flow.
- Preserve the existing architecture, production behavior, and stored data.
- Keep database, API, validation, hooks, and UI responsibilities separated.
- Do not create large monolithic components.
- Do not add comments to code.
- Do not refactor or format unrelated code.
- Do not update documentation unless explicitly requested.
- Do not run the full test suite, full lint, or production build.
- Stop after the requested task.

Return only:
- modified files;
- migration or deployment steps;
- focused checks;
- unresolved issues.
