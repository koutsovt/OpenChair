import twilio from 'twilio';
import { env } from '@/lib/env';

function isDevMode(): boolean {
  return (
    process.env.NODE_ENV === 'development' ||
    env.TWILIO_ACCOUNT_SID === 'placeholder' ||
    env.TWILIO_AUTH_TOKEN === 'placeholder'
  );
}

const getTwilioClient = () => twilio(env.TWILIO_ACCOUNT_SID, env.TWILIO_AUTH_TOKEN);

export async function sendSMS(
  to: string,
  body: string
): Promise<{ success: boolean; error?: string }> {
  if (isDevMode()) {
    // eslint-disable-next-line no-console
    console.info(`[SMS-DEV] To: ${to}\n${body}`);
    return { success: true };
  }

  try {
    await getTwilioClient().messages.create({
      body,
      from: env.TWILIO_PHONE_NUMBER,
      to,
    });
    return { success: true };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to send SMS';
    // eslint-disable-next-line no-console
    console.error('Twilio SMS error:', message);
    return { success: false, error: message };
  }
}
