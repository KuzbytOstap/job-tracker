# Job Tracker

Production multi-user Next.js + TypeScript application using PostgreSQL/Prisma and TanStack Query.

## Working defaults

- Make the smallest change that fully solves the requested task.
- Work only inside this repository. Never create another Next.js project or nested job-tracker directory.
- Use npm only.
- The user handles Git manually. Never commit or push.
- Do not add dependencies unless explicitly requested.
- Never generate or insert new code comments at any stage of implementation, including temporary edits that are later removed. This includes inline comments, block comments, JSDoc/TSDoc, TODO/FIXME notes, explanatory comments, and commented-out code. Write the final self-explanatory code directly. Do not spend tool calls adding and then removing comments. Preserve existing comments unless the task requires changing them.
- Do not update documentation unless explicitly requested.
- Do not refactor, rename, reformat, or clean up unrelated code.
- Read only files required for the task.
- When the prompt provides exact files, do not perform codebase discovery first.
- Use MCP tools and subagents only when they materially reduce uncertainty; never invoke them by default.
- Preserve existing production behavior and stored data unless the task explicitly changes them.
- Stop when the requested scope is complete.

## Verification

- Do not run tests, typecheck, lint, build, Playwright, or other verification commands.
- The user runs verification manually.
- Return targeted verification commands instead.

## UI defaults

- Reuse installed shadcn/ui primitives.
- Use motion/react for JavaScript-driven animation.
- Respect accessibility and prefers-reduced-motion.
- Preserve existing mobile behavior unless the task explicitly includes mobile.

## Final response

Return only:
- modified files;
- concise implementation summary;
- manual checks;
- unresolved issues.

<!-- gitnexus:start -->
# GitNexus — Code Intelligence

This project is indexed by GitNexus as **job-tracker** (1153 symbols, 3073 relationships, 86 execution flows). Use the GitNexus MCP tools to understand code, assess impact, and navigate safely.

> Index stale? Run `node .gitnexus/run.cjs analyze` from the project root — it auto-selects an available runner. No `.gitnexus/run.cjs` yet? `npx gitnexus analyze` (npm 11 crash → `npm i -g gitnexus`; #1939).

## Always Do

- **MUST run impact analysis before editing any symbol.** Before modifying a function, class, or method, run `impact({target: "symbolName", direction: "upstream"})` and report the blast radius (direct callers, affected processes, risk level) to the user.
- **MUST run `detect_changes()` before committing** to verify your changes only affect expected symbols and execution flows. For regression review, compare against the default branch: `detect_changes({scope: "compare", base_ref: "main"})`.
- **MUST warn the user** if impact analysis returns HIGH or CRITICAL risk before proceeding with edits.
- When exploring unfamiliar code, use `query({search_query: "concept"})` to find execution flows instead of grepping. It returns process-grouped results ranked by relevance.
- When you need full context on a specific symbol — callers, callees, which execution flows it participates in — use `context({name: "symbolName"})`.
- For security review, `explain({target: "fileOrSymbol"})` lists taint findings (source→sink flows; needs `analyze --pdg`).

## Never Do

- NEVER edit a function, class, or method without first running `impact` on it.
- NEVER ignore HIGH or CRITICAL risk warnings from impact analysis.
- NEVER rename symbols with find-and-replace — use `rename` which understands the call graph.
- NEVER commit changes without running `detect_changes()` to check affected scope.

## Resources

| Resource | Use for |
|----------|---------|
| `gitnexus://repo/job-tracker/context` | Codebase overview, check index freshness |
| `gitnexus://repo/job-tracker/clusters` | All functional areas |
| `gitnexus://repo/job-tracker/processes` | All execution flows |
| `gitnexus://repo/job-tracker/process/{name}` | Step-by-step execution trace |

## CLI

| Task | Read this skill file |
|------|---------------------|
| Understand architecture / "How does X work?" | `.claude/skills/gitnexus/gitnexus-exploring/SKILL.md` |
| Blast radius / "What breaks if I change X?" | `.claude/skills/gitnexus/gitnexus-impact-analysis/SKILL.md` |
| Trace bugs / "Why is X failing?" | `.claude/skills/gitnexus/gitnexus-debugging/SKILL.md` |
| Rename / extract / split / refactor | `.claude/skills/gitnexus/gitnexus-refactoring/SKILL.md` |
| Tools, resources, schema reference | `.claude/skills/gitnexus/gitnexus-guide/SKILL.md` |
| Index, status, clean, wiki CLI commands | `.claude/skills/gitnexus/gitnexus-cli/SKILL.md` |

<!-- gitnexus:end -->
