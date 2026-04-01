# Client Onboarding Fixes

## Changes

- **`src/server/actions/clients.ts`**: Make `phone` required in `clientSchema`. Add `normalisePhone` helper (strip non-digits). In `createClient`, after validation, query for any active client in the same salon with a matching normalised phone — return a named duplicate error if found.
- **`src/app/(dashboard)/clients/_components/client-form.tsx`**: Make `phone` required in the local Zod schema (`z.string().min(1, ...)`). Mark the Phone field label with `*`.

## Steps

1. Make phone required and add duplicate detection in `src/server/actions/clients.ts`
2. Make phone required in the client form schema in `src/app/(dashboard)/clients/_components/client-form.tsx`
3. Run type-check and lint to verify
