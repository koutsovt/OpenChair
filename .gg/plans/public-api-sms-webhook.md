# Public REST API + SMS Webhook Interface

## Context

The Terence Portal site (`Documents/Portal/Terence`) currently links out to `https://www.kitomba.com/bookings/terencelondon` for all booking CTAs. Kitomba has no public API — it's just a hosted booking page. OpenChair already has all the booking logic implemented as Server Actions (`src/server/actions/public-booking.ts`) but no REST API for external sites to call.

Additionally, SMS templates already include "Reply CANCEL to cancel" and "Reply BOOK to claim it" — but there's no inbound SMS webhook to receive and process those replies.

## What We're Building

1. **Public REST API** — JSON endpoints that external sites (like the Terence Portal) can call to replace Kitomba
2. **Inbound SMS Webhook** — Twilio webhook endpoint to handle client SMS replies (CANCEL, BOOK)
3. **SMS Log Model** — Track all outbound/inbound SMS for audit and debugging
4. **API Key Auth** — Simple bearer token auth for external API consumers (not Supabase sessions)

## Architecture

```
src/app/api/
  v1/
    salon/[slug]/
      route.ts              → GET salon info (public)
    stylists/
      route.ts              → GET stylists by salon (public)
    services/
      route.ts              → GET services by salon (public)
    slots/
      route.ts              → GET available slots (public)
    bookings/
      route.ts              → POST create booking, GET lookup booking
      [id]/
        route.ts            → GET booking status, PATCH cancel
    sms/
      webhook/
        route.ts            → POST inbound SMS from Twilio
      send/
        route.ts            → POST send ad-hoc SMS (authenticated)
      log/
        route.ts            → GET SMS log (authenticated)
```

## Schema Changes

Add `SmsLog` model to `prisma/schema.prisma` for audit trail:

```prisma
model SmsLog {
  id          String      @id @default(cuid())
  direction   SmsDirection
  phone       String
  body        String
  status      String        // "sent", "delivered", "failed", "received"
  twilioSid   String?       // Twilio message SID
  bookingId   String?
  booking     Booking?      @relation(fields: [bookingId], references: [id])
  clientId    String?
  client      Client?       @relation(fields: [clientId], references: [id])
  salonId     String
  salon       Salon         @relation(fields: [salonId], references: [id], onDelete: Cascade)
  createdAt   DateTime      @default(now())

  @@index([salonId, createdAt])
  @@index([phone])
  @@index([bookingId])
  @@map("sms_logs")
}

enum SmsDirection {
  INBOUND
  OUTBOUND
}
```

Add `apiKey` to `Salon` model for external API auth:

```prisma
// In Salon model:
apiKey    String?   @unique
```

Add relations to existing models:

- `Salon` → `smsLogs SmsLog[]`
- `Client` → `smsLogs SmsLog[]`
- `Booking` → `smsLogs SmsLog[]`

## Key Design Decisions

### Auth Strategy

- **Public endpoints** (salon info, stylists, services, slots): No auth needed — same as Kitomba's public booking page
- **Booking creation**: No auth (public booking) but rate-limited
- **SMS send + log**: Bearer token auth using `salon.apiKey`
- **SMS webhook**: Twilio signature validation (not bearer token)

### Rate Limiting

Simple in-memory rate limiter for public booking endpoint (e.g. 10 bookings per phone per hour). No new dependency needed — just a Map with TTL cleanup.

### SMS Webhook Flow

1. Twilio POSTs to `/api/v1/sms/webhook`
2. Validate Twilio signature using `twilio.validateRequest()`
3. Parse body text for commands: CANCEL, BOOK, STOP
4. Look up client by phone number
5. Execute action (cancel next upcoming booking, claim waitlist slot, opt-out)
6. Reply via TwiML or REST

### Env Changes

Add to `src/lib/env.ts`:

- `API_RATE_LIMIT_WINDOW_MS` (optional, default 3600000)
- `API_RATE_LIMIT_MAX` (optional, default 10)

## File Impact

| File                                    | Action | Description                                                                    |
| --------------------------------------- | ------ | ------------------------------------------------------------------------------ |
| `prisma/schema.prisma`                  | Edit   | Add SmsLog model, SmsDirection enum, apiKey to Salon, relations                |
| `src/types/index.ts`                    | Edit   | Add SmsLog, SmsDirection exports                                               |
| `src/lib/env.ts`                        | Edit   | No new required vars (Twilio already there)                                    |
| `src/lib/twilio.ts`                     | Edit   | Add `validateTwilioSignature()`, update `sendSMS()` to return SID, add logging |
| `src/lib/sms-commands.ts`               | Create | Parse + execute inbound SMS commands (CANCEL, BOOK, STOP)                      |
| `src/lib/rate-limit.ts`                 | Create | Simple in-memory rate limiter                                                  |
| `src/lib/api-auth.ts`                   | Create | `authenticateSalonByApiKey()` helper                                           |
| `src/app/api/v1/salon/[slug]/route.ts`  | Create | GET salon public info                                                          |
| `src/app/api/v1/stylists/route.ts`      | Create | GET stylists (query: salonSlug)                                                |
| `src/app/api/v1/services/route.ts`      | Create | GET services (query: salonSlug)                                                |
| `src/app/api/v1/slots/route.ts`         | Create | GET available slots (query: salonSlug, stylistId, serviceId, date)             |
| `src/app/api/v1/bookings/route.ts`      | Create | POST create booking, GET lookup by id                                          |
| `src/app/api/v1/bookings/[id]/route.ts` | Create | GET status, PATCH cancel                                                       |
| `src/app/api/v1/sms/webhook/route.ts`   | Create | POST Twilio inbound webhook                                                    |
| `src/app/api/v1/sms/send/route.ts`      | Create | POST send ad-hoc SMS (authenticated)                                           |
| `src/app/api/v1/sms/log/route.ts`       | Create | GET SMS history (authenticated)                                                |
| `src/middleware.ts`                     | Edit   | Exclude `/api/v1/*` from Supabase session middleware                           |

## Risks

- **Twilio signature validation** requires the full request URL including protocol — need to ensure `NEXT_PUBLIC_APP_URL` is correct in production
- **Rate limiter** is in-memory — resets on deploy/restart. Acceptable for MVP; upgrade to Redis later if needed
- **API key rotation** not included in this plan — add later with a dashboard UI

## Steps

1. Add `SmsLog` model, `SmsDirection` enum, `apiKey` field on Salon, and new relations (`smsLogs`) on Salon/Client/Booking to `prisma/schema.prisma`, then run `npx prisma migrate dev --name add-sms-log-and-api-key`
2. Update `src/types/index.ts` to export `SmsLog` and `SmsDirection` types from generated Prisma models
3. Update `src/middleware.ts` to exclude `/api/v1/` routes from Supabase session middleware by adding the pattern to the matcher config
4. Create `src/lib/rate-limit.ts` with an in-memory sliding-window rate limiter (Map-based, configurable window + max, auto-cleanup)
5. Create `src/lib/api-auth.ts` with `authenticateSalonByApiKey(request: Request)` that reads Bearer token from Authorization header, looks up Salon by apiKey, returns salon or null
6. Update `src/lib/twilio.ts` to: (a) return Twilio message SID from `sendSMS()`, (b) add `validateTwilioSignature(url, params, signature)` function, (c) add `logSms()` helper that writes to the SmsLog table
7. Create `src/lib/sms-commands.ts` with `parseCommand(body: string)` to extract CANCEL/BOOK/STOP commands, and `executeCommand(phone, command, salonId)` to process them (cancel next booking, claim waitlist slot, opt-out)
8. Create `src/app/api/v1/salon/[slug]/route.ts` — GET handler returning public salon info (name, slug, phone, address, city, timezone, imageUrl)
9. Create `src/app/api/v1/stylists/route.ts` — GET handler returning active stylists for a salon (query param: `salonSlug`), including availability and services
10. Create `src/app/api/v1/services/route.ts` — GET handler returning active services for a salon (query param: `salonSlug`), grouped by category
11. Create `src/app/api/v1/slots/route.ts` — GET handler returning available time slots (query params: `salonSlug`, `stylistId`, `serviceId`, `date`), reusing existing `getAvailableSlots` logic from `src/lib/slots.ts`
12. Create `src/app/api/v1/bookings/route.ts` — POST handler to create a public booking (reusing logic from `src/server/actions/public-booking.ts`), with rate limiting by phone number; GET handler to look up a booking by id query param
13. Create `src/app/api/v1/bookings/[id]/route.ts` — GET handler for booking status, PATCH handler for client-initiated cancellation (validates booking belongs to phone number)
14. Create `src/app/api/v1/sms/webhook/route.ts` — POST handler for Twilio inbound SMS webhook with signature validation, command parsing, auto-reply via TwiML XML response
15. Create `src/app/api/v1/sms/send/route.ts` — POST handler (API key auth) to send ad-hoc SMS to a phone number, with SMS logging
16. Create `src/app/api/v1/sms/log/route.ts` — GET handler (API key auth) to query SMS history by salonId with pagination, optional filters by phone/direction/bookingId
17. Run `npx tsc --noEmit` and `npx next lint` to verify all new code compiles and passes linting with zero errors
