---
paths:
  - prisma/**
  - prisma.config.ts
  - lib/prisma.ts
---

- Prisma Client uses @prisma/adapter-pg.
- Runtime queries use DATABASE_URL.
- Prisma CLI migrations use DIRECT_URL through prisma.config.ts.
- Never modify an existing applied migration.
- Schema changes require a new migration.
- Do not run migrations against production.
