import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { validateTwilioSignature, logSms } from '@/lib/twilio';
import { parseCommand, executeCommand, forwardToSalon } from '@/lib/sms-commands';
import { toE164, auLocalFromE164 } from '@/lib/utils';
import { env } from '@/lib/env';

export async function POST(request: NextRequest) {
  const formData = await request.formData();
  const params: Record<string, string> = {};
  formData.forEach((value, key) => {
    params[key] = String(value);
  });

  const signature = request.headers.get('x-twilio-signature') ?? '';
  const url = `${env.NEXT_PUBLIC_APP_URL}/api/v1/sms/webhook`;

  if (!validateTwilioSignature(url, params, signature)) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 403 });
  }

  const from = params['From'] ?? '';
  const body = params['Body'] ?? '';
  const messageSid = params['MessageSid'] ?? '';

  // Twilio delivers `From` in E.164 ("+61..."), but client phones may be stored
  // in local format ("0434 399 728"). Match against both so inbound texts resolve
  // regardless of how the number was saved.
  const fromE164 = toE164(from);
  const fromCandidates = Array.from(
    new Set(
      [from, fromE164, ...(fromE164 ? auLocalFromE164(fromE164) : [])].filter(
        (v): v is string => !!v
      )
    )
  );

  const client = await prisma.client.findFirst({
    where: { phone: { in: fromCandidates } },
    include: { salon: { select: { id: true } } },
  });

  // Resolve the salon this message belongs to. Known clients carry it directly;
  // for unknown senders fall back to the salon that owns the receiving number.
  // (Single-tenant today: the sole active salon. `To` becomes the lookup key
  // once numbers are stored per-salon.)
  const salonId =
    client?.salonId ??
    (await prisma.salon.findFirst({ where: { isActive: true }, select: { id: true } }))?.id;

  if (!salonId) {
    return twimlResponse('Thanks for your message. Please contact the salon directly.');
  }

  void logSms({
    direction: 'INBOUND',
    phone: from,
    body,
    status: 'received',
    twilioSid: messageSid,
    clientId: client?.id,
    salonId,
  });

  // Unknown sender: no CRM record, so booking commands (CANCEL/BOOK/STOP) can't
  // apply. Forward the raw message to the owner so a real person can respond.
  if (!client) {
    const replyText = await forwardToSalon({
      clientPhone: fromE164 ?? from,
      messageBody: body,
      salonId,
    });
    return twimlResponse(replyText);
  }

  const command = parseCommand(body);
  // Use the resolved client's stored phone so the command handler's own lookup
  // matches, regardless of the format Twilio delivered `From` in.
  const replyText = await executeCommand(client.phone ?? from, command, salonId, body);

  return twimlResponse(replyText);
}

function twimlResponse(message: string): NextResponse {
  const xml = `<?xml version="1.0" encoding="UTF-8"?><Response><Message>${escapeXml(message)}</Message></Response>`;
  return new NextResponse(xml, {
    status: 200,
    headers: { 'Content-Type': 'text/xml' },
  });
}

function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}
