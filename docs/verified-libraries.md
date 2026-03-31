# Verified Library Stack — Salon Operating System

> All versions verified against npm registry on March 31, 2026

---

## MVP (Phase 1)

### 1. Authentication — `@supabase/ssr` + `@supabase/supabase-js`

| Package                 | Version   | Purpose               |
| ----------------------- | --------- | --------------------- |
| `@supabase/ssr`         | `0.10.0`  | SSR cookie-based auth |
| `@supabase/supabase-js` | `2.101.0` | Supabase JS client    |

> **Decision: Supabase Auth (NOT next-auth)**
>
> - `@supabase/auth-helpers-nextjs` is **deprecated** (final version 0.15.0, no further updates).
> - Use `@supabase/ssr` — the official replacement that consolidates all framework helpers.
> - Since we already use Supabase for DB, using Supabase Auth gives us: unified RLS policies, built-in user management, no adapter layer needed.
> - next-auth (Auth.js) _can_ work with Supabase via `@auth/supabase-adapter`, but adds unnecessary indirection when Supabase Auth is native.

---

### 2. Database ORM — `prisma` + `@prisma/client`

| Package           | Version | Purpose                 |
| ----------------- | ------- | ----------------------- |
| `prisma` (devDep) | `7.6.0` | CLI, migrations, studio |
| `@prisma/client`  | `7.6.0` | Type-safe query builder |

> **Note:** Prisma 7 is the current major. Ships Rust-free client by default, ESM-first, requires `output` in generator block. New `prisma-client` provider replaces `prisma-client-js`.

---

### 3. SMS Sending — `twilio`

| Package  | Version  | Purpose                |
| -------- | -------- | ---------------------- |
| `twilio` | `5.13.1` | Send SMS notifications |

---

### 4. Date/Time Handling — `date-fns` + `@date-fns/tz`

| Package        | Version | Purpose                   |
| -------------- | ------- | ------------------------- |
| `date-fns`     | `4.1.0` | Date manipulation library |
| `@date-fns/tz` | `1.4.1` | IANA timezone support     |

> **Note:** date-fns v4 has first-class timezone support via `@date-fns/tz` (761B). Use `TZDate` class for timezone-aware booking slots. Do NOT use the older `date-fns-tz` package (v3 era, superseded).

---

### 5. Form Validation — `zod`

| Package | Version | Purpose                      |
| ------- | ------- | ---------------------------- |
| `zod`   | `4.3.6` | TypeScript schema validation |

> **Note:** Zod 4 is stable. 14x faster parsing vs v3, 57% smaller core. The package root now exports Zod 4. Use `import * as z from "zod"` directly.

---

### 6. Email Sending — `resend` + `@react-email/components`

| Package                   | Version  | Purpose                 |
| ------------------------- | -------- | ----------------------- |
| `resend`                  | `6.10.0` | Transactional email API |
| `@react-email/components` | `1.0.10` | React email templates   |

> **Why Resend over alternatives:** Built for developers, React Email integration for type-safe templates, generous free tier (100 emails/day), Next.js-native. Better DX than SendGrid/Mailgun/AWS SES for this use case.

---

### 7. Calendar/Scheduling Logic — No external library needed

| Approach     | Details                         |
| ------------ | ------------------------------- |
| Custom logic | Use `date-fns` + `@date-fns/tz` |

> **Recommendation:** Don't install a scheduling library. Booking availability, recurring appointments, and slot generation are domain-specific logic best built with `date-fns` utilities (`eachMinuteOfInterval`, `isWithinInterval`, `addWeeks`, `set`, etc.) combined with Prisma queries. Calendar _UI_ is handled by shadcn's Calendar component (built on `react-day-picker`).

---

## Phase 2 (Schema Only — Libraries Confirmed)

### 8. Stripe Payments — `stripe`

| Package  | Version  | Purpose                |
| -------- | -------- | ---------------------- |
| `stripe` | `21.0.1` | Payment processing SDK |

---

### 9. WhatsApp Business API — `@great-detail/whatsapp`

| Package                  | Version | Purpose                   |
| ------------------------ | ------- | ------------------------- |
| `@great-detail/whatsapp` | `8.4.0` | WhatsApp Cloud API client |

> **Why this one:** Actively maintained fork of the original official Meta SDK (now deprecated). TypeScript-first, ESM-only, supports Graph API v23.0. Alternatives considered:
>
> - `whatsapp` (Meta official) — deprecated, last published 3 years ago at v0.0.5-Alpha
> - `@whatsapp-cloudapi/client` — newer but zero dependents, less battle-tested
> - For MVP, Twilio also supports WhatsApp messaging via the same `twilio` SDK

---

### 10. Image Processing/Upload — `sharp` + `uploadthing`

| Package              | Version  | Purpose                      |
| -------------------- | -------- | ---------------------------- |
| `sharp`              | `0.34.5` | Server-side image processing |
| `uploadthing`        | `7.7.4`  | File upload infrastructure   |
| `@uploadthing/react` | `7.3.3`  | React upload components      |

---

### 11. Replicate AI SDK — `replicate`

| Package     | Version | Purpose                |
| ----------- | ------- | ---------------------- |
| `replicate` | `1.4.0` | AI model inference API |

---

### 12. PDF Generation — `@react-pdf/renderer`

| Package               | Version | Purpose                  |
| --------------------- | ------- | ------------------------ |
| `@react-pdf/renderer` | `4.3.2` | React-based PDF creation |

---

## UI

### 13. UI Components — `shadcn` (CLI)

| Package        | Version | Purpose                  |
| -------------- | ------- | ------------------------ |
| `shadcn` (CLI) | `4.1.1` | UI component scaffolding |

> **Note:** shadcn/ui is NOT an npm dependency — it's a CLI that copies component source code into your project. Run `npx shadcn@latest init` to scaffold, then `npx shadcn@latest add button` to add components. Components use Radix UI primitives + Tailwind CSS. CLI v4 (March 2026) adds `--dry-run`, `--diff`, presets, and AI agent skills.

---

### 14. Icons — `lucide-react`

| Package        | Version | Purpose             |
| -------------- | ------- | ------------------- |
| `lucide-react` | `1.7.0` | SVG icon components |

---

### 15. Toast/Notifications — `sonner`

| Package  | Version | Purpose                   |
| -------- | ------- | ------------------------- |
| `sonner` | `2.0.7` | Toast notification system |

> **Note:** shadcn/ui's Toast component wraps Sonner. Install via `npx shadcn@latest add sonner`.

---

### 16. Data Tables — `@tanstack/react-table`

| Package                 | Version  | Purpose                       |
| ----------------------- | -------- | ----------------------------- |
| `@tanstack/react-table` | `8.21.3` | Headless table/datagrid logic |

> **Note:** shadcn/ui provides a DataTable component built on TanStack Table. Install via `npx shadcn@latest add table` then compose with TanStack for sorting, filtering, pagination.

---

## Quick Install Reference

```bash
# Core dependencies
npm install @supabase/supabase-js@2.101.0 @supabase/ssr@0.10.0
npm install @prisma/client@7.6.0
npm install -D prisma@7.6.0

# MVP features
npm install zod@4.3.6
npm install date-fns@4.1.0 @date-fns/tz@1.4.1
npm install twilio@5.13.1
npm install resend@6.10.0 @react-email/components@1.0.10

# UI
npm install lucide-react@1.7.0 sonner@2.0.7
npm install @tanstack/react-table@8.21.3
npx shadcn@latest init

# Phase 2 (install when needed)
npm install stripe@21.0.1
npm install replicate@1.4.0
npm install sharp@0.34.5 uploadthing@7.7.4 @uploadthing/react@7.3.3
npm install @react-pdf/renderer@4.3.2
npm install @great-detail/whatsapp@8.4.0
```

---

## Version Verification Sources

All versions pulled from `https://registry.npmjs.org/{package}/latest` on 2026-03-31.
