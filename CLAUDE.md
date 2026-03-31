# CLAUDE.md — OpenChair

## Project

OpenChair — open-source, AI-native salon operating system.
Built by a salon-owning engineer, for their own salon first.

### MVP (Phase 1) — ship this

- Booking system — multi-hairdresser: each salon has multiple stylists, clients book a specific stylist + time slot, no double-booking per stylist
- Client cards
- SMS reminders (Twilio)

### Phase 2 — architected in schema, not implemented yet

- Colour formula builder
- Virtual hairstyle try-on (HairFastGAN via Replicate)
- WhatsApp booking
- Revenue summary dashboard
- Stripe billing

### Pricing

~$55/week (~$238/month) · Cost to serve ~$3–7/month · 97% margin

### Privacy

- Client photos are ephemeral — 24hr TTL with explicit consent
- Consent capture + TTL enforced in Prisma schema from day one
- No long-term biometric storage

## Tech Stack

- **Framework:** Next.js 14 (App Router)
- **Database:** Supabase (Postgres) + Prisma ORM
- **AI:** Anthropic SDK, HairFastGAN via Replicate API
- **Payments:** Stripe
- **Messaging:** Twilio (SMS), WhatsApp Business API
- **Styling:** Tailwind CSS + shadcn/ui
- **Agent Framework:** gg-framework (includes gg-arch — structured adversarial review tool for architecture decisions)
- **gg-arch source:** `../gg-framework/packages/gg-arch/` — thinking tool, not a coding agent. Uses tension mapping, reviewer personas, and decision records to stress-test architecture before code gets written. Run `gg-arch review` for interactive sessions.

## Directory Structure

```
src/
  app/              # Next.js App Router pages & layouts
    (auth)/         # Auth-related routes
    (dashboard)/    # Authenticated dashboard routes
    api/            # Route handlers
  components/       # React components (colocate with feature when possible)
    ui/             # shadcn/ui primitives
  lib/              # Shared utilities, SDK clients, helpers
  server/           # Server-only code (actions, services, queries)
  types/            # Shared TypeScript types & interfaces
prisma/
  schema.prisma     # Prisma schema (single source of truth for DB)
  migrations/       # Prisma migrations
public/             # Static assets
```

## Conventions

- **Language:** TypeScript strict mode — no `any`, no `as` casts unless unavoidable
- **Components:** Named exports, one component per file, PascalCase filenames
- **Server vs Client:** Default to Server Components; add `"use client"` only when needed
- **Data fetching:** Server Actions for mutations, server components for reads
- **Env vars:** All in `.env.local`, validated at startup via `lib/env.ts`
- **Prisma:** Run `npx prisma generate` after schema changes; `npx prisma migrate dev` for migrations
- **Imports:** Use `@/` path alias mapped to `src/`

## Quality Gates

```bash
# Lint
npx next lint

# Type check
npx tsc --noEmit

# Tests
npx vitest run

# Prisma validate
npx prisma validate

# Format
npx prettier --check .
```

All five must pass with zero warnings before any PR merges.

## Rules

- No `console.log` in committed code — use structured logging
- No commented-out code — delete it
- No unused imports, variables, or files
- Handle all errors explicitly — no silent catches
- Keep files under 300 lines; split if larger
- API route handlers validate input with Zod
- Database queries go through Prisma — no raw SQL unless justified
