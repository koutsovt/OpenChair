# Client Profile Enhancement + Missing Features Plan

## Overview

Enhance the client profile with salon-essential fields, then add the 5 missing features that matter for daily operations: no-show tracking, stylist booking notes view, email confirmations, calendar sync (iCal), and revenue dashboard.

## Analysis

### Current Client Model

The `Client` model captures: name, phone, email, notes (free text), birthDate, source, smsOptOut, isActive. The detail page shows contact info + flat booking history list. No structured hair data, no allergy visibility, no computed stats.

### Current Booking Flow

- Booking detail page (`/bookings/[id]`) shows appointment info + action buttons (Complete, In Progress, Reschedule, No Show, Cancel)
- `updateBookingStatus` in `src/server/actions/bookings.ts` handles status changes — NO_SHOW is already a status but has no downstream tracking
- SMS templates in `src/lib/sms-templates.ts` cover confirmation, reminder, cancellation, reschedule, recurring, waitlist — no email equivalents exist
- Dashboard page (`/dashboard`) is a stub — just shows "Welcome to OpenChair"

### Key Files

- `prisma/schema.prisma` — Client model (line 232), Booking model (line 262)
- `src/app/(dashboard)/clients/[id]/page.tsx` — Client detail page
- `src/app/(dashboard)/clients/_components/client-form.tsx` — Client create/edit form
- `src/server/actions/clients.ts` — createClient, updateClient actions
- `src/server/actions/bookings.ts` — createBooking, updateBookingStatus, rescheduleBooking
- `src/app/(dashboard)/bookings/[id]/page.tsx` — Booking detail page
- `src/app/(dashboard)/dashboard/page.tsx` — Dashboard (stub)
- `src/lib/sms-templates.ts` — SMS message templates
- `src/lib/env.ts` — Environment variable validation

### Dependency Order

1. Schema changes (client profile fields) — foundation for everything
2. Client profile UI — uses new fields
3. No-show tracking — computed from existing booking data, shown on client profile
4. Stylist booking notes — reads client allergies/notes on booking detail
5. Calendar sync — iCal feed endpoint, reads bookings
6. Revenue dashboard — reads bookings, computes aggregates

---

## Steps

1. Add structured fields to Client model in `prisma/schema.prisma`: `allergies String?`, `hairType String?` (enum-like: straight/wavy/curly/coily), `hairTexture String?` (fine/medium/thick), `naturalColour String?`, `preferredStylistId String?` with optional relation to Stylist, `productPreferences String?`. Run `prisma migrate dev --name client_profile_fields` and `prisma generate`.

2. Update `src/app/(dashboard)/clients/_components/client-form.tsx` to add form fields for allergies (Textarea, red-highlighted label "⚠ Allergies / Sensitivities"), hairType (Select: Straight/Wavy/Curly/Coily), hairTexture (Select: Fine/Medium/Thick), naturalColour (Input), preferredStylistId (Select populated from stylists prop), productPreferences (Textarea). Update the `clientFormSchema` zod schema accordingly. Pass these new fields through FormData in `handleSubmit`.

3. Update `src/server/actions/clients.ts` — both `createClient` and `updateClient` to read the new fields from FormData and persist them to the database.

4. Redesign `src/app/(dashboard)/clients/[id]/page.tsx` client detail page: add a prominent red "Allergies" alert card at top when allergies exist (using a red-bordered Card with AlertTriangle icon), add a "Hair Profile" card showing hairType, hairTexture, naturalColour, preferredStylist (query stylist name), productPreferences. Add computed stats card: total visits (count of COMPLETED bookings), no-shows (count of NO_SHOW bookings), total spend (sum of price from COMPLETED bookings), last visit date, all computed via a single Prisma aggregation query. Show smsOptOut status in the contact card.

5. Add no-show tracking: in the client detail stats card (step 4), display no-show count with a warning badge if >= 3 ("Frequent no-show"). In `src/server/actions/bookings.ts` `updateBookingStatus`, when marking NO_SHOW, increment logic is not needed — it's computed from booking count. No schema change needed since NO_SHOW status already exists in the BookingStatus enum.

6. Add stylist-facing booking notes to `src/app/(dashboard)/bookings/[id]/page.tsx`: when the booking has a linked client, query the client's `allergies`, `hairType`, `hairTexture`, `naturalColour`, `notes`, and `productPreferences`. Display a "Client Notes for Stylist" card between the Appointment card and Actions card. Show allergies prominently with a red alert banner if present. Show hair profile and preferences below. This gives stylists the "what do I need to know" view before the appointment.

7. Create iCal feed endpoint at `src/app/api/v1/calendar/[stylistId]/route.ts`: generate an iCalendar (.ics) feed for a specific stylist's bookings. Query confirmed/pending bookings for the stylist within a reasonable window (past 30 days to future 90 days). Use manual iCal string generation (no extra package needed — it's a simple text format). Each VEVENT includes: UID (booking ID), DTSTART/DTEND, SUMMARY (service name + client name), DESCRIPTION (client phone, notes). Set response headers: `Content-Type: text/calendar; charset=utf-8`, `Content-Disposition: inline; filename="calendar.ics"`. Authenticate with a per-stylist calendar token stored on the Stylist model — add `calendarToken String? @unique` to Stylist in schema, generate a random token on first access. The URL format: `/api/v1/calendar/[stylistId]?token=xxx` — no Bearer auth so it works with Google Calendar / Apple Calendar subscription.

8. Add calendar token generation: create a server action `generateCalendarLink` in `src/server/actions/team.ts` that generates a random token (crypto.randomUUID), saves it to the stylist's `calendarToken` field, and returns the full subscription URL. Add a "Calendar Sync" button to the team member detail page `src/app/(dashboard)/team/[id]/page.tsx` that calls this action and displays the URL for the stylist to copy into Google Calendar / Apple Calendar.

9. Build the revenue dashboard at `src/app/(dashboard)/dashboard/page.tsx` replacing the current stub. Query data server-side with Prisma: today's bookings (count + list), this week's revenue (sum of price where status=COMPLETED, startTime within current week), this month's revenue, bookings by status breakdown, bookings per stylist this week. Display using existing Card components: 4 stat cards at top (Today's Bookings, This Week Revenue, This Month Revenue, Completion Rate), a "Today's Schedule" list showing upcoming bookings with client name/service/stylist/time, and a "Bookings by Stylist" breakdown card. Format revenue with `formatPrice` from `src/lib/utils.ts`. Use `startOfWeek`, `endOfWeek`, `startOfMonth`, `endOfMonth` from date-fns for date ranges.

10. Run all quality gates: `npx prisma validate`, `npx tsc --noEmit`, `npx next lint`, `npx vitest run`. Fix any issues. Commit and push to trigger Railway deploy.
