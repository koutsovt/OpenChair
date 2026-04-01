import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { validateTwilioSignature, logSms } from '@/lib/twilio';
import { parseCommand, executeCommand } from '@/lib/sms-commands';
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

  const client = await prisma.client.findFirst({
    where: { phone: from },
    include: { salon: { select: { id: true } } },
  });

  const salonId = client?.salonId;
  if (!salonId) {
    return twimlResponse("We couldn't find your account. Please contact the salon directly.");
  }

  void logSms({
    direction: 'INBOUND',
    phone: from,
    body,
    status: 'received',
    twilioSid: messageSid,
    clientId: client.id,
    salonId,
  });

  const command = parseCommand(body);
  const replyText = await executeCommand(from, command, salonId, body);

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
