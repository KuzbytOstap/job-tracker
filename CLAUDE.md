# Job Tracker development rules

- Work only inside the existing repository.
- Do not create another Next.js project or a nested job-tracker directory.
- Do not commit or push changes. The user handles Git manually.
- Use npm, not pnpm, yarn, or bun.
- The project uses Next.js 15 App Router, TypeScript, Tailwind CSS, Prisma 7, PostgreSQL, and Neon.
- Prisma Client must use @prisma/adapter-pg.
- Prisma runtime queries use DATABASE_URL.
- Prisma CLI migrations use DIRECT_URL through prisma.config.ts.
- Use the installed shadcn/ui components instead of inventing duplicate UI primitives.
- Use Motion for React from "motion/react" for animations.
- Use the current shadcn/ui Field components with React Hook Form and Zod. Do not expect a legacy components/ui/form.tsx file.
- Build mobile-first and verify the UI at 360px width and desktop sizes.
- Keep the UI polished, cohesive, accessible, and responsive.
- Respect prefers-reduced-motion.
- Do not use TypeScript any.
- Keep components typed and reasonably small.
- Do not add unnecessary comments.
- Run the verification commands requested in each prompt and fix failures.
