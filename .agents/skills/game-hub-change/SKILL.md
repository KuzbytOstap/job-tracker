---
name: game-hub-change
description: Implement a focused Job Tracker Game Hub UI/UX change using the established V2 design system.
disable-model-invocation: true
argument-hint: "<task>"
---

Implement only:

$ARGUMENTS

Follow AGENTS.md and applicable .Codex/rules.

Workflow:
- Invoke ui-ux-pro-max once for a focused audit of the requested UI/UX change.
- Keep the audit narrow and immediately relevant to implementation.
- Do not produce a broad design-system report.
- Do not use 21st MCP unless the task explicitly requests references or requires a genuinely new visual direction.
- If 21st is needed, inspect at most 3 references.
- If exact files are provided, read only those files.
- Otherwise locate the smallest relevant UI flow with targeted search.
- Do not use GitNexus, code-locator, Context7, or Playwright for routine visual changes.
- Preserve business logic and data behavior unless explicitly requested.
- Implement the smallest coherent change.
- Do not run verification commands.
- Stop when the requested UI change is complete.

Return only:
- modified files;
- concise UI/UX changes;
- mobile behavior;
- manual checks;
- unresolved issues.
