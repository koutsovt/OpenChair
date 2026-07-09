import twilio from 'twilio';
import { env } from '@/lib/env';
import { prisma } from '@/lib/prisma';
import { loadTwilioCredentials } from '@/lib/credentials';
import { log } from '@/lib/logger';
import { toE164 } from '@/lib/utils';

/**
 * Dev-only escape hatch for Twilio signature validation and real SMS sends.
 *
 * SECURITY (BP-002): this MUST NOT key off credential VALUES. A bypass derived
 * from a placeholder credential meant the public SMS webhook became fully
 * unauthenticated the moment an operator staged a 'placeholder' Twilio var.
 * The bypass now requires an explicit, non-production opt-in and can never be
 * enabled in production.
 */
function isDevMode(): boolean {
  return process.env.NODE_ENV !== 'production' && process.env.TWILIO_SKIP_SIGNATURE === 'true';
}

/**
 * Returns a fully-validated Twilio credentials object. Throws with a clear
 * message if any field is blank — no silent undefined fields.
 */
function getTwilioCredentials() {
  return loadTwilioCredentials(
    env.TWILIO_ACCOUNT_SID,
    env.TWILIO_AUTH_TOKEN,
    env.TWILIO_PHONE_NUMBER
  );
}

const getTwilioClient = () => {
  const creds = getTwilioCredentials();
  return twilio(creds.accountSid, creds.authToken);
};

export async function sendSMS(
  to: string,
  body: string
): Promise<{ success: boolean; sid?: string; error?: string }> {
  // Normalise to E.164 before anything else. Twilio rejects local/spaced
  // formats (error 21211), so numbers stored as "0498 111 006" must become
  // "+61498111006" here. Fail closed on numbers we can't normalise.
  const normalized = toE164(to);
  if (!normalized) {
    log.error({ to }, 'Twilio SMS send skipped: could not normalise to E.164');
    return { success: false, error: `Invalid phone number: ${to}` };
  }

  if (isDevMode()) {
    log.info(
      { to: normalized, body },
      '[SMS-DEV] skipping real send (TWILIO_SKIP_SIGNATURE dev mode)'
    );
    return { success: true, sid: `dev_${Date.now()}` };
  }

  try {
    const creds = getTwilioCredentials();
    const message = await getTwilioClient().messages.create({
      body,
      from: creds.fromNumber,
      to: normalized,
    });
    return { success: true, sid: message.sid };
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Failed to send SMS';
    log.error({ err: error, to }, 'Twilio SMS send failed');
    return { success: false, error: msg };
  }
}

export function validateTwilioSignature(
  url: string,
  params: Record<string, string>,
  signature: string
): boolean {
  if (isDevMode()) return true;

  // Fail closed: if credentials are missing/invalid (e.g. mid-setup in
  // production) we must NOT treat the request as authentic. Return false so the
  // route responds 403 rather than throwing a 500 or silently allowing it.
  let authToken: string;
  try {
    authToken = getTwilioCredentials().authToken;
  } catch (error) {
    log.error({ err: error }, 'Twilio signature validation failed: credentials unavailable');
    return false;
  }

  return twilio.validateRequest(authToken, signature, url, params);
}

export async function logSms(data: {
  direction: 'INBOUND' | 'OUTBOUND';
  phone: string;
  body: string;
  status: string;
  twilioSid?: string;
  bookingId?: string;
  clientId?: string;
  salonId: string;
}) {
  return prisma.smsLog.create({
    data: {
      direction: data.direction,
      phone: data.phone,
      body: data.body,
      status: data.status,
      twilioSid: data.twilioSid ?? null,
      bookingId: data.bookingId ?? null,
      clientId: data.clientId ?? null,
      salonId: data.salonId,
    },
  });
}
