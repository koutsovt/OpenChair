# RESEARCH: OpenChair — AI-Native Salon OS

Generated: 2026-03-31
Stack: Next.js 14 (App Router) + TypeScript + Supabase + Prisma

## Current State

- **Zero code** — planning docs only (CLAUDE.md, CONFIG_REFERENCE.md, FRAMEWORK_DECISION.md, docs/verified-libraries.md)
- No package.json, no git repo, no config files, no `node_modules`
- All architecture decisions documented but nothing scaffolded

## Stack Verdict

**Next.js 14+ (App Router) + Supabase + Prisma** — confirmed best choice.

- 17x npm downloads vs SvelteKit, flagship Supabase integration, primary AI SDK target
- Cal.com (open-source booking SaaS) validates this exact stack in production
- Real salon booking courses/repos exist only for Next.js + Supabase
- Remix lacks AI SDK support; SvelteKit has smaller ecosystem + flawed Supabase docs

## INSTALL

```bash
# Init project
pnpm create next-app@14 . --typescript --tailwind --eslint --app --src-dir --import-alias "@/*" --use-pnpm

# Core dependencies
pnpm add @supabase/supabase-js@2.101.0 @supabase/ssr@0.10.0 \
  twilio@5.13.1 resend@6.10.0 \
  date-fns@4.1.0 react-day-picker@9.14.0 \
  react-hook-form@7.72.0 zod@4.3.6 @hookform/resolvers@5.2.2 \
  @t3-oss/env-nextjs@0.13.11 \
  lucide-react sonner @tanstack/react-table

# Dev dependencies
pnpm add -D prisma@7.6.0 @prisma/client@7.6.0 \
  vitest @vitejs/plugin-react vite-tsconfig-paths jsdom \
  @testing-library/react @testing-library/dom @testing-library/jest-dom \
  @playwright/test \
  prettier eslint-config-prettier prettier-plugin-tailwindcss \
  husky lint-staged @commitlint/cli @commitlint/config-conventional \
  tailwindcss-animate

# shadcn/ui (copies components, not an npm dep)
pnpm dlx shadcn@latest init

# Prisma init
pnpm dlx prisma init
```

## DEPENDENCIES

| Package                 | Version   | Purpose                      |
| ----------------------- | --------- | ---------------------------- |
| `@supabase/supabase-js` | `2.101.0` | Supabase client SDK          |
| `@supabase/ssr`         | `0.10.0`  | SSR-compatible Supabase auth |
| `twilio`                | `5.13.1`  | SMS sending via Twilio       |
| `resend`                | `6.10.0`  | Transactional email sending  |
| `date-fns`              | `4.1.0`   | Date/time utilities          |
| `react-day-picker`      | `9.14.0`  | Calendar date picker UI      |
| `react-hook-form`       | `7.72.0`  | Performant form management   |
| `zod`                   | `4.3.6`   | Schema validation            |
| `@hookform/resolvers`   | `5.2.2`   | Zod ↔ react-hook-form bridge |
| `@t3-oss/env-nextjs`    | `0.13.11` | Type-safe env var validation |
| `lucide-react`          | latest    | Icon library                 |
| `sonner`                | latest    | Toast notifications          |
| `@tanstack/react-table` | latest    | Data table for client lists  |

### Phase 2 (not installed yet)

| Package                  | Version  | Purpose                   |
| ------------------------ | -------- | ------------------------- |
| `stripe`                 | `21.0.1` | Payment processing        |
| `replicate`              | `1.4.0`  | AI model execution        |
| `@great-detail/whatsapp` | `8.4.0`  | WhatsApp Cloud API client |
| `uploadthing`            | `7.7.4`  | File/image uploads        |
| `zustand`                | `5.0.12` | Client state management   |

## DEV DEPENDENCIES

| Package                           | Version | Purpose                         |
| --------------------------------- | ------- | ------------------------------- |
| `prisma`                          | `7.6.0` | Prisma CLI + migrations         |
| `@prisma/client`                  | `7.6.0` | Prisma query client             |
| `vitest`                          | latest  | Unit test framework             |
| `@vitejs/plugin-react`            | latest  | Vitest React support            |
| `vite-tsconfig-paths`             | latest  | Resolve `@/` in tests           |
| `jsdom`                           | latest  | DOM env for tests               |
| `@testing-library/react`          | latest  | Component testing               |
| `@testing-library/dom`            | latest  | DOM testing utilities           |
| `@testing-library/jest-dom`       | latest  | DOM assertion matchers          |
| `@playwright/test`                | latest  | E2E testing                     |
| `prettier`                        | latest  | Code formatter                  |
| `eslint-config-prettier`          | latest  | Disable ESLint formatting rules |
| `prettier-plugin-tailwindcss`     | latest  | Auto-sort Tailwind classes      |
| `husky`                           | `9.1.7` | Git hooks                       |
| `lint-staged`                     | latest  | Run linters on staged files     |
| `@commitlint/cli`                 | latest  | Enforce commit conventions      |
| `@commitlint/config-conventional` | latest  | Conventional commit rules       |
| `tailwindcss-animate`             | latest  | Animation plugin for shadcn     |

## CONFIG FILES TO CREATE

### `next.config.mjs`

```js
/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    remotePatterns: [{ protocol: 'https', hostname: '**.supabase.co' }],
  },
};
export default nextConfig;
```

### `tsconfig.json`

Key: `strict: true`, `moduleResolution: "bundler"`, paths `@/*` → `./src/*`, next plugin

### `.eslintrc.json`

```json
{
  "extends": ["next/core-web-vitals", "next/typescript", "prettier"],
  "rules": {
    "@typescript-eslint/no-unused-vars": ["warn", { "argsIgnorePattern": "^_" }],
    "no-console": ["warn", { "allow": ["warn", "error"] }]
  }
}
```

### `.prettierrc`

```json
{
  "semi": true,
  "singleQuote": true,
  "tabWidth": 2,
  "trailingComma": "es5",
  "printWidth": 100,
  "plugins": ["prettier-plugin-tailwindcss"],
  "tailwindFunctions": ["cn", "cva"]
}
```

### `vitest.config.ts`

Plugins: `tsconfigPaths()`, `react()`. Environment: `jsdom`. Include: `src/**/*.{test,spec}.{ts,tsx}`

### `components.json` (shadcn/ui)

Style: `new-york`, rsc: `true`, baseColor: `neutral`, cssVariables: `true`, icon library: `lucide`

### `prisma/schema.prisma`

Provider: `postgresql`, `directUrl` for Supabase pooling, `@@map` to snake_case tables

## PROJECT STRUCTURE

```
src/
├── app/
│   ├── (auth)/
│   │   ├── layout.tsx
│   │   ├── sign-in/page.tsx
│   │   └── sign-up/page.tsx
│   ├── (dashboard)/
│   │   ├── layout.tsx                    # sidebar + header shell
│   │   ├── dashboard/page.tsx            # overview/stats
│   │   ├── bookings/
│   │   │   ├── page.tsx                  # booking list + calendar view
│   │   │   ├── [id]/page.tsx             # booking detail
│   │   │   └── _components/
│   │   ├── clients/
│   │   │   ├── page.tsx                  # client list (CRM)
│   │   │   ├── [id]/page.tsx             # client card/detail
│   │   │   └── _components/
│   │   ├── services/
│   │   │   └── page.tsx                  # manage services
│   │   ├── team/
│   │   │   ├── page.tsx                  # stylist list
│   │   │   ├── [id]/page.tsx             # stylist detail + schedule
│   │   │   └── _components/
│   │   └── settings/
│   │       └── page.tsx
│   ├── book/
│   │   └── [salonSlug]/
│   │       ├── page.tsx                  # public: pick service + stylist
│   │       ├── [stylistId]/page.tsx      # public: pick date + time
│   │       └── confirm/page.tsx          # public: enter details + confirm
│   ├── api/
│   │   ├── bookings/route.ts
│   │   ├── slots/route.ts
│   │   └── webhooks/
│   ├── layout.tsx
│   ├── page.tsx                          # landing page
│   └── globals.css
├── components/
│   ├── ui/                               # shadcn primitives
│   ├── layout/                           # sidebar, header
│   └── shared/                           # data-table, status-badge
├── lib/
│   ├── prisma.ts                         # singleton client
│   ├── supabase/
│   │   ├── client.ts                     # browser client
│   │   └── server.ts                     # server client
│   ├── env.ts                            # @t3-oss/env-nextjs validation
│   ├── slots.ts                          # getAvailableSlots()
│   ├── booking-validation.ts             # conflict detection
│   └── utils.ts                          # cn(), formatters
├── server/
│   └── actions/
│       ├── bookings.ts
│       ├── clients.ts
│       ├── services.ts
│       └── availability.ts
└── types/
    └── index.ts
prisma/
├── schema.prisma
├── migrations/
└── seed.ts
```

## KEY DOMAIN MODELS (Prisma)

Core entities discovered from real salon/booking projects (cal.com, CrazyStack, event.me):

| Model                 | Purpose                                                                   |
| --------------------- | ------------------------------------------------------------------------- |
| `Salon`               | Multi-tenant root, has slug for public booking URL                        |
| `Stylist`             | Service provider, belongs to salon, has weekly availability               |
| `StylistAvailability` | Recurring weekly schedule (dayOfWeek + startTime/endTime)                 |
| `Service`             | Offered service with price (cents) + duration (minutes)                   |
| `ServiceCategory`     | Groups services (Haircuts, Coloring, etc.)                                |
| `StylistService`      | Junction: which stylists do which services, with price/duration overrides |
| `Client`              | CRM record — separate from User (clients don't need app accounts)         |
| `Booking`             | Core entity: client + stylist + service + startTime/endTime + status      |
| `User`                | Staff logins only (owner, stylist, admin roles)                           |

## KEY PATTERNS

1. **Weekly recurring availability** — store `dayOfWeek` + `startTime`/`endTime` per stylist, compute slots dynamically (not pre-generated rows)
2. **Overlap detection** — `existing.startTime < newEnd AND existing.endTime > newStart` with `@@index([stylistId, startTime])` for performance
3. **Separate Client from User** — salon clients tracked by phone/name in CRM, no app account needed; User is for staff logins
4. **Server Actions for mutations** — `/server/actions/` for bookings, clients, services; server components for reads
5. **Public booking under `/book/[salonSlug]/`** — no auth required, separate from dashboard route group
6. **Walk-in support** — `guestName`/`guestPhone` on Booking for clients without CRM records
7. **Price in cents** — avoid floating-point issues
8. **BookingStatus enum** — PENDING → CONFIRMED → IN_PROGRESS → COMPLETED | CANCELLED | NO_SHOW

## CONFLICT BETWEEN EXISTING DOCS

| Issue                                                                                          | Resolution                                                                            |
| ---------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------- |
| CLAUDE.md says Next.js 14, FRAMEWORK_DECISION.md says upgrade to 15+                           | Start with Next.js 14 (stable, battle-tested). Upgrade path is straightforward later. |
| CONFIG_REFERENCE.md Prisma schema uses `prisma-client-js`, verified-libraries.md uses Prisma 7 | Use Prisma 7.6.0 — requires `prisma-client` provider, not `prisma-client-js`          |
| CONFIG_REFERENCE.md has generic models (Organization/Member/Event)                             | Replace with salon-specific domain models above                                       |
| Auth: CLAUDE.md mentions Supabase Auth, .env template has NEXTAUTH vars                        | Use Supabase Auth via `@supabase/ssr` — drop NextAuth references                      |

## SOURCES

- cal.com (Next.js + Prisma booking SaaS) — scheduling patterns, overlap detection
- event.me (Next.js + Prisma + Clerk) — slot generation, availability schema
- CrazyStack (Node.js salon management) — salon domain model, entity relationships
- piyush-eon/calendly-clone (Next.js + Prisma) — server actions pattern, route organization
- Supabase official docs — `@supabase/ssr` setup, connection pooling
- shadcn/ui docs — component config, new-york style deprecation
- Next.js official docs — vitest setup, ESLint config, tsconfig
- npm registry — all package versions verified 2026-03-31
