/**
 * Typed credential codec — ported from King (github.com/KenKaiii/king)
 * `credentialStore.ts#jsonCodec`.
 *
 * Provides a `encode`/`decode` pair around any validated credential shape.
 * `decode` is intentionally tolerant — callers get `null` for malformed input
 * rather than a thrown exception, so they can surface a clear error message.
 */

export interface CredentialCodec<T> {
  /** Decode raw JSON string → typed object, or `null` on failure. */
  decode(raw: string): T | null;
  /** Encode typed object → JSON string. */
  encode(value: T): string;
}

/**
 * Build a codec around a per-type validator.
 *
 * @param validate - receives the parsed JSON value (unknown) and must return
 *   the typed object T, or throw / return null if validation fails.
 */
export function jsonCodec<T extends object>(
  validate: (parsed: unknown) => T | null
): CredentialCodec<T> {
  return {
    decode(raw: string): T | null {
      try {
        return validate(JSON.parse(raw));
      } catch {
        return null;
      }
    },
    encode(value: T): string {
      return JSON.stringify(value);
    },
  };
}

// ── Twilio credential shape & codec ─────────────────────────────────────────

export interface TwilioCredentials {
  accountSid: string;
  authToken: string;
  fromNumber: string;
}

function validateTwilioCredentials(parsed: unknown): TwilioCredentials | null {
  if (parsed === null || typeof parsed !== 'object') return null;
  const p = parsed as Record<string, unknown>;
  if (typeof p.accountSid !== 'string' || p.accountSid.length === 0) return null;
  if (typeof p.authToken !== 'string' || p.authToken.length === 0) return null;
  if (typeof p.fromNumber !== 'string' || p.fromNumber.length === 0) return null;
  return {
    accountSid: p.accountSid,
    authToken: p.authToken,
    fromNumber: p.fromNumber,
  };
}

export const twilioCodec = jsonCodec<TwilioCredentials>(validateTwilioCredentials);

/**
 * Build a `TwilioCredentials` object from the three env vars already
 * validated by `env.ts`. Returns the typed object or throws with a clear
 * message if any field is blank (e.g. in tests that skip env validation).
 */
export function loadTwilioCredentials(
  accountSid: string,
  authToken: string,
  fromNumber: string
): TwilioCredentials {
  const raw = twilioCodec.encode({ accountSid, authToken, fromNumber });
  const creds = twilioCodec.decode(raw);
  if (!creds) {
    throw new Error(
      'Twilio credentials are invalid — accountSid, authToken, and fromNumber must all be non-empty strings.'
    );
  }
  return creds;
}
