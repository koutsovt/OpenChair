# OpenChair — Comprehensive Testing Setup

## Analysis

### Existing Tests (11 test files, ~112 tests)

All under `src/lib/__tests__/`:

- `auth.test.ts` (5) — getAuthenticatedSalon
- `middleware.test.ts` (6) — NextAuth JWT guard
- `slots.test.ts` — slot generation
- `booking-validation.test.ts` — conflict detection
- `sms-commands.test.ts` — SMS command parsing
- `sms-templates.test.ts` — SMS templates
- `utils.test.ts` — formatPrice, formatDuration, etc.
- `theme.test.ts` — theme utilities
- `rate-limit.test.ts` — rate limiter
- `constants.test.ts` — constants
- `booking-service.test.ts` — createBookingCore

### Missing Test Coverage

- **Server actions** (0 tests): bookings, clients, services, team — all CRUD operations
- **API routes** (0 tests): bookings, slots, SMS webhook, cron jobs, salon/services/stylists public APIs
- **Auto-assign algorithm** (0 tests): `src/lib/scheduling/auto-assign.ts`
- **Auth actions** (0 tests): signUp server action
- **E2E** (0 tests): No Playwright tests exist

### Strategy

- **Framework**: Vitest (already configured) + Playwright for E2E
- **Mocking**: vi.mock for Prisma, NextAuth, Twilio, next/cache
- **Pattern**: Mock at module boundary, test business logic exhaustively

## Steps

1. Install Playwright and update vitest.config.ts to exclude e2e directory, add coverage config
2. Create unit tests for auto-assign algorithm at `src/lib/__tests__/auto-assign.test.ts` covering scoring logic, no-stylist-available, client history, gap minimization, and workload balance
3. Create integration tests for client server actions at `src/server/__tests__/clients.test.ts` covering createClient validation, duplicate phone detection, updateClient, deleteClient soft-delete, and searchClients
4. Create integration tests for service server actions at `src/server/__tests__/services.test.ts` covering createService, updateService, deleteService, createCategory, deleteCategory, assignStylistToService, and removeStylistFromService
5. Create integration tests for team server actions at `src/server/__tests__/team.test.ts` covering createStylist, updateStylist, deleteStylist, and updateAvailability with transaction
6. Create integration tests for booking server actions at `src/server/__tests__/bookings.test.ts` covering createBooking with all validations, cancelBooking, and updateBookingStatus
7. Create integration tests for auth server action at `src/server/__tests__/auth.test.ts` covering signUp with password hashing, duplicate email prevention, and salon auto-creation
8. Create API route tests for public booking API at `src/app/api/v1/__tests__/bookings-api.test.ts` covering POST validation, salon/service/stylist lookups, conflict handling, rate limiting, and GET booking lookup
9. Create API route tests for slots API at `src/app/api/v1/__tests__/slots-api.test.ts` covering parameter validation, salon/stylist/service lookups, and slot generation
10. Create API route tests for SMS webhook at `src/app/api/v1/__tests__/sms-webhook.test.ts` covering Twilio signature validation, command parsing, and TwiML response format
11. Create API route tests for cron endpoints at `src/app/api/__tests__/cron.test.ts` covering auth, reminder sending, and recurring booking generation
12. Create Playwright E2E config at `e2e/playwright.config.ts` and auth setup
13. Create Playwright E2E tests for sign-up and sign-in flows at `e2e/auth.spec.ts`
14. Create Playwright E2E tests for client management at `e2e/clients.spec.ts`
15. Create Playwright E2E tests for booking flow at `e2e/bookings.spec.ts`
16. Run all unit and integration tests with `npx vitest run`, fix any failures
17. Create the `/test` command file at `.gg/commands/test.md`
