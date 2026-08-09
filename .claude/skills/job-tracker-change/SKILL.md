---
name: job-tracker-change
description: Implement a focused production-safe change in the Job Tracker without broad repository exploration.
disable-model-invocation: true
argument-hint: "<task>"
---

Implement only this task:

$ARGUMENTS

Workflow:
- Follow CLAUDE.md and any applicable path-scoped rules in .claude/rules.
- If exact files are named, read only those files.
- If exact files are unknown, use targeted repository search first.
- Use code-locator only when the required flow is still ambiguous.
- Use GitNexus only for unfamiliar cross-cutting flows, high-risk refactors, dependency impact, or complex debugging.
- Never run GitNexus impact analysis for routine local UI edits.
- Do not perform broad repository exploration.
- Implement directly once enough context is known.
- Do not run verification commands.
- Stop after the requested change.

Return only:
- modified files;
- concise implementation summary;
- manual checks;
- unresolved issues.
