# RESEARCH: OpenChair — Open-Source AI-Native Salon Operating System

Generated: 2026-03-31
Stack: Next.js 14 (App Router) + TypeScript 5 + Supabase (Postgres) + Prisma 7

---

## CURRENT STATE

Phase 1 is **complete and running**: 11 Prisma models, 12+ API endpoints, 8 server actions, 53 unit tests, full public REST API (v1), SMS webhook with inbound forwarding, rate limiting, and audit logging.

Phase 2 is planned: colour formula builder, virtual hairstyle try-on (HairFastGAN), WhatsApp booking, revenue dashboard, Stripe billing.

---

## STACK VERDICT: KEEP — UPGRADE NEXT.JS 14 → 15 WHEN READY

| Alternative              | Verdict    | Reason                                                                     |
| ------------------------ | ---------- | -------------------------------------------------------------------------- |
| Remix / React Router v7  | ❌ REJECT  | Massive migration cost, different data-loading patterns, smaller ecosystem |
| SvelteKit + Drizzle      | ❌ REJECT  | Complete rewrite, no native shadcn/ui, 3x smaller ecosystem                |
| Next.js 15 (upgrade)     | ✅ UPGRADE | Low-effort (~1-2 days), gains Turbopack 10x HMR, PPR, React 19             |
| Drizzle (replace Prisma) | ❌ REJECT  | Prisma 7 removed Rust engine (3x faster), migration would touch every file |

---

## INSTALL

```bash
# Phase 2 dependencies (add when each feature starts)
pnpm add stripe@21.0.1 replicate@1.4.0 recharts@3.8.1 \
  @upstash/ratelimit@2.0.8 @upstash/redis \
  inngest@4.1.0 uploadthing@7.7.4 @uploadthing/react \
  @react-email/components@1.0.10 sharp pino cmdk

# Dev tooling improvement
pnpm add -D @next/bundle-analyzer@14.2.35
```

---

## DEPENDENCIES (installed — verified at latest)

| Package                    | Version   | Purpose                      |
| -------------------------- | --------- | ---------------------------- |
| `next`                     | `14.2.35` | React framework (App Router) |
| `react` / `react-dom`      | `^18`     | UI library                   |
| `@supabase/supabase-js`    | `2.101.0` | Auth + Supabase client       |
| `@supabase/ssr`            | `0.10.0`  | SSR auth helpers             |
| `twilio`                   | `5.13.1`  | SMS + WhatsApp messaging     |
| `resend`                   | `6.10.0`  | Transactional email          |
| `zod`                      | `4.3.6`   | Schema validation            |
| `date-fns`                 | `4.1.0`   | Date utilities               |
| `@date-fns/tz`             | `^1.4.1`  | Timezone support             |
| `@t3-oss/env-nextjs`       | `0.13.11` | Typed env validation         |
| `react-hook-form`          | `7.72.0`  | Form state management        |
| `@hookform/resolvers`      | `5.2.2`   | Zod↔RHF bridge               |
| `@tanstack/react-table`    | `^8.21.3` | Data tables                  |
| `sonner`                   | `^2.0.7`  | Toast notifications          |
| `lucide-react`             | `^1.7.0`  | Icon library                 |
| `react-day-picker`         | `9.14.0`  | Calendar picker              |
| `@radix-ui/*` (11 pkgs)    | various   | Accessible UI primitives     |
| `class-variance-authority` | `^0.7.1`  | Component variants           |
| `clsx`                     | `^2.1.1`  | Conditional classnames       |
| `tailwind-merge`           | `^3.5.0`  | Tailwind class dedup         |

## DEPENDENCIES TO ADD (Phase 2)

| Package                   | Version   | Purpose                   |
| ------------------------- | --------- | ------------------------- |
| `stripe`                  | `21.0.1`  | Payment processing        |
| `@anthropic-ai/sdk`       | `0.80.0`  | AI assistant features     |
| `replicate`               | `1.4.0`   | HairFastGAN image gen     |
| `recharts`                | `3.8.1`   | Revenue dashboard charts  |
| `@upstash/ratelimit`      | `2.0.8`   | Production rate limiting  |
| `@upstash/redis`          | `^1.34.3` | Redis for rate limiter    |
| `inngest`                 | `4.1.0`   | Background jobs / cron    |
| `uploadthing`             | `7.7.4`   | Image uploads             |
| `@uploadthing/react`      | `^7.3.3`  | Upload React components   |
| `@react-email/components` | `1.0.10`  | JSX email templates       |
| `sharp`                   | `^0.34.5` | Image resize/optimization |
| `cmdk`                    | `^1.1.1`  | Command palette search    |
| `pino`                    | `^9.6.0`  | Structured JSON logging   |

## DEV DEPENDENCIES (installed — verified at latest)

| Package                       | Version   | Purpose             |
| ----------------------------- | --------- | ------------------- |
| `prisma` / `@prisma/client`   | `^7.6.0`  | ORM CLI + client    |
| `typescript`                  | `^5`      | Type checking       |
| `eslint`                      | `^8`      | Linting             |
| `eslint-config-next`          | `14.2.35` | Next.js lint rules  |
| `prettier`                    | `^3.8.1`  | Code formatting     |
| `prettier-plugin-tailwindcss` | `^0.7.2`  | TW class sorting    |
| `vitest`                      | `^4.1.2`  | Unit test runner    |
| `@playwright/test`            | `^1.58.2` | E2E testing         |
| `@testing-library/react`      | `^16.3.2` | Component testing   |
| `@testing-library/dom`        | `^10.4.1` | DOM test utils      |
| `@testing-library/jest-dom`   | `^6.9.1`  | DOM matchers        |
| `husky`                       | `^9.1.7`  | Git hooks           |
| `lint-staged`                 | `^16.4.0` | Pre-commit linting  |
| `@commitlint/cli`             | `^20.5.0` | Commit message lint |
| `tailwindcss`                 | `^3.4.1`  | CSS framework       |
| `postcss`                     | `^8`      | CSS processing      |
| `tsx`                         | `^4.21.0` | TS script runner    |

## DEV DEPENDENCIES TO ADD

| Package                 | Version   | Purpose              |
| ----------------------- | --------- | -------------------- |
| `@next/bundle-analyzer` | `14.2.35` | Bundle size analysis |

---

## CONFIG FILES — KEY CHANGES NEEDED

### `tsconfig.json` — Add stricter checks

```json
"noUncheckedIndexedAccess": true,
"noFallthroughCasesInSwitch": true,
"forceConsistentCasingInFileNames": true
```

### `next.config.mjs` — Add security headers + Prisma external packages

```js
const nextConfig = {
  serverExternalPackages: ['@prisma/client'],
  headers: async () => [
    {
      source: '/(.*)',
      headers: [
        { key: 'X-Frame-Options', value: 'DENY' },
        { key: 'X-Content-Type-Options', value: 'nosniff' },
        { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
      ],
    },
  ],
};
export default nextConfig;
```

### `package.json` — Add scripts

```json
"dev:turbo": "next dev --turbo",
"analyze": "ANALYZE=true next build"
```

### Do NOT upgrade (yet)

- ESLint 9 flat config — wait for Next.js 15
- Tailwind v4 — wait for Next.js 15 + shadcn migration tooling
- Biome — doesn't support `next/core-web-vitals` or `react-hooks/exhaustive-deps`

---

## CONFIG FILES TO CREATE

### `.github/workflows/ci.yml`

```yaml
name: CI
on:
  pull_request:
  push:
    branches: [main]

concurrency:
  group: ${{ github.workflow }}-${{ github.ref }}
  cancel-in-progress: true

jobs:
  quality:
    runs-on: ubuntu-latest
    strategy:
      matrix:
        check: [lint, typecheck, test]
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
      - uses: actions/setup-node@v4
        with: { node-version: 20, cache: pnpm }
      - run: pnpm install --frozen-lockfile
      - run: npx prisma generate
        env: { SKIP_ENV_VALIDATION: 'true' }
      - if: matrix.check == 'lint'
        run: pnpm lint
      - if: matrix.check == 'typecheck'
        run: pnpm tsc --noEmit
      - if: matrix.check == 'test'
        run: pnpm vitest run
        env: { SKIP_ENV_VALIDATION: 'true' }

  build:
    needs: quality
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
      - uses: actions/setup-node@v4
        with: { node-version: 20, cache: pnpm }
      - run: pnpm install --frozen-lockfile
      - run: npx prisma generate
      - run: pnpm build
        env:
          SKIP_ENV_VALIDATION: 'true'
          NEXT_PUBLIC_APP_URL: 'http://localhost:3000'
          NEXT_PUBLIC_SUPABASE_URL: 'http://localhost:54321'
          NEXT_PUBLIC_SUPABASE_ANON_KEY: 'fake'
```

---

## PROJECT STRUCTURE — RECOMMENDED EVOLUTION

```
src/
├── app/                          # Routes — thin pages, no business logic
│   ├── (auth)/                   # sign-in, sign-up
│   ├── (dashboard)/              # authenticated routes
│   │   ├── bookings/
│   │   ├── clients/
│   │   ├── dashboard/
│   │   ├── services/
│   │   ├── settings/             # ← ADD: salon settings, API keys, billing
│   │   └── team/
│   ├── api/
│   │   ├── cron/                 # scheduled jobs
│   │   └── v1/                   # public REST API
│   └── book/[salonSlug]/         # public booking flow
│
├── components/
│   ├── layout/
│   └── ui/                       # shadcn primitives
│
├── lib/                          # Pure utilities — NO Prisma imports
│   ├── __tests__/
│   ├── scheduling/
│   ├── supabase/
│   ├── validations/              # ← ADD: shared Zod schemas
│   ├── constants.ts
│   ├── env.ts
│   ├── rate-limit.ts
│   ├── sms-templates.ts
│   └── utils.ts
│
├── server/                       # Server-only — Prisma lives here
│   ├── actions/                  # Mutations
│   ├── auth.ts                   # ← ADD: centralized getAuthenticatedSalon()
│   ├── queries/                  # ← ADD: read-only data access for RSCs
│   │   ├── bookings.ts
│   │   ├── clients.ts
│   │   ├── dashboard.ts
│   │   ├── services.ts
│   │   └── team.ts
│   └── services/                 # ← ADD: shared business logic
│       ├── booking-service.ts    # Deduplicated booking creation
│       ├── sms-service.ts        # sendSMS + logSms orchestration
│       └── audit-log.ts          # Activity logging
│
├── types/
│   └── index.ts
└── hooks/
    └── use-toast.ts
```

### Key Principle: `lib/` = pure (no Prisma), `server/` = DB access

---

## KEY PATTERNS — PRIORITIES

### Must-Fix (Correctness)

1. **`$transaction` for booking creation** — TOCTOU race: `validateBooking()` + `prisma.booking.create()` must be wrapped in `prisma.$transaction()` to prevent double-bookings under concurrent requests
2. **Centralize `getAuthenticatedSalon()`** — Currently copy-pasted 7 times across server action files → extract to `server/auth.ts`
3. **Deduplicate booking creation** — Identical logic in `actions/bookings.ts`, `actions/public-booking.ts`, and `api/v1/bookings/route.ts` → extract to `server/services/booking-service.ts`

### Should-Add (Quality)

4. **`server/queries/` layer** — Dashboard pages run inline Prisma calls → extract reusable query functions
5. **Shared Zod schemas** — `createBookingSchema` defined separately in actions and API routes → single source in `lib/validations/`
6. **Audit log model** — `AuditLog { salonId, userId, action, entityType, entityId, metadata, createdAt }` — log every business mutation
7. **Production rate limiting** — Replace in-memory `Map` with `@upstash/ratelimit` (persists across deploys/restarts)

### Future (Phase 2)

8. **WhatsApp** — Use existing `twilio` package (supports WhatsApp Business API natively via `whatsapp:+{phone}` prefix, no new dependency)
9. **Background jobs** — Replace cron API routes with `inngest` (retries, fan-out, monitoring, cron schedules, no infra to manage)
10. **Structured logging** — Replace `console.error` with `pino` for JSON structured logs

---

## PAPERCLIP INSIGHTS

[Paperclip](https://github.com/paperclipai/paperclip) is an open-source Node.js + React platform for orchestrating AI agent companies — org charts, budgets, governance, and goal-aligned autonomous task execution.

### Patterns to Adopt

| Paperclip Pattern                       | OpenChair Application                                                                                                                                                                                    |
| --------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **`companyId` scoping on every query**  | OpenChair has `salonId` on every model but some queries don't filter by it (e.g. `findConflictingBooking` in booking-validation). Fix: add `salonId` to every `where` clause.                            |
| **`logActivity()` on every mutation**   | Paperclip logs every write with `{companyId, actorId, action}`. OpenChair should add an `AuditLog` model — critical for salon owners to answer "who cancelled this?"                                     |
| **`assertCompanyAccess()` centralized** | Paperclip has one auth check function reused everywhere. OpenChair does ad-hoc `findFirst({ where: { id, salonId } })` in every action. Extract to `server/auth.ts`.                                     |
| **Service layer with injectable `db`**  | Paperclip services accept `db` as parameter for testability. OpenChair calls `prisma` globally — extract `server/services/` with dependency injection for easier mocking.                                |
| **Immutable append-only audit log**     | Paperclip's history is immutable with full traceability. OpenChair's `SmsLog` is a good start — extend the pattern to all business events (booking created/cancelled/rescheduled, client updated, etc.). |
| **Typed API responses**                 | Paperclip uses shared response types between API and frontend. OpenChair should add API response types in `types/` for the v1 endpoints.                                                                 |

### Patterns to Skip

| Pattern                         | Why                                           |
| ------------------------------- | --------------------------------------------- |
| Heartbeat / agent orchestration | OpenChair has no autonomous AI agents         |
| Multi-company isolation         | Single-salon SaaS per tenant (already scoped) |
| Plugin/extension system         | Too early — core features first               |
| Org charts / hierarchies        | Salon teams are flat (owner + stylists)       |
| Budget enforcement per agent    | No per-agent cost tracking needed             |

### When Paperclip Becomes Relevant

If OpenChair evolves so each salon has an autonomous AI assistant (handling scheduling, marketing, client comms independently), Paperclip's agent orchestration patterns would apply. That's Phase 5+ territory.

---

## DEV TOOLING MATRIX

| Category        | Tool                      | Version            | Status                              |
| --------------- | ------------------------- | ------------------ | ----------------------------------- |
| Package Manager | pnpm                      | `10.x`             | ✅ Already using                    |
| Bundler         | Turbopack (via `--turbo`) | built-in           | ⚠️ Add `dev:turbo` script           |
| Linter          | ESLint                    | `^8`               | ✅ Keep v8 (Next.js 14 compat)      |
| Formatter       | Prettier                  | `3.8.1`            | ✅ Already optimal                  |
| Test Framework  | Vitest                    | `4.1.2`            | ✅ Latest                           |
| Type Checker    | TypeScript                | `^5.8`             | ✅ Latest 5.x                       |
| E2E Testing     | Playwright                | `1.58.2`           | ✅ Installed (no tests written yet) |
| Git Hooks       | Husky + lint-staged       | `9.1.7` / `16.4.0` | ✅ Already using                    |
| Commit Linting  | Commitlint                | `20.5.0`           | ✅ Already using                    |
| Bundle Analysis | @next/bundle-analyzer     | —                  | 🔴 Not installed — add              |

---

## SETUP STEPS (for a new contributor)

1. Clone repo, run `pnpm install`
2. Copy `.env.example` → `.env.local`, fill in Supabase + Twilio credentials
3. Start Supabase local: `npx supabase start`
4. Run migrations: `npx prisma migrate dev`
5. Seed data: `pnpm tsx prisma/seed.ts`
6. Start dev server: `pnpm dev` (or `pnpm dev:turbo`)
7. Run quality gates: `pnpm lint && pnpm tsc --noEmit && pnpm vitest run`

---

## SOURCES

- https://github.com/paperclipai/paperclip — Architecture patterns, audit logging, multi-tenant scoping
- https://www.npmjs.com — All package version verification
- https://nextjs.org/docs — Next.js 14/15 comparison, Turbopack status
- https://www.prisma.io/blog — Prisma 7 Rust engine removal, performance benchmarks
- https://orm.drizzle.team — Drizzle comparison (rejected)
- https://supabase.com/docs — SDK versions, SSR setup
- https://inngest.com/docs — Background job patterns for Next.js
- https://upstash.com/docs/redis/sdks/ratelimit — Production rate limiting
- https://vitest.dev — Vitest 4.x config
- https://playwright.dev — E2E testing setup
