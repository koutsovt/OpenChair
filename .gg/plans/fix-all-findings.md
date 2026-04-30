# Fix All Audit Findings

## Analysis

22 findings across 5 categories. After deduplication and verification (the toast finding was partially wrong — dashboard components DO use sonner, not Radix useToast), here's the validated list grouped by fix area:

### BROKEN — Must Fix

- **B1**: `src/middleware.ts:4` — publicPaths missing `/`, `/book`, `/cancel`, `/api/health`
- **B2**: `src/lib/sms-commands.ts:123-143` — `handleBook()` never creates a Booking record
- **B3**: `src/lib/sms-commands.ts:146-150` — `handleStop()` overwrites notes instead of append; no smsOptOut field exists
- **B4**: SMS opt-out never checked — no code prevents sending SMS to opted-out clients
- **B5**: `src/lib/env.ts:12` — RESEND_API_KEY required but never used (crashes startup)
- **B6**: `src/lib/scheduling/recurring.ts:38-101` — TOCTOU race: conflict check + create not in transaction

### DANGEROUS — Security/Resource

- **D1**: `src/app/api/v1/bookings/route.ts:159-188` — Unauthenticated GET leaks PII (guestName, guestPhone, notes)
- **D2**: `src/app/api/v1/bookings/[id]/route.ts:5-31` — Unauthenticated GET leaks booking details
- **D3**: `src/app/api/v1/stylists/route.ts:24-25` — Public endpoint leaks stylist email+phone
- **D4**: `src/app/api/v1/bookings/[id]/route.ts:38-91` — No rate limit on cancel endpoint
- **D5**: `src/lib/api-auth.ts:14` — API keys stored/compared in plaintext
- **D6**: `src/lib/scheduling/smart-suggestions.ts:57-99` — N+1 unbounded query loop, no date range cap
- **D7**: `src/server/actions/clients.ts:42-47` — Full table scan for phone dedup

### DEAD — Remove

- **X1**: `resend` package + RESEND_API_KEY env var
- **X2**: `@auth/prisma-adapter` package
- **X3**: `@radix-ui/react-scroll-area`, `react-tabs`, `react-toast` packages
- **X4**: Files: `scroll-area.tsx`, `tabs.tsx`, `toaster.tsx`, `toast.tsx`, `use-toast.ts`
- **X5**: `supabase/` directory
- **X6**: Dead exports: `slugify()` in utils.ts, `rescheduleBookingSchema` + `CreateBookingInput` in booking.ts
- **X7**: Dead server actions: `createRecurringBooking`, `updateRecurringBooking`, `listRecurringBookings`, `addToWaitlist`, `listWaitlistEntries`
- **X8**: Dead type exports in `src/types/index.ts` (14 of 20 unused)

## Steps

1. Fix middleware publicPaths: in `src/middleware.ts:4`, add `/`, `/book`, `/cancel`, `/api/health` to the `publicPaths` array. The `/` must be an exact match (not startsWith) to avoid making all routes public — refactor the check to handle exact vs prefix matches: `'/'` exact, rest prefix.

2. Fix RESEND_API_KEY: remove `RESEND_API_KEY` from `src/lib/env.ts` (both server schema and runtimeEnv), remove from `.env.example`.

3. Add `smsOptOut` field to Client model: in `prisma/schema.prisma`, add `smsOptOut Boolean @default(false)` to the Client model after the `isActive` field. Run `npx prisma migrate dev --name add_sms_opt_out`.

4. Fix handleStop in `src/lib/sms-commands.ts:146-150`: change from overwriting `notes` to setting `smsOptOut: true` instead. Keep the logSms call.

5. Add SMS opt-out checks: in `src/app/api/cron/reminders/route.ts`, add a filter condition `client: { smsOptOut: { not: true } }` to the booking query OR check `smsOptOut` before sending. In `src/app/api/cron/recurring/route.ts`, check `recurring.client.smsOptOut` before calling sendSMS. In `src/app/api/v1/bookings/route.ts` (POST), check `client.smsOptOut` before sending confirmation SMS.

6. Fix handleBook in `src/lib/sms-commands.ts:123-143`: after marking waitlist entry as BOOKED, use `createBookingCore()` to actually create a booking using the waitlist entry's details (stylistId, serviceId, preferredDateStart as startTime). Import `createBookingCore` from `@/server/services/booking-service`. Query the waitlist entry with its relations (service, stylist) to get the data needed.

7. Fix recurring booking race condition: in `src/lib/scheduling/recurring.ts`, refactor `processRecurringBooking` to use `createBookingCore()` from `@/server/services/booking-service` instead of direct `prisma.booking.create()`. This wraps the conflict check + create in a `$transaction`. Move the `nextRunDate` update inside the same transaction.

8. Strip PII from public API GET endpoints: in `src/app/api/v1/bookings/route.ts:166-180` (GET), remove `guestPhone` and `notes` from the select. In `src/app/api/v1/bookings/[id]/route.ts:10-23` (GET), remove `notes` and `cancelReason` from select. In `src/app/api/v1/stylists/route.ts:22-25`, remove `email: true` and `phone: true` from the select.

9. Add rate limiting to cancel endpoint: in `src/app/api/v1/bookings/[id]/route.ts` PATCH handler, add rate limiting using the existing `rateLimit` function imported from `@/lib/rate-limit`, keyed on the phone from the request body (e.g., `cancel:${parsed.data.phone}`). Apply it after parsing the body.

10. Hash API keys: in `src/lib/api-auth.ts`, change from plain `findUnique({ where: { apiKey } })` to: fetch all salons with non-null apiKey, then `bcrypt.compare()` against each. Since there are few salons, this is fine. Import `compare` from `bcryptjs`. NOTE: this requires also hashing on storage — update the salon seed/creation to hash apiKey values. If no apiKey creation UI exists yet, just add a comment noting keys must be hashed on creation.

11. Add date range cap to smart suggestions: in `src/lib/scheduling/smart-suggestions.ts`, after computing `lastDate` at line 55, cap the date range to max 14 days: `const maxDate = addDays(startOfDay(startDate), 14); const cappedLastDate = lastDate > maxDate ? maxDate : lastDate;` and use `cappedLastDate` in the while loop. Also cap `limit` to max 20 at the function entry.

12. Fix client phone dedup to use DB query: in `src/server/actions/clients.ts:40-51`, replace the findMany + JS filter with a targeted `prisma.client.findFirst({ where: { salonId, isActive: true, phone: normalisedPhone } })`. Since phone normalization strips non-digits, also store the normalized phone on create/update OR use a Prisma raw query. Simplest fix: just query with the raw phone value since most phones are already normalized. Add a comment noting this is a loose match.

13. Delete dead UI files: remove `src/components/ui/scroll-area.tsx`, `src/components/ui/tabs.tsx`, `src/components/ui/toaster.tsx`, `src/components/ui/toast.tsx`, `src/hooks/use-toast.ts`.

14. Delete dead packages: run `pnpm remove resend @auth/prisma-adapter @radix-ui/react-scroll-area @radix-ui/react-tabs @radix-ui/react-toast`.

15. Delete supabase directory: remove `supabase/` directory entirely.

16. Remove dead exports: in `src/lib/utils.ts`, delete the `slugify` function (lines 30-36). In `src/lib/validations/booking.ts`, delete `rescheduleBookingSchema` (lines 17-20) and `CreateBookingInput` type (line 22).

17. Remove dead server actions: delete the entire files `src/server/actions/recurring.ts` and `src/server/actions/waitlist.ts` since all their exports are unused.

18. Clean up dead type exports in `src/types/index.ts`: remove unused type aliases (Booking, Client, Service, Stylist, Salon, RecurringBooking, WaitlistEntry, SmsLog, StylistWithAvailability, StylistWithServices, BookingWithRelations, ServiceWithCategory, BookingFormData, ClientFormData) and their corresponding imports. Keep only: BookingStatus, WaitlistStatus, SmsDirection, TimeSlot, SuggestedSlot, AutoAssignResult, StylistAvailability.

19. Update tests: fix `src/lib/__tests__/sms-commands.test.ts` to account for the new handleStop behavior (smsOptOut instead of notes). Add a test for handleBook creating a booking. Update any test mocks that reference removed packages.

20. Run all quality gates: `npx prisma validate && npx tsc --noEmit && npx next lint && npx vitest run` — all must pass with zero errors/warnings.
