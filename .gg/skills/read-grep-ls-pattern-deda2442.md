---
name: read-grep-ls-pattern
description: Auto-generated from 89 tool calls
---

## Goal

You are auditing a Next.js 14 (App Router) + Prisma + Twilio codebase called "OpenChair" — a salon booking system. Focus ONLY on **lurking bugs**.

Look for: unhandled edge cases, missing error handli

## Tool Pattern

- read: 55 call(s)
- grep: 16 call(s)
- ls: 9 call(s)
- find: 7 call(s)
- bash: 2 call(s)

## Steps

1. `ls`
2. `ls`
3. `ls`
4. `ls`
5. `read` on `src/server/actions/bookings.ts`
6. `read` on `src/server/actions/public-booking.ts`
7. `read` on `src/server/actions/recurring.ts`
8. `read` on `src/lib/twilio.ts`
9. `read` on `src/lib/slots.ts`
10. `read` on `src/lib/booking-validation.ts`
11. `read` on `src/lib/sms-templates.ts`
12. `read` on `src/lib/sms-commands.ts`
13. `read` on `src/lib/rate-limit.ts`
14. `read` on `src/lib/env.ts`
15. `read` on `src/lib/prisma.ts`
16. `read` on `src/lib/utils.ts`
17. `read` on `src/lib/auth.ts`
18. `read` on `src/lib/api-auth.ts`
19. `read` on `src/lib/constants.ts`
20. `ls`
