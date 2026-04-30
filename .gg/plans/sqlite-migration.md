# Migrate from Supabase/Postgres to SQLite + NextAuth

## Overview

Replace Supabase (Postgres + Auth) with SQLite + NextAuth.js. This eliminates the external Supabase dependency entirely — database and auth both run locally within the Railway container.

## Key Risks

- **Railway ephemeral filesystem**: SQLite data is lost on redeploy unless a **persistent volume** is mounted. Must configure a Railway volume (e.g., `/data`) and point `DATABASE_URL` to `file:/data/openchair.db`.
- **Auth migration**: Supabase Auth is deeply wired (middleware, server actions, dashboard layout, auth helper). Replacing with NextAuth requires new session handling.
- **Prisma schema changes**: `@db.Date` is Postgres-specific; enums work differently in SQLite (Prisma handles via check constraints). Need to remove `@db.Date` from Client.birthDate.
- **Existing migrations**: Must delete all Postgres migrations and start fresh with SQLite.
- **Concurrent writes**: SQLite has limited write concurrency. Fine for a single-salon MVP but worth noting.

## Scope of Changes

### Files to modify

- `prisma/schema.prisma` — change provider to `sqlite`, remove `@db.Date`, add url to datasource
- `prisma.config.ts` — update datasource url
- `prisma/migrations/` — delete all, re-initialize for SQLite
- `prisma/migrations/migration_lock.toml` — will be regenerated as `sqlite`
- `src/lib/prisma.ts` — remove `PrismaPg` adapter, use plain `PrismaClient`
- `src/lib/env.ts` — remove Supabase env vars, add `NEXTAUTH_SECRET`, `NEXTAUTH_URL`
- `src/middleware.ts` — replace Supabase session with NextAuth session check
- `src/server/actions/auth.ts` — rewrite sign-in/sign-up/sign-out using NextAuth + bcrypt
- `src/server/auth.ts` — rewrite `getAuthenticatedSalon()` using NextAuth `getServerSession`
- `src/app/(dashboard)/layout.tsx` — replace Supabase auth check with NextAuth
- `src/app/(auth)/sign-in/page.tsx` — update to use NextAuth `signIn`
- `src/app/(auth)/sign-up/page.tsx` — update sign-up flow (create user then sign in)
- `src/lib/__tests__/auth.test.ts` — update mocks for NextAuth
- `.env` / `.env.example` — update env var list

### Files to delete

- `src/lib/supabase/client.ts`
- `src/lib/supabase/server.ts`
- `src/lib/supabase/middleware.ts`

### Files to create

- `src/app/api/auth/[...nextauth]/route.ts` — NextAuth route handler
- `src/lib/auth.ts` — NextAuth configuration (providers, callbacks, adapter)

### Packages to add

- `next-auth@4` (stable, well-documented with App Router)
- `@auth/prisma-adapter` (NextAuth Prisma adapter)
- `bcryptjs` + `@types/bcryptjs` (password hashing)

### Packages to remove

- `@supabase/ssr`
- `@supabase/supabase-js`
- `@prisma/adapter-pg` (no longer need Postgres driver adapter)

### Schema changes

- `User.supabaseId` → `User.password` (hashed password string)
- `User.emailVerified` (optional DateTime, needed by NextAuth adapter)
- Add `Account`, `Session`, `VerificationToken` models (NextAuth Prisma adapter requirements)
- `datasource.provider` → `"sqlite"`
- Remove `@db.Date` from `Client.birthDate`

### Railway changes

- Add a persistent volume mounted at `/data`
- Set `DATABASE_URL=file:/data/openchair.db`
- Remove all Supabase env vars
- Add `NEXTAUTH_SECRET` (random string) and `NEXTAUTH_URL=https://openchair-production.up.railway.app`

## Steps

1. Remove packages `@supabase/ssr`, `@supabase/supabase-js`, `@prisma/adapter-pg` and add `next-auth@4`, `@auth/prisma-adapter`, `bcryptjs`, `@types/bcryptjs`
2. Update `prisma/schema.prisma`: change provider to `sqlite`, remove `@db.Date`, replace `User.supabaseId` with `User.password`, add NextAuth models (`Account`, `Session`, `VerificationToken`), and update datasource to use `env("DATABASE_URL")`
3. Delete all files under `prisma/migrations/` and run `prisma migrate dev --name init` to create fresh SQLite migration
4. Update `prisma.config.ts` to point datasource url to `DATABASE_URL`
5. Rewrite `src/lib/prisma.ts` to use plain `PrismaClient` without the `PrismaPg` adapter
6. Create `src/lib/auth.ts` with NextAuth config using Credentials provider (email/password with bcrypt) and Prisma adapter
7. Create `src/app/api/auth/[...nextauth]/route.ts` as the NextAuth route handler
8. Rewrite `src/server/actions/auth.ts`: signIn uses NextAuth `signIn()`, signUp creates user with hashed password then signs in, signOut uses NextAuth `signOut()`
9. Rewrite `src/server/auth.ts` (`getAuthenticatedSalon`) to use NextAuth `getServerSession` instead of Supabase
10. Update `src/app/(dashboard)/layout.tsx` to use NextAuth session instead of Supabase auth
11. Rewrite `src/middleware.ts` to use NextAuth middleware pattern (check session token cookie)
12. Delete `src/lib/supabase/client.ts`, `src/lib/supabase/server.ts`, `src/lib/supabase/middleware.ts`
13. Update `src/lib/env.ts`: remove all Supabase env vars, remove `DIRECT_URL`, change `DATABASE_URL` validation to `z.string().min(1)` (not URL since `file:` paths aren't URLs), add `NEXTAUTH_SECRET` and `NEXTAUTH_URL`
14. Update `.env` and `.env.example` with new env vars (`DATABASE_URL=file:./prisma/dev.db`, `NEXTAUTH_SECRET`, `NEXTAUTH_URL=http://localhost:3000`)
15. Update `src/lib/__tests__/auth.test.ts` to mock NextAuth instead of Supabase
16. Update Railway variables: set `DATABASE_URL=file:/data/openchair.db`, `NEXTAUTH_SECRET`, `NEXTAUTH_URL`, remove Supabase vars, and add a persistent volume at `/data`
17. Run `npx tsc --noEmit`, `npx next lint`, and `npx vitest run` to verify everything compiles and passes
