# Job Tracker development rules

- Work only inside the existing repository.
- Do not create another Next.js project or a nested job-tracker directory.
- Do not commit or push changes. The user handles Git manually.
- Never generate or insert new code comments at any stage of implementation, including temporary edits that are later removed. This includes inline comments, block comments, JSDoc/TSDoc, TODO/FIXME notes, explanatory comments, and commented-out code. Write the final self-explanatory code directly. Do not spend tool calls adding and then removing comments. Preserve existing comments unless the task requires changing them.
- Use npm, not pnpm, yarn, or bun.
- Prisma Client must use @prisma/adapter-pg.
- Prisma runtime queries use DATABASE_URL.
- Prisma CLI migrations use DIRECT_URL through prisma.config.ts.
- Use the installed shadcn/ui components instead of inventing duplicate UI primitives.
- Use Motion for React from "motion/react" for animations.
- Use the current shadcn/ui Field components with React Hook Form and Zod. Do not expect a legacy components/ui/form.tsx file.
- Build mobile-first and verify the UI at 360px width and desktop sizes.
- Respect prefers-reduced-motion.

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
