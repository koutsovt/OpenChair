# OpenChair

OpenChair is an open-source, AI-native salon operating system built by a salon-owning engineer. The MVP focuses on the daily essentials a salon actually runs on: **multi-stylist booking** (clients book a specific stylist and time slot with no double-booking), **client cards**, and **SMS reminders** via Twilio.

## Tech Stack

- **Framework:** Next.js 14 (App Router)
- **Language:** TypeScript (strict mode)
- **Database:** Supabase (Postgres) + Prisma ORM
- **Auth:** NextAuth
- **Messaging:** Twilio (SMS)
- **Styling:** Tailwind CSS + shadcn/ui
- **Package manager:** pnpm

## Prerequisites

- **Node.js** `>=20.19.0` (see `engines` in `package.json`)
- **pnpm**
- A **Postgres database** (Supabase or any Postgres instance)
- A **Twilio account** (Account SID, Auth Token, and a sending phone number) for SMS reminders

## Getting Started

### 1. Install dependencies

```bash
pnpm install
```

### 2. Configure environment variables

Copy the example file and fill in the values:

```bash
cp .env.example .env.local
```

The variables defined in `.env.example` are:

| Variable              | Description                                               |
| --------------------- | --------------------------------------------------------- |
| `DATABASE_URL`        | Postgres connection string                                |
| `NEXTAUTH_SECRET`     | Secret used to sign NextAuth sessions                     |
| `NEXTAUTH_URL`        | Base URL of the app (e.g. `http://localhost:3000`)        |
| `TWILIO_ACCOUNT_SID`  | Twilio Account SID                                        |
| `TWILIO_AUTH_TOKEN`   | Twilio Auth Token                                         |
| `TWILIO_PHONE_NUMBER` | Twilio sending phone number                               |
| `CRON_SECRET`         | Secret used to authorize scheduled (cron) endpoints       |
| `NEXT_PUBLIC_APP_URL` | Public app URL exposed to the browser                     |
| `SKIP_ENV_VALIDATION` | Set to skip startup env validation (leave empty normally) |

See [`CONFIG_REFERENCE.md`](./CONFIG_REFERENCE.md) for the full configuration reference.

### 3. Set up the database

Generate the Prisma Client and apply migrations:

```bash
npx prisma generate
npx prisma migrate dev
```

> **Note:** This project uses Prisma 7. `prisma migrate dev` no longer runs `prisma generate` automatically, so run `prisma generate` explicitly (as shown above). The database URL and schema location are read from `prisma.config.ts`.

### 4. Run the dev server

```bash
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Quality Gates

```bash
pnpm lint          # ESLint (next lint)
pnpm typecheck     # tsc --noEmit
pnpm format:check  # Prettier check
pnpm test          # Vitest
```

## Build & Deploy

The `build` and `start` scripts wire in Prisma:

```bash
pnpm build   # prisma generate && next build
pnpm start   # prisma migrate deploy && next start
```

## Further Reading

- [`CONFIG_REFERENCE.md`](./CONFIG_REFERENCE.md) — detailed configuration reference for the stack.
- [`FRAMEWORK_DECISION.md`](./FRAMEWORK_DECISION.md) — the architecture and framework decision record.

## License

Open source. See the repository for license details.
