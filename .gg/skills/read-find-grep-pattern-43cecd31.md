---
name: read-find-grep-pattern
description: Auto-generated from 56 tool calls
---

## Goal

You are auditing a Next.js 14 (App Router) + Prisma + Supabase + Twilio codebase called "OpenChair" — a salon booking system. Focus ONLY on **security**.

Look for: hardcoded secrets, injection risks

## Tool Pattern

- read: 36 call(s)
- find: 12 call(s)
- grep: 7 call(s)
- ls: 1 call(s)

## Steps

1. `ls`
2. `find`
3. `find`
4. `find`
5. `find`
6. `read` on `.env.example`
7. `read` on `next.config.mjs`
8. `find`
9. `find`
10. `find`
11. `read` on `src/lib/env.ts`
12. `read` on `src/lib/auth.ts`
13. `read` on `src/server/auth.ts`
14. `read` on `src/app/api/auth/[...nextauth]/route.ts`
15. `read` on `src/app/api/cron/recurring/route.ts`
16. `read` on `src/app/api/cron/reminders/route.ts`
17. `read` on `src/app/api/health/route.ts`
18. `read` on `src/app/api/v1/bookings/[id]/route.ts`
19. `read` on `src/app/api/v1/bookings/route.ts`
20. `read` on `src/app/api/v1/salon/[slug]/route.ts`
