import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { authenticateSalonByApiKey } from '@/lib/api-auth';
import { sendSMS, logSms } from '@/lib/twilio';

const sendSmsSchema = z.object({
  phone: z.string().min(6),
  body: z.string().min(1).max(1600),
  bookingId: z.string().optional(),
  clientId: z.string().optional(),
});

export async function POST(request: NextRequest) {
  const salon = await authenticateSalonByApiKey(request);
  if (!salon) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const parsed = sendSmsSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
  }

  const result = await sendSMS(parsed.data.phone, parsed.data.body);

  await logSms({
    direction: 'OUTBOUND',
    phone: parsed.data.phone,
    body: parsed.data.body,
    status: result.success ? 'sent' : 'failed',
    twilioSid: result.sid,
    bookingId: parsed.data.bookingId,
    clientId: parsed.data.clientId,
    salonId: salon.id,
  });

  if (!result.success) {
    return NextResponse.json({ error: result.error ?? 'Failed to send SMS' }, { status: 502 });
  }

  return NextResponse.json({ success: true, sid: result.sid });
}
