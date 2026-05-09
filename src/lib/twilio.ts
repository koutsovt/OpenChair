import twilio from 'twilio';
import { env } from '@/lib/env';
import { prisma } from '@/lib/prisma';
import { loadTwilioCredentials } from '@/lib/credentials';
import { log } from '@/lib/logger';

function isDevMode(): boolean {
  return (
    process.env.NODE_ENV === 'development' ||
    env.TWILIO_ACCOUNT_SID === 'placeholder' ||
    env.TWILIO_AUTH_TOKEN === 'placeholder'
  );
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
  if (isDevMode()) {
    log.info({ to, body }, '[SMS-DEV] skipping real send in dev/placeholder mode');
    return { success: true, sid: `dev_${Date.now()}` };
  }

  try {
    const creds = getTwilioCredentials();
    const message = await getTwilioClient().messages.create({
      body,
      from: creds.fromNumber,
      to,
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
  const creds = getTwilioCredentials();
  return twilio.validateRequest(creds.authToken, signature, url, params);
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
