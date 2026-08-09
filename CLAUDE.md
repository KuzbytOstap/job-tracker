# Job Tracker

Production single-user Next.js + TypeScript application using PostgreSQL/Prisma and TanStack Query.

## Working defaults

- Make the smallest change that fully solves the requested task.
- Work only inside this repository. Never create another Next.js project or nested job-tracker directory.
- Use npm only.
- The user handles Git manually. Never commit or push.
- Do not add dependencies unless explicitly requested.
- Do not add code comments unless explicitly requested.
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
